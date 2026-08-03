import React from 'react';
import { ScreenerPage } from '../components/ScreenerPage';
import { fetchBreakout } from '../services/api';
export default function BreakoutPage() {
  return <ScreenerPage title="Breakout Stocks" icon="⚡" subtitle="Stocks breaking out of 20/50/100/200 day highs and 52-week highs with high volume." queryKey="breakout" fetcher={() => fetchBreakout(30)} />;
}
