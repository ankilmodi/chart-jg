import React from 'react';
import { ScreenerPage } from '../components/ScreenerPage';
import { fetchEmaScreener } from '../services/api';

export default function EmaScreenerPage() {
  return (
    <ScreenerPage
      title="EMA Screener"
      icon="📊"
      subtitle="Stocks in perfect EMA bullish alignment: Price above EMA20 above EMA50 above EMA200."
      queryKey="ema-screener"
      fetcher={(_tradeType, params) => fetchEmaScreener(40, params)}
    />
  );
}
