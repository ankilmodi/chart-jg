import React from 'react';
import { ScreenerPage } from '../components/ScreenerPage';
import { fetchTopBuy } from '../services/api';

export default function TopBuyPage() {
  return (
    <ScreenerPage
      title="Intraday Trading (Best Buy & Best Sell)"
      icon="⚡"
      subtitle="Institutional Grade Intraday Screening for Indian F&O Future Shares based on Order Book Imbalance, Volume Spikes, VWAP, and 200-Point Rating."
      queryKey="top-buy"
      fetcher={(tradeType) => fetchTopBuy(35, tradeType)}
    />
  );
}
