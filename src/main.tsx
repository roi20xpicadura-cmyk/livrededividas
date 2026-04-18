import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const STALE_ASSET_MARKERS = [
  'failed to fetch dynamically imported module',
  'importing a module script failed',
  'chunkloaderror',
  'loading chunk',
];

function isStaleAssetError(message: string) {
  const normalized = message.toLowerCase();
  return STALE_ASSET_MARKERS.some((marker) => normalized.includes(marker));
}

async function clearRuntimeCaches() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Nunca bloquear bootstrap por causa da limpeza.
  }
}

function hardReloadOnce(reason: string) {
  try {
    const key = 'kora:stale-assets-recovered';
    if (sessionStorage.getItem(key) === reason) return;
    sessionStorage.setItem(key, reason);
    void clearRuntimeCaches().finally(() => window.location.reload());
  } catch {
    window.location.reload();
  }
}

window.addEventListener('error', (event) => {
  const message = event.message || (event.error instanceof Error ? event.error.message : '');
  if (message && isStaleAssetError(message)) {
    hardReloadOnce('window-error');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason || '');
  if (message && isStaleAssetError(message)) {
    hardReloadOnce('unhandledrejection');
  }
});

// Kill-switch do antigo SW: priorizamos confiabilidade e removemos registros legados
// que podem servir HTML/chunks velhos e causar tela branca após deploy.
void clearRuntimeCaches();

createRoot(document.getElementById("root")!).render(<App />);
