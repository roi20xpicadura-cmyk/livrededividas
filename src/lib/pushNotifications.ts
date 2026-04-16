import { supabase } from '@/integrations/supabase/client';

export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
    } as PushSubscriptionOptionsInit).catch(() => null);

    if (subscription) {
      // Store push token in user_config
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_config').update({
          notification_push_token: JSON.stringify(subscription),
        }).eq('user_id', user.id);
      }
    }
  } catch {
    // Push subscription not available, use local notifications
  }

  return true;
}

export function sendLocalNotification(title: string, body: string, url = '/app') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'kora-local',
  });

  notification.onclick = () => {
    window.focus();
    window.location.href = url;
  };
}

export function scheduleLocalReminder(title: string, body: string, delayMs: number) {
  if (Notification.permission !== 'granted') return;
  setTimeout(() => sendLocalNotification(title, body), delayMs);
}

export function checkNotificationSupport(): { push: boolean; local: boolean } {
  return {
    push: 'PushManager' in window && 'serviceWorker' in navigator,
    local: 'Notification' in window,
  };
}
