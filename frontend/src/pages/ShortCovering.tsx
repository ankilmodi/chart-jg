import React from 'react';
import { ScreenerPage } from '../components/ScreenerPage';
import { fetchShortCovering } from '../services/api';
export default function ShortCoveringPage() {
  return <ScreenerPage title="Short Covering" icon="🔄" subtitle="Price rising + Open Interest falling. Short positions being unwound. Bullish reversal signal." queryKey="short-covering" fetcher={() => fetchShortCovering(30)} />;
}
