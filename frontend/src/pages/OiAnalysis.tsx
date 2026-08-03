import React from 'react';
import { ScreenerPage } from '../components/ScreenerPage';
import { fetchOiAnalysis } from '../services/api';
export default function OiAnalysisPage() {
  return <ScreenerPage title="OI Analysis" icon="📉" subtitle="Open Interest changes across all F&O stocks. Long buildup, short buildup, short covering and long unwinding." queryKey="oi-analysis" fetcher={() => fetchOiAnalysis(40)} />;
}
