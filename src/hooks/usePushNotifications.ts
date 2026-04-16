import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => setSubscribed(false));
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported || !user) return null;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return null;

      // Fetch public key from edge function
      const { data, error } = await supabase.functions.invoke('push-public-key');
      if (error || !data?.publicKey) {
        console.error('Failed to fetch VAPID public key', error);
        return null;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        });
      }

      const subJson = sub.toJSON();
      await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: user.id,
            subscription: JSON.stringify(subJson),
            endpoint: subJson.endpoint ?? sub.endpoint,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,endpoint' },
        );

      setSubscribed(true);
      return sub;
    } catch (e) {
      console.error('Push subscribe failed', e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [supported, user]);

  const unsubscribe = useCallback(async () => {
    if (!supported || !user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', endpoint);
      }
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [supported, user]);

  return { supported, permission, subscribed, loading, subscribe, unsubscribe };
}
