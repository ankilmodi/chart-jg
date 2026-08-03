import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { StockData, WatchlistItem, Notification } from '../utils/types';

// ── Watchlist slice ────────────────────────────────────────────────────────
const watchlistSlice = createSlice({
  name: 'watchlist',
  initialState: {
    items: [] as WatchlistItem[],
    loading: false,
  },
  reducers: {
    setWatchlist: (state, action: PayloadAction<WatchlistItem[]>) => {
      state.items = action.payload;
    },
    addItem: (state, action: PayloadAction<WatchlistItem>) => {
      if (!state.items.find(i => i.symbol === action.payload.symbol)) {
        state.items.push(action.payload);
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i.symbol !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

// ── Notifications slice ────────────────────────────────────────────────────
const notifSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [] as Notification[],
    unread: 0,
  },
  reducers: {
    setNotifications: (state, action: PayloadAction<{ notifications: Notification[]; unread_count: number }>) => {
      state.items  = action.payload.notifications;
      state.unread = action.payload.unread_count;
    },
    markRead: (state, action: PayloadAction<string>) => {
      const n = state.items.find(i => i.id === action.payload);
      if (n) { n.read = true; state.unread = Math.max(0, state.unread - 1); }
    },
    markAllRead: (state) => {
      state.items.forEach(n => { n.read = true; });
      state.unread = 0;
    },
  },
});

// ── UI slice ───────────────────────────────────────────────────────────────
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    themeMode:       (localStorage.getItem('theme') as 'dark' | 'light') || 'dark',
    sidebarOpen:     true,
    refreshInterval: 300,
    selectedStock:   null as StockData | null,
    activeFilters: {
      sector: '',
      minScore: 0,
      signal: '',
      trend: '',
      minRsi: 0,
      maxRsi: 100,
      minAdx: 0,
      onlyBreakout: false,
      onlyLongBuildup: false,
      onlyStrongBuy: false,
      onlyMomentum: false,
      onlyHighVolume: false,
    },
  },
  reducers: {
    toggleTheme: (state) => {
      state.themeMode = state.themeMode === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', state.themeMode);
    },
    setTheme: (state, action: PayloadAction<'dark' | 'light'>) => {
      state.themeMode = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => { state.sidebarOpen = action.payload; },
    setRefreshInterval: (state, action: PayloadAction<number>) => { state.refreshInterval = action.payload; },
    setSelectedStock: (state, action: PayloadAction<StockData | null>) => { state.selectedStock = action.payload; },
    setFilter: (state, action: PayloadAction<Partial<typeof state.activeFilters>>) => {
      state.activeFilters = { ...state.activeFilters, ...action.payload };
    },
    resetFilters: (state) => {
      state.activeFilters = {
        sector: '', minScore: 0, signal: '', trend: '',
        minRsi: 0, maxRsi: 100, minAdx: 0,
        onlyBreakout: false, onlyLongBuildup: false,
        onlyStrongBuy: false, onlyMomentum: false, onlyHighVolume: false,
      };
    },
  },
});

// ── Store ──────────────────────────────────────────────────────────────────
export const store = configureStore({
  reducer: {
    watchlist:     watchlistSlice.reducer,
    notifications: notifSlice.reducer,
    ui:            uiSlice.reducer,
  },
});

export const { setWatchlist, addItem, removeItem, setLoading } = watchlistSlice.actions;
export const { setNotifications, markRead, markAllRead } = notifSlice.actions;
export const {
  toggleTheme, setTheme, toggleSidebar, setSidebarOpen,
  setRefreshInterval, setSelectedStock, setFilter, resetFilters,
} = uiSlice.actions;

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
