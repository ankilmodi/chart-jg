import React from 'react';
import { ScreenerPage } from '../components/ScreenerPage';
import { fetchMomentum } from '../services/api';
export default function MomentumPage() {
  return <ScreenerPage title="Momentum Stocks" icon="🚀" subtitle="Strong price momentum confirmed by RSI 55+, ADX 20+ and positive MACD." queryKey="momentum" fetcher={() => fetchMomentum(30)} />;
}
