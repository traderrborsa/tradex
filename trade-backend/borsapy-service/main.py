"""FastAPI sidecar — borsapy BIST veri servisi."""

from __future__ import annotations

import asyncio
import logging
import math
import threading
import time
from contextlib import asynccontextmanager
from typing import Any

import borsapy as bp
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger("borsapy-service")

OHLC_TTL_SEC = 60


class QuoteStream:
    """TradingView WebSocket — arka planda canlı kotasyon önbelleği."""

    WARMUP = (
        "XU100",
        "XU030",
        "THYAO",
        "GARAN",
        "AKBNK",
        "ASELS",
        "EREGL",
        "KCHOL",
        "BIMAS",
    )

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._stream: Any = None
        self._subscribed: set[str] = set()
        self._ready = threading.Event()

    def _ensure_stream(self) -> Any | None:
        with self._lock:
            if self._stream is not None:
                return self._stream
            stream = bp.TradingViewStream()
            stream.connect()
            self._stream = stream
            return stream

    def _run(self) -> None:
        try:
            stream = self._ensure_stream()
            if stream is None:
                return
            for sym in self.WARMUP:
                stream.subscribe(sym)
                with self._lock:
                    self._subscribed.add(sym)
            self._ready.set()
            while self._ready.is_set():
                time.sleep(1)
        except Exception:
            self._ready.set()

    def start(self) -> None:
        if self._ready.is_set() and self._stream is not None:
            return
        thread = threading.Thread(target=self._run, daemon=True, name="bist-stream")
        thread.start()

    def stop(self) -> None:
        self._ready.clear()
        with self._lock:
            stream = self._stream
            self._stream = None
            self._subscribed.clear()
        if stream is not None:
            try:
                stream.disconnect()
            except Exception:
                pass

    def subscribe(self, symbol: str) -> None:
        sym = symbol.upper()
        self.start()
        self._ready.wait(timeout=3)
        with self._lock:
            if sym in self._subscribed:
                return
            stream = self._stream
            if stream is None:
                return
            stream.subscribe(sym)
            self._subscribed.add(sym)

    def subscribe_many(self, symbols: list[str]) -> None:
        for sym in symbols:
            self.subscribe(sym)

    def get_quote(self, symbol: str) -> dict[str, Any] | None:
        sym = symbol.upper()
        self.start()
        self.subscribe(sym)
        stream = self._stream
        if stream is None:
            return None
        try:
            return stream.get_quote(sym)
        except Exception:
            return None


quote_stream = QuoteStream()
_ohlc_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_companies_index: list[dict[str, str]] = []
_push_task: asyncio.Task | None = None


class BistTickHub:
    """TradingView önbelleğinden WebSocket tick push."""

    def __init__(self) -> None:
        self._clients: dict[WebSocket, set[str]] = {}
        self._last_price: dict[str, float] = {}

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._clients[ws] = set()

    def disconnect(self, ws: WebSocket) -> None:
        self._clients.pop(ws, None)

    def subscribe(self, ws: WebSocket, symbols: list[str]) -> None:
        subs = self._clients.setdefault(ws, set())
        for raw in symbols:
            sym = raw.upper().strip()
            if not sym:
                continue
            subs.add(sym)
            quote_stream.subscribe(sym)

    async def push_loop(self) -> None:
        while True:
            for ws, syms in list(self._clients.items()):
                try:
                    for sym in syms:
                        quote = quote_stream.get_quote(sym)
                        if not quote or quote.get("last") is None:
                            continue
                        last = _safe_float(quote.get("last"))
                        if self._last_price.get(sym) == last:
                            continue
                        self._last_price[sym] = last
                        tick = _info_to_tick(sym, _stream_quote_to_info(quote))
                        await ws.send_json({"type": "tick", "data": tick})
                except Exception:
                    self.disconnect(ws)
            await asyncio.sleep(0.25)


tick_hub = BistTickHub()


def _load_companies_index() -> None:
    global _companies_index
    try:
        df = bp.companies()
        _companies_index = [
            {
                "ticker": str(row.get("ticker") or row.name).upper(),
                "name": str(row.get("name", "")),
            }
            for _, row in df.iterrows()
        ]
        logger.info("BIST şirket indeksi: %d kayıt", len(_companies_index))
    except Exception as exc:
        logger.warning("Şirket indeksi yüklenemedi: %s", exc)


def _all_bist_items() -> list[dict[str, str]]:
    items: list[dict[str, str]] = []

    def _stock_item(row: dict[str, str]) -> dict[str, str]:
        ticker = row["ticker"]
        return {
            "name": ticker,
            "description": row.get("name") or ticker,
            "type": "Stock",
            "exchange": "BIST",
            "source": "borsapy",
        }

    def _index_item(ticker: str) -> dict[str, str]:
        return {
            "name": ticker,
            "description": "BIST Endeks",
            "type": "Index",
            "exchange": "BIST",
            "source": "borsapy",
        }

    for ticker in sorted(BIST_INDICES):
        items.append(_index_item(ticker))

    seen: set[str] = {item["name"] for item in items}
    for row in sorted(_companies_index, key=lambda r: r["ticker"]):
        ticker = row["ticker"]
        if ticker in seen:
            continue
        seen.add(ticker)
        items.append(_stock_item(row))

    return items


def _search_local(query: str) -> list[dict[str, str]]:
    q = query.strip().upper()
    if not q:
        return []

    def _stock_item(row: dict[str, str]) -> dict[str, str]:
        ticker = row["ticker"]
        return {
            "name": ticker,
            "description": row.get("name") or ticker,
            "type": "Stock",
            "exchange": "BIST",
            "source": "borsapy",
        }

    def _index_item(ticker: str) -> dict[str, str]:
        return {
            "name": ticker,
            "description": "BIST Endeks",
            "type": "Index",
            "exchange": "BIST",
            "source": "borsapy",
        }

    prefix: list[dict[str, str]] = []
    seen: set[str] = set()

    for row in _companies_index:
        ticker = row["ticker"]
        name = row.get("name", "").upper()
        if ticker in seen:
            continue
        if ticker.startswith(q):
            seen.add(ticker)
            prefix.append(_stock_item(row))

    for ticker in sorted(BIST_INDICES):
        if ticker in seen:
            continue
        if ticker.startswith(q):
            seen.add(ticker)
            prefix.append(_index_item(ticker))

    return prefix


def _paginate_search(items: list[dict[str, str]], page: int, limit: int) -> dict:
    total = len(items)
    start = (page - 1) * limit
    pages = (total + limit - 1) // limit if total else 0
    return {
        "items": items[start : start + limit],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global _push_task
    quote_stream.start()
    threading.Thread(target=_load_companies_index, daemon=True).start()
    _push_task = asyncio.create_task(tick_hub.push_loop())
    yield
    if _push_task:
        _push_task.cancel()
        try:
            await _push_task
        except asyncio.CancelledError:
            pass
    quote_stream.stop()


app = FastAPI(title="Borsapy BIST Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BIST_INDICES = {
    "XU100",
    "XU050",
    "XU030",
    "XUTUM",
    "XKTUM",
    "XBANK",
    "XUSIN",
    "XUHIZ",
    "XGMYO",
    "XUTEK",
    "XELKT",
    "XMANA",
    "XTRZM",
    "XSGRT",
    "XFINK",
    "XHOLD",
    "XSPOR",
    "XYORT",
    "XULAS",
    "XTAST",
    "XINSA",
    "XMADN",
    "XKMYA",
    "XGIDA",
    "XTEKS",
    "XKAGT",
    "XBLSM",
    "XILTM",
    "XUMAL",
}

INTERVAL_PERIOD: dict[str, str] = {
    "1m": "5d",
    "5m": "1mo",
    "15m": "1mo",
    "30m": "3mo",
    "1h": "3mo",
    "4h": "6mo",
    "1d": "1y",
}


def _safe_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (TypeError, ValueError):
        return default


def _is_index(symbol: str) -> bool:
    sym = symbol.upper()
    return sym in BIST_INDICES or sym.startswith("XU")


def _get_quote_object(symbol: str):
    sym = symbol.upper()
    if _is_index(sym):
        return bp.Index(sym)
    return bp.Ticker(sym)


def _read_info(obj) -> dict[str, Any]:
    info = obj.info
    if hasattr(info, "todict"):
        try:
            return info.todict()
        except Exception:
            pass
    if isinstance(info, dict):
        return info
    out: dict[str, Any] = {}
    for key in (
        "symbol",
        "name",
        "description",
        "last",
        "regularMarketPrice",
        "change",
        "change_percent",
        "open",
        "high",
        "low",
        "prev_close",
        "volume",
        "bid",
        "ask",
        "currency",
        "exchange",
    ):
        try:
            value = info.get(key) if hasattr(info, "get") else getattr(info, key, None)
        except Exception:
            value = None
        if value is not None:
            out[key] = value
    return out


def _stream_quote_to_info(quote: dict[str, Any]) -> dict[str, Any]:
    return {
        "symbol": quote.get("symbol"),
        "description": quote.get("description"),
        "last": quote.get("last"),
        "change": quote.get("change"),
        "change_percent": quote.get("change_percent"),
        "open": quote.get("open"),
        "high": quote.get("high"),
        "low": quote.get("low"),
        "prev_close": quote.get("prev_close"),
        "volume": quote.get("volume"),
        "bid": quote.get("bid"),
        "ask": quote.get("ask"),
        "currency": quote.get("currency"),
        "exchange": quote.get("exchange"),
    }


def _fetch_tick(symbol: str) -> dict[str, Any]:
    sym = symbol.upper()
    quote = quote_stream.get_quote(sym)
    if quote and quote.get("last") is not None:
        return _info_to_tick(sym, _stream_quote_to_info(quote))

    obj = _get_quote_object(sym)
    return _info_to_tick(sym, _read_info(obj))


def _info_to_tick(symbol: str, info: dict[str, Any]) -> dict[str, Any]:
    last = _safe_float(info.get("last") or info.get("regularMarketPrice"))
    bid = _safe_float(info.get("bid"), last)
    ask = _safe_float(info.get("ask"), last)
    if bid <= 0:
        bid = last
    if ask <= 0:
        ask = last
    spread = ask - bid if ask >= bid else 0.0
    mid = (bid + ask) / 2 if bid > 0 and ask > 0 else last

    return {
        "symbol": symbol.upper(),
        "description": info.get("description") or info.get("name"),
        "bid": bid,
        "ask": ask,
        "last": last,
        "volume": _safe_float(info.get("volume")),
        "high": _safe_float(info.get("high")),
        "low": _safe_float(info.get("low")),
        "dayDiffPercent": _safe_float(info.get("change_percent")),
        "spread": spread,
        "mid": mid,
        "source": "borsapy",
        "type": "Index" if _is_index(symbol) else "Stock",
        "exchange": "BIST",
        "currency": info.get("currency") or "TRY",
    }


def _history_to_ohlc(
    symbol: str, interval: str, df, limit: int
) -> dict[str, Any]:
    bars: list[dict[str, Any]] = []
    if df is not None and not df.empty:
        tail = df.tail(limit)
        rows = list(tail.iterrows())
        for i, (idx, row) in enumerate(rows):
            ts = idx.isoformat() if hasattr(idx, "isoformat") else str(idx)
            bars.append(
                {
                    "openTime": ts,
                    "open": _safe_float(row.get("Open")),
                    "high": _safe_float(row.get("High")),
                    "low": _safe_float(row.get("Low")),
                    "close": _safe_float(row.get("Close")),
                    "volume": _safe_float(row.get("Volume")),
                    "tickVolume": 0,
                    "isOpen": i == len(rows) - 1,
                }
            )
    return {"symbol": symbol.upper(), "interval": interval, "bars": bars}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "provider": "borsapy",
        "stream": quote_stream._stream is not None,
        "subscribed": len(quote_stream._subscribed),
    }


@app.get("/indices")
def list_indices():
    try:
        indices = bp.indices()
        return {"indices": indices}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/companies")
def list_companies():
    try:
        df = bp.companies()
        companies = []
        for _, row in df.iterrows():
            companies.append(
                {
                    "ticker": row.get("ticker") or row.name,
                    "name": row.get("name", ""),
                    "city": row.get("city", ""),
                }
            )
        return {"count": len(companies), "companies": companies}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.websocket("/ws/ticks")
async def websocket_ticks(ws: WebSocket):
    await tick_hub.connect(ws)
    try:
        while True:
            msg = await ws.receive_json()
            action = msg.get("action")
            if action == "subscribe" and msg.get("symbol"):
                tick_hub.subscribe(ws, [msg["symbol"]])
            elif action == "subscribe_many" and msg.get("symbols"):
                tick_hub.subscribe(ws, msg["symbols"])
    except WebSocketDisconnect:
        pass
    finally:
        tick_hub.disconnect(ws)


@app.get("/browse")
def browse_symbols(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    return _paginate_search(_all_bist_items(), page, limit)


@app.get("/search")
def search_symbols(
    q: str = Query("", min_length=1),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = q.strip()
    if not query:
        return {"items": [], "total": 0, "page": page, "limit": limit, "pages": 0}

    return _paginate_search(_search_local(query), page, limit)


@app.get("/quote/{symbol}")
def get_quote(symbol: str):
    sym = symbol.upper()
    try:
        return _fetch_tick(sym)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/latest")
def get_latest(symbols: str = Query("")):
    if not symbols.strip():
        return {}
    syms = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    quote_stream.subscribe_many(syms)

    out: dict[str, Any] = {}
    for sym in syms:
        try:
            out[sym] = _fetch_tick(sym)
        except Exception:
            continue
    return out


@app.get("/ohlc/{symbol}")
def get_ohlc(
    symbol: str,
    interval: str = Query("1h"),
    limit: int = Query(300, ge=1, le=2000),
):
    sym = symbol.upper()
    cache_key = f"{sym}:{interval}:{limit}"
    now = time.time()
    cached = _ohlc_cache.get(cache_key)
    if cached and now - cached[0] < OHLC_TTL_SEC:
        return cached[1]

    period = INTERVAL_PERIOD.get(interval, "3mo")
    try:
        obj = _get_quote_object(sym)
        df = obj.history(period=period, interval=interval)
        result = _history_to_ohlc(sym, interval, df, limit)
        _ohlc_cache[cache_key] = (now, result)
        return result
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
