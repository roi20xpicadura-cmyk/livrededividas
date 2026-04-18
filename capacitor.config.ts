import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.CAPACITOR_DEV === 'true';
const devUrl = process.env.CAPACITOR_DEV_URL;

const config: CapacitorConfig = {
  appId: 'com.korafinance.app',
  appName: 'KoraFinance',
  webDir: 'dist',
  ...(isDev && devUrl
    ? {
        server: {
          url: devUrl,
          cleartext: false,
        },
      }
    : {}),
};

export default config;
