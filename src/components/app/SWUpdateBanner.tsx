import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';

export default function SWUpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<ServiceWorker>).detail;
      if (detail) {
        setWaitingWorker(detail);
        setShow(true);
      }
    };

    window.addEventListener('sw-update-available', onUpdate as EventListener);

    // Reload once the new SW takes control
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      window.removeEventListener('sw-update-available', onUpdate as EventListener);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const handleReload = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            position: 'fixed',
            bottom: 'max(20px, env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            background: '#7C3AED',
            color: '#FFFFFF',
            borderRadius: 14,
            boxShadow: '0 10px 30px -10px rgba(124, 58, 237, 0.6)',
            fontSize: 14,
            fontWeight: 600,
            maxWidth: 'calc(100vw - 32px)',
          }}
        >
          <RefreshCw style={{ width: 16, height: 16 }} />
          <span>Nova versão disponível</span>
          <button
            onClick={handleReload}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: '#FFFFFF',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Recarregar
          </button>
          <button
            onClick={() => setShow(false)}
            aria-label="Dispensar"
            style={{
              background: 'transparent',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              opacity: 0.8,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
