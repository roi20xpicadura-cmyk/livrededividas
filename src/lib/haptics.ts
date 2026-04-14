export const haptic = {
  light: () => { if ('vibrate' in navigator) navigator.vibrate(10); },
  medium: () => { if ('vibrate' in navigator) navigator.vibrate(20); },
  success: () => { if ('vibrate' in navigator) navigator.vibrate([10, 50, 10]); },
  error: () => { if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]); },
  notification: () => { if ('vibrate' in navigator) navigator.vibrate([10, 20, 10, 20, 10]); },
};
