/**
 * EURUSD aç/kapat — P&L hesaplarını API + motor formülleriyle doğrular.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_TRADING_SETTINGS,
  requiredMargin,
} from '../src/trading/trading-config.types';
import {
  estimateCommissionFee,
  netPnl,
  unrealizedPnl,
} from '../src/trading/trading-fees';

const API = process.env.API_URL ?? 'http://localhost:3001/api';
const ADMIN_EMAIL = process.env.PANEL_ADMIN_EMAIL ?? 'admin@tradex.local';
const ADMIN_PASSWORD = process.env.PANEL_ADMIN_PASSWORD ?? 'admin123';
const BUSINESS_ID = process.env.BUSINESS_ID ?? 'cmqlhx4870013tpk02xkbllhq';
const USER_ID = process.env.USER_ID ?? 'cmqp5592c0000tp54xswg4uaw'; // mehmet123@gmail.com

async function api(
  path: string,
  opts: { method?: string; body?: object; token?: string } = {},
) {
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${JSON.stringify(data)}`);
  }
  return data;
}

function round(n: number, d = 6) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

async function main() {
  const settings = DEFAULT_TRADING_SETTINGS;
  const qty = 2;
  const prisma = new PrismaClient();

  const tick = (await api('/market/latest?symbols=EURUSD')) as {
    EURUSD: { bid: number; ask: number };
  };
  const { bid, ask } = tick.EURUSD;
  const closeBid = round(bid + 0.005, 5);

  console.log('=== EURUSD fiyat ===');
  console.log({ bid, ask, closeBid, spread: round(ask - bid, 5) });

  const panelLogin = (await api('/panel/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })) as { accessToken: string };
  const token = panelLogin.accessToken;

  let account = await prisma.tradingAccount.findUnique({
    where: { userId_businessId: { userId: USER_ID, businessId: BUSINESS_ID } },
    include: { positions: true },
  });
  if (!account) throw new Error('Trading hesabı yok');

  const existing = account.positions.find((p) => p.symbol === 'EURUSD');
  if (existing) {
    await api(`/panel/transactions/positions/${existing.id}/close`, {
      method: 'POST',
      token,
      body: { bid, ask },
    });
    account = await prisma.tradingAccount.findUnique({
      where: {
        userId_businessId: { userId: USER_ID, businessId: BUSINESS_ID },
      },
      include: { positions: true },
    })!;
    console.log('Mevcut EURUSD pozisyonu kapatıldı.');
  }

  const bal0 = Number(account!.balance);

  const marginOpen = requiredMargin(qty, ask, settings.leverageOptions[0] ?? 1);
  const commOpen = estimateCommissionFee(qty, ask, settings);
  const expectedBalAfterOpen = bal0 - marginOpen - commOpen;

  console.log('\n=== LONG AÇ (beklenen) ===');
  console.log({
    qty,
    entryAsk: ask,
    marginOpen: round(marginOpen),
    commOpen: round(commOpen),
    balanceAfterOpen: round(expectedBalAfterOpen),
  });

  await api('/panel/transactions/open', {
    method: 'POST',
    token,
    body: {
      userId: USER_ID,
      businessId: BUSINESS_ID,
      orderType: 'market',
      symbol: 'EURUSD',
      side: 'buy',
      quantity: qty,
      bid,
      ask,
    },
  });

  const afterOpen = await prisma.tradingAccount.findUnique({
    where: { userId_businessId: { userId: USER_ID, businessId: BUSINESS_ID } },
    include: { positions: true },
  });
  const bal1 = Number(afterOpen!.balance);
  const pos = afterOpen!.positions.find((p) => p.symbol === 'EURUSD')!;
  const avgEntry = Number(pos.avgEntry);
  const posId = pos.id;

  console.log('\n=== LONG AÇ (gerçek) ===');
  console.log({
    balance: bal1,
    avgEntry,
    quantity: Number(pos.quantity),
    balanceDiff: round(bal1 - bal0),
    expectedDiff: round(-(marginOpen + commOpen)),
    openOk: Math.abs(bal1 - expectedBalAfterOpen) < 0.0001,
  });

  const unrealized = unrealizedPnl('long', qty, avgEntry, closeBid, ask);
  console.log('\n=== Açık pozisyon (simüle) ===');
  console.log({ closeBid, unrealizedGross: round(unrealized) });

  const grossRealized = (closeBid - avgEntry) * qty;
  const marginRelease = requiredMargin(qty, avgEntry, pos.leverage ?? 1);
  const commClose = estimateCommissionFee(qty, closeBid, settings);
  const expectedBalAfterClose = bal1 + marginRelease + grossRealized - commClose;
  const expectedNet = netPnl(grossRealized, 0, commOpen + commClose);

  console.log('\n=== LONG KAPAT (beklenen) ===');
  console.log({
    closeBid,
    grossRealized: round(grossRealized),
    marginRelease: round(marginRelease),
    commClose: round(commClose),
    balanceAfterClose: round(expectedBalAfterClose),
    netAfterFees: round(expectedNet),
  });

  await api(`/panel/transactions/positions/${posId}/close`, {
    method: 'POST',
    token,
    body: { bid: closeBid, ask: closeBid + (ask - bid) },
  });

  const afterClose = await prisma.tradingAccount.findUnique({
    where: { userId_businessId: { userId: USER_ID, businessId: BUSINESS_ID } },
    include: {
      trades: { orderBy: { executedAt: 'desc' }, take: 3 },
    },
  });
  const bal2 = Number(afterClose!.balance);
  const closeTrade = afterClose!.trades.find((t) => t.note?.includes('kapat'));
  const actualGross = Number(closeTrade?.realizedPnl ?? 0);

  console.log('\n=== LONG KAPAT (gerçek) ===');
  console.log({
    balance: bal2,
    closePrice: Number(closeTrade?.price),
    actualGrossRealized: actualGross,
    balanceDiffFromOpen: round(bal2 - bal1),
    expectedDiffFromOpen: round(marginRelease + grossRealized - commClose),
    totalChangeFromStart: round(bal2 - bal0),
    grossOk: Math.abs(actualGross - grossRealized) < 0.0001,
    balanceOk: Math.abs(bal2 - expectedBalAfterClose) < 0.0001,
    profitable: actualGross > 0 && bal2 > bal0,
  });

  const allOk =
    Math.abs(bal1 - expectedBalAfterOpen) < 0.0001 &&
    Math.abs(actualGross - grossRealized) < 0.0001 &&
    Math.abs(bal2 - expectedBalAfterClose) < 0.0001 &&
    actualGross > 0;

  console.log('\n=== SONUÇ ===');
  console.log(allOk ? 'Tüm hesaplar DOGRU' : 'Hesaplarda sapma var');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
