import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setSyncing(true);
        // Trigger background sync
        navigator.serviceWorker?.ready.then(reg => {
          (reg as any).sync?.register('sync-transactions').catch(() => {});
        });
        setTimeout(() => { setSyncing(false); setWasOffline(false); }, 3000);
      }
    };
    const goOffline = () => { setIsOnline(false); setWasOffline(true); };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Listen for sync complete from SW
    navigator.serviceWorker?.addEventListener('message', e => {
      if (e.data?.type === 'SYNC_COMPLETE') {
        setSyncing(false);
        setWasOffline(false);
      }
    });

    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, [wasOffline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="flex items-center justify-center gap-2"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: 'var(--color-danger-solid, #ef4444)', color: 'white',
            padding: '10px 16px', fontSize: 13, fontWeight: 600,
          }}
        >
          <WifiOff style={{ width: 14, height: 14 }} />
          Você está offline. Dados salvos localmente serão sincronizados ao reconectar.
        </motion.div>
      )}
      {syncing && isOnline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="flex items-center justify-center gap-2"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: 'var(--color-green-600, #16a34a)', color: 'white',
            padding: '10px 16px', fontSize: 13, fontWeight: 600,
          }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} className="animate-spin" />
          Reconectado! Sincronizando seus dados...
        </motion.div>
      )}
    </AnimatePresence>
  );
}
