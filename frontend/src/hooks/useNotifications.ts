import { useEffect, useRef, useCallback } from 'react';

export function useNotifications() {
  const permissionRef = useRef<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    permissionRef.current = result;
  }, []);

  const notify = useCallback((title: string, body: string) => {
    if (!('Notification' in window)) return;
    if (permissionRef.current !== 'granted') return;
    if (document.hasFocus()) return;

    new Notification(title, {
      body,
      icon: '/favicon.svg',
      tag: 'painel-msg',
    });
  }, []);

  return { notify, requestPermission };
}
