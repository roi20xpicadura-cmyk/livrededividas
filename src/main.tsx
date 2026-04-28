import { createRoot } from "react-dom/client";
import "./lib/persistAuth";
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

// 1) RENDERIZA PRIMEIRO — nada deve ficar entre o parse do bundle e a primeira
// chamada a render(). Isso garante TTFB→FCP o mais curto possível.
createRoot(document.getElementById("root")!).render(<App />);

// 2) Limpeza de SW/cache legados (UMA vez por device) movida para idle:
// roda quando o navegador estiver ocioso, sem competir com hidratação,
// fontes e fetch inicial de dados.
const runIdle = (cb: () => void) => {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(cb, { timeout: 4000 });
  } else {
    setTimeout(cb, 2000);
  }
};

runIdle(() => {
  try {
    const FLAG = 'kora:legacy-sw-cleanup-v1';
    if (!localStorage.getItem(FLAG)) {
      localStorage.setItem(FLAG, '1');
      void clearRuntimeCaches();
    }
  } catch {
    // Sem storage (modo privado): segue sem limpar.
  }
});
