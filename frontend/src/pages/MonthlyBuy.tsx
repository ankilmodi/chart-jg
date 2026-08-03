import React from 'react';
import { ScreenerPage } from '../components/ScreenerPage';
import { fetchMonthlyBuy } from '../services/api';

export default function MonthlyBuyPage() {
  return (
    <ScreenerPage
      title="Monthly Stock (1–4 Week Hold)"
      icon="🗓️"
      subtitle="Monthly F&O stock picks based on long-term EMA alignment (above EMA 20, 50, and 200), fundamental strength, derivatives open interest, and institutional rating."
      queryKey="monthly-buy"
      fetcher={(tradeType) => fetchMonthlyBuy(35, tradeType)}
    />
  );
}
