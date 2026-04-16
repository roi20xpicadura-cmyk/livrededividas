import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const DISMISS_KEY_PREFIX = 'push_optin_dismissed_';

export default function PushNotificationOptIn() {
  const { user } = useAuth();
  const { supported, permission, subscribed, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(`${DISMISS_KEY_PREFIX}${user.id}`);
    setDismissed(stored === 'true');
  }, [user]);

  const handleDismiss = () => {
    if (user) localStorage.setItem(`${DISMISS_KEY_PREFIX}${user.id}`, 'true');
    setDismissed(true);
  };

  const handleEnable = async () => {
    const sub = await subscribe();
    if (sub) handleDismiss();
  };

  const shouldShow =
    !!user && supported && !subscribed && permission !== 'denied' && !dismissed;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-weak)',
            borderRadius: 16,
            padding: 16,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(124,58,237,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bell size={20} color="#7C3AED" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: 'var(--color-text-strong)',
                marginBottom: 2,
              }}
            >
              Ative as notificações
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-text-muted)',
                marginBottom: 12,
                lineHeight: 1.4,
              }}
            >
              Receba alertas de orçamento, contas vencendo e insights da Kora IA.
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleEnable}
                disabled={loading}
                style={{
                  flex: 1,
                  height: 38,
                  background: '#7C3AED',
                  border: 'none',
                  borderRadius: 10,
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Ativando…' : 'Ativar notificações'}
              </button>
              <button
                onClick={handleDismiss}
                aria-label="Dispensar"
                style={{
                  width: 38,
                  height: 38,
                  background: 'var(--color-bg-sunken)',
                  border: 'none',
                  borderRadius: 10,
                  color: 'var(--color-text-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
