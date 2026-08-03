import React from 'react';
import { ScreenerPage } from '../components/ScreenerPage';
import { fetchSwingBuy } from '../services/api';

export default function SwingBuyPage() {
  return (
    <ScreenerPage
      title="Swing Trading (2–5 Day Hold)"
      icon="📈"
      subtitle="Swing trading picks for Future Shares: EMA alignment, MACD momentum crossovers, RSI confirmation, and target/stop-loss setup."
      queryKey="swing-buy"
      fetcher={(tradeType) => fetchSwingBuy(35, tradeType)}
    />
  );
}
