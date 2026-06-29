import { SymbolChartView } from '@/components/SymbolChartView';

interface Props {
  params: Promise<{ symbol: string }>;
}

export default async function SymbolPage({ params }: Props) {
  const { symbol } = await params;
  return <SymbolChartView symbol={symbol} />;
}
