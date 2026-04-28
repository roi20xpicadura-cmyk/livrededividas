/**
 * Detecta se o app está rodando dentro do container nativo Capacitor
 * (APK/AAB Android publicado na Play Store), em vez de num navegador web.
 *
 * Usado para esconder fluxos que violam políticas das lojas — em especial
 * a venda de assinaturas via gateway externo (Hotmart), que o Google Play
 * proíbe dentro do app.
 */
export const isNativeApp = (): boolean => {
  if (typeof window === "undefined") return false;
  // Capacitor injeta window.Capacitor.isNativePlatform() dentro do WebView nativo.
  // No navegador comum (mesmo PWA instalado) isso é undefined.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
};

export const getNativePlatform = (): "ios" | "android" | "web" => {
  if (typeof window === "undefined") return "web";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  const platform = cap?.getPlatform?.();
  if (platform === "ios" || platform === "android") return platform;
  return "web";
};