import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ankilmodi.niftyanalyzer',
  appName: 'Nifty FO Analyzer',
  webDir: 'dist',
  server: {
    // Point to live backend API for Android app
    url: 'https://frontend-beta-lime-86.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
