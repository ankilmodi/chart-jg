import React from 'react';
import { ScreenerPage } from '../components/ScreenerPage';
import { fetchVolumeShockers } from '../services/api';
export default function VolumeShockersPage() {
  return <ScreenerPage title="Volume Shockers" icon="🔊" subtitle="Stocks trading at 2x or more their 20-day average volume – institutional activity detected." queryKey="volume-shockers" fetcher={() => fetchVolumeShockers(30)} />;
}
