import React from 'react';
import { ScreenerPage } from '../components/ScreenerPage';
import { fetchWeeklyBuy } from '../services/api';

export default function WeeklyBuyPage() {
  return (
    <ScreenerPage
      title="Weekly Stock (1–2 Week Hold)"
      icon="📅"
      subtitle="Weekly F&O picks based on multi-timeframe trend alignment, SuperTrend signals, ADX trend strength (>20), and 200-point institutional rating."
      queryKey="weekly-buy"
      fetcher={(tradeType) => fetchWeeklyBuy(35, tradeType)}
    />
  );
}
