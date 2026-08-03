import React from 'react';
import { ScreenerPage } from '../components/ScreenerPage';
import { fetchTopBuyers } from '../services/api';

export default function TopBuyersPage() {
  return (
    <ScreenerPage
      title="Top Buyers (Top Gainers & High Buy Pressure)"
      icon="🚀"
      subtitle="NSE Stocks with highest positive change %, aggressive buying pressure, and institutional order flow."
      queryKey="top-buyers"
      fetcher={() => fetchTopBuyers(35)}
    />
  );
}
