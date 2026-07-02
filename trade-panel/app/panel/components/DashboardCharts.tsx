'use client';

import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardOverview } from '@/lib/panel/dashboard';
import { formatTry } from '@/lib/panel/wallet';
import { OnlineMembersPanel } from './OnlineMembersPanel';
import { CARD } from './ui';

const CHART_COLORS = [
  '#18181b',
  '#2563eb',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#be185d',
];

function formatShortDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function formatCompactTry(value: number) {
  if (value >= 1_000_000) return `₺${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₺${(value / 1_000).toFixed(0)}K`;
  return formatTry(value);
}

interface Props {
  data: DashboardOverview;
}

export function DashboardCharts({ data }: Props) {
  const { totals, businesses, memberTrend, onlineMembers } = data;

  const memberBarData = businesses.map((b) => ({
    name: b.displayName,
    müşteri: b.memberCount,
  }));

  const balanceBarData = businesses.map((b) => ({
    name: b.displayName,
    bakiye: b.totalBalance,
    teminat: b.totalMarginUsed,
  }));

  const pieData = businesses
    .filter((b) => b.totalBalance > 0)
    .map((b) => ({
      name: b.displayName,
      value: b.totalBalance,
    }));

  const businessNames = businesses.map((b) => b.displayName);
  const trendChartData = memberTrend.map((day) => {
    const row: Record<string, string | number> = {
      date: formatShortDate(day.date),
      toplam: day.total,
    };
    for (const b of day.businesses) {
      row[b.businessName] = b.count;
    }
    return row;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="İşletme" value={String(totals.businessCount)} hint={`${totals.activeBusinessCount} aktif`} />
        <KpiCard label="Müşteri" value={String(totals.memberCount)} hint="Benzersiz müşteri" />
        <KpiCard label="Toplam bakiye" value={formatTry(totals.totalBalance)} mono />
        <KpiCard label="Toplam teminat" value={formatTry(totals.totalMarginUsed)} mono amber />
        <KpiCard label="Serbest bakiye" value={formatTry(totals.totalFreeBalance)} mono emerald />
        <KpiCard label="Açık pozisyon" value={String(totals.openPositions)} />
        <KpiCard
          label="Bekleyen yatırma"
          value={String(totals.pendingDeposits)}
          href="/panel/finance?type=deposit&status=pending"
        />
        <KpiCard
          label="Bekleyen çekim"
          value={String(totals.pendingWithdrawals)}
          href="/panel/finance?type=withdraw&status=pending"
        />
      </div>

      <OnlineMembersPanel onlineMembers={onlineMembers} businesses={businesses} />

      {businesses.length === 0 ? (
        <div className={`${CARD} p-8 text-center text-sm text-zinc-500`}>
          Görüntülenecek işletme yok
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Müşteri sayısı (işletme bazlı)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={memberBarData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [value, 'Müşteri']}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="müşteri" fill="#18181b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Bakiye ve teminat (işletme bazlı)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={balanceBarData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatCompactTry} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name) => [
                      formatTry(Number(value)),
                      name === 'bakiye' ? 'Bakiye' : 'Teminat',
                    ]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend />
                  <Bar dataKey="bakiye" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="teminat" fill="#d97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <ChartCard title="Son 30 gün — yeni müşteri kayıtları" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="toplam"
                    name="Toplam"
                    stroke="#18181b"
                    strokeWidth={2}
                    dot={false}
                  />
                  {businessNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      name={name}
                      stroke={CHART_COLORS[(i + 1) % CHART_COLORS.length]}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Bakiye dağılımı">
              {pieData.length === 0 ? (
                <p className="flex h-[280px] items-center justify-center text-sm text-zinc-500">
                  Bakiye verisi yok
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatTry(Number(value))}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className={`${CARD} overflow-hidden`}>
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2 className="text-sm font-semibold">İşletme özeti</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                  <tr>
                    <th className="px-4 py-3 font-medium">İşletme</th>
                    <th className="px-4 py-3 font-medium">Müşteri</th>
                    <th className="px-4 py-3 font-medium">Bakiye</th>
                    <th className="px-4 py-3 font-medium">Teminat</th>
                    <th className="px-4 py-3 font-medium">Pozisyon</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {businesses.map((b) => (
                    <tr
                      key={b.businessId}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{b.displayName}</p>
                        <p className="text-xs text-zinc-500">
                          {b.isActive ? 'Aktif' : 'Pasif'}
                        </p>
                      </td>
                      <td className="px-4 py-3">{b.memberCount}</td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {formatTry(b.totalBalance)}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {formatTry(b.totalMarginUsed)}
                      </td>
                      <td className="px-4 py-3">{b.openPositions}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/panel/businesses/${b.businessId}`}
                          className="text-sm font-medium hover:underline"
                        >
                          Detay
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  mono,
  amber,
  emerald,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  amber?: boolean;
  emerald?: boolean;
  href?: string;
}) {
  const valueClass = mono
    ? `mt-1 font-mono text-lg font-semibold ${
        amber
          ? 'text-amber-700 dark:text-amber-400'
          : emerald
            ? 'text-emerald-700 dark:text-emerald-400'
            : ''
      }`
    : 'mt-1 text-2xl font-semibold';

  const content = (
    <>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={valueClass}>{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${CARD} block p-4 transition hover:border-zinc-400 dark:hover:border-zinc-600`}
      >
        {content}
      </Link>
    );
  }

  return <div className={`${CARD} p-4`}>{content}</div>;
}

function ChartCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`${CARD} p-4 ${className}`}>
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}
