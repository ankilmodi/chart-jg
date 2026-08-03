import React from 'react';
import { ScreenerPage } from '../components/ScreenerPage';
import { fetchLongBuildup } from '../services/api';
export default function LongBuildupPage() {
  return <ScreenerPage title="Long Build-up" icon="📈" subtitle="Price rising + Open Interest rising. Fresh longs being added. Strong bullish signal." queryKey="long-buildup" fetcher={() => fetchLongBuildup(30)} />;
}
