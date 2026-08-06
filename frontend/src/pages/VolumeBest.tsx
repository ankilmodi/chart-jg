import React from 'react';
import { ScreenerPage } from '../components/ScreenerPage';
import { fetchVolumeBest } from '../services/api';

export default function VolumeBestPage() {
  return (
    <ScreenerPage
      title="Volume Best Stocks"
      icon="📊"
      subtitle="NSE Stocks experiencing heavy institutional volume expansion and volume surge."
      queryKey="volume-best"
      fetcher={(_tradeType, params) => fetchVolumeBest(35, params)}
    />
  );
}
