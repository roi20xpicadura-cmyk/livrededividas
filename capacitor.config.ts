import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.CAPACITOR_DEV === 'true';
const devUrl = process.env.CAPACITOR_DEV_URL;

const config: CapacitorConfig = {
  appId: 'com.korafinance.app',
  appName: 'KoraFinance',
  webDir: 'dist',
  // In production the app is served from the bundled `webDir`; we only point
  // the Capacitor shell at a remote URL when explicitly running dev with
  // CAPACITOR_DEV=true (e.g. Lovable live-reload).
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
