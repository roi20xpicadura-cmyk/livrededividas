import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// PWA Service Worker registration — only in production, never in iframe/preview
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  // Never register SW in preview/iframe — causes stale content
  navigator.serviceWorker?.getRegistrations().then(regs =>
    regs.forEach(r => r.unregister())
  );
} else if ('serviceWorker' in navigator) {
  // Production: register SW for static asset caching (instant repeat visits)
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      const notify = (sw: ServiceWorker) => {
        window.dispatchEvent(new CustomEvent('sw-update-available', { detail: sw }));
      };
      // SW already waiting on load
      if (reg.waiting && navigator.serviceWorker.controller) notify(reg.waiting);
      // New SW found during this session
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            notify(installing);
          }
        });
      });
    }).catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
