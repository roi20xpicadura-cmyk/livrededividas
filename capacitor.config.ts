import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.korafinance.app',
  appName: 'Kora finance',
  webDir: 'dist',
  // ⚠️ Bloco "server" desativado para BUILD DE RELEASE (Play Store).
  // O APK precisa carregar o bundle local empacotado em "dist".
  //
  // Para voltar ao modo dev com hot-reload do sandbox da Lovable, descomente:
  // server: {
  //   url: 'https://d7fad08f-59a9-4c6e-921e-067204b70b16.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
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