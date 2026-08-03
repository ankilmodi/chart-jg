import React from 'react';
import { ScreenerPage } from '../components/ScreenerPage';
import { fetchTopSellers } from '../services/api';

export default function TopSellersPage() {
  return (
    <ScreenerPage
      title="Top Sellers (Top Losers & High Sell Pressure)"
      icon="📉"
      subtitle="NSE Stocks with highest negative change %, aggressive selling pressure, and short buildup activity."
      queryKey="top-sellers"
      fetcher={() => fetchTopSellers(35)}
    />
  );
}
