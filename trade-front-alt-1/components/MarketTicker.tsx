'use client';

const TICKER_ITEMS = [
  { symbol: 'EUR/USD', price: '1.0842', change: '+0.28%', up: true },
  { symbol: 'GBP/USD', price: '1.2718', change: '-0.14%', up: false },
  { symbol: 'XAU/USD', price: '2,348.50', change: '+0.62%', up: true },
  { symbol: 'BTC/USD', price: '97,420', change: '-1.12%', up: false },
  { symbol: 'XU100', price: '10,842', change: '+0.87%', up: true },
  { symbol: 'USD/TRY', price: '36.24', change: '+0.05%', up: true },
  { symbol: 'NVDA', price: '892.40', change: '+3.02%', up: true },
  { symbol: 'THYAO', price: '328.40', change: '+2.41%', up: true },
];

export function MarketTicker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div
      className="overflow-hidden border-b border-accent/20 bg-card/95 py-2.5 backdrop-blur-sm"
      aria-label="Canlı piyasa özeti"
    >
      <div className="ticker-scroll flex w-max gap-10 whitespace-nowrap px-4">
        {items.map((item, i) => (
          <span key={`${item.symbol}-${i}`} className="inline-flex items-center gap-2.5 text-xs">
            <span className="font-bold tracking-wide text-foreground">{item.symbol}</span>
            <span className="font-mono tabular-nums text-secondary">{item.price}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                item.up ? 'bg-accent/15 text-accent' : 'bg-elevated text-muted'
              }`}
            >
              {item.change}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
