import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.korafinance.app',
  appName: 'Kora finance',
  webDir: 'dist',
  // Hot-reload do sandbox da Lovable durante desenvolvimento.
  // ⚠️ COMENTE o bloco "server" antes de gerar o build de RELEASE para a Play Store
  //    (senão o APK aponta pro sandbox em vez de carregar o bundle local).
  server: {
    url: 'https://d7fad08f-59a9-4c6e-921e-067204b70b16.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#050816',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#7C3AED',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#050816',
      overlaysWebView: false,
    },
  },
};

export default config;