import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { toggleTheme } from './store';
import { createAppTheme } from './theme/theme';
import { Layout } from './components/Layout';

// Lazy load pages
const DashboardPage      = lazy(() => import('./pages/Dashboard'));
const FutureStocksPage   = lazy(() => import('./pages/FutureStocks'));
const AllStocksPage      = lazy(() => import('./pages/AllStocks'));
const HeatMapPage        = lazy(() => import('./pages/HeatMap'));
const TopBuyPage         = lazy(() => import('./pages/TopBuy'));
const TopBuyersPage      = lazy(() => import('./pages/TopBuyers'));
const TopSellersPage     = lazy(() => import('./pages/TopSellers'));
const VolumeBestPage     = lazy(() => import('./pages/VolumeBest'));
const SwingBuyPage       = lazy(() => import('./pages/SwingBuy'));
const WeeklyBuyPage      = lazy(() => import('./pages/WeeklyBuy'));
const MonthlyBuyPage     = lazy(() => import('./pages/MonthlyBuy'));
const BreakoutPage       = lazy(() => import('./pages/Breakout'));
const MomentumPage       = lazy(() => import('./pages/Momentum'));
const EmaScreenerPage    = lazy(() => import('./pages/EmaScreener'));
const VolumeShockersPage = lazy(() => import('./pages/VolumeShockers'));
const LongBuildupPage    = lazy(() => import('./pages/LongBuildup'));
const ShortCoveringPage  = lazy(() => import('./pages/ShortCovering'));
const OiAnalysisPage     = lazy(() => import('./pages/OiAnalysis'));
const FormulaPage        = lazy(() => import('./pages/Formula'));
const WatchlistPage      = lazy(() => import('./pages/Watchlist'));
const PortfolioPage      = lazy(() => import('./pages/Portfolio'));
const SettingsPage       = lazy(() => import('./pages/Settings'));
const ScannerPage        = lazy(() => import('./pages/Scanner'));
const StockDetailPage    = lazy(() => import('./pages/StockDetail'));
// Additional pages from stock-gemini
const SignalPage         = lazy(() => import('./pages/Signal'));
const HistoryPage        = lazy(() => import('./pages/History'));
const IndicatorsPage     = lazy(() => import('./pages/Indicators'));
const BacktestPage       = lazy(() => import('./pages/Backtest'));
const UniversePage       = lazy(() => import('./pages/Universe'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 60_000,
    },
  },
});

const Spinner = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <CircularProgress />
  </Box>
);

// Inner component so it can use store hooks
const AppInner: React.FC = () => {
  const dispatch   = useAppDispatch();
  const themeMode  = useAppSelector(s => s.ui.themeMode);
  const theme      = React.useMemo(() => createAppTheme(themeMode), [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Layout themeMode={themeMode} onToggleTheme={() => dispatch(toggleTheme())}>
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/"                element={<DashboardPage />} />
              <Route path="/future-stocks"   element={<FutureStocksPage />} />
              <Route path="/all-stocks"      element={<AllStocksPage />} />
              <Route path="/top-buyers"      element={<TopBuyersPage />} />
              <Route path="/top-sellers"     element={<TopSellersPage />} />
              <Route path="/volume-best"     element={<VolumeBestPage />} />
              <Route path="/heatmap"         element={<HeatMapPage />} />
              <Route path="/top-buy"         element={<TopBuyPage />} />
              <Route path="/swing-buy"       element={<SwingBuyPage />} />
              <Route path="/weekly-buy"      element={<WeeklyBuyPage />} />
              <Route path="/monthly-buy"     element={<MonthlyBuyPage />} />
              <Route path="/breakout"        element={<BreakoutPage />} />
              <Route path="/momentum"        element={<MomentumPage />} />
              <Route path="/ema-screener"    element={<EmaScreenerPage />} />
              <Route path="/volume-shockers" element={<VolumeShockersPage />} />
              <Route path="/long-buildup"    element={<LongBuildupPage />} />
              <Route path="/short-covering"  element={<ShortCoveringPage />} />
              <Route path="/oi-analysis"     element={<OiAnalysisPage />} />
              <Route path="/formula"         element={<FormulaPage />} />
              <Route path="/watchlist"       element={<WatchlistPage />} />
              <Route path="/portfolio"       element={<PortfolioPage />} />
              <Route path="/scanner"         element={<ScannerPage />} />
              <Route path="/stock/:symbol"   element={<StockDetailPage />} />
              <Route path="/settings"        element={<SettingsPage />} />
              {/* Additional pages from stock-gemini */}
              <Route path="/signal"          element={<SignalPage />} />
              <Route path="/history"         element={<HistoryPage />} />
              <Route path="/indicators"      element={<IndicatorsPage />} />
              <Route path="/backtest"        element={<BacktestPage />} />
              <Route path="/universe"        element={<UniversePage />} />
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
};

const App: React.FC = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  </Provider>
);

export default App;
