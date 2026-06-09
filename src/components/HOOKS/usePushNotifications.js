import { useEffect, useState } from 'react';
import {
  isPushSupported,
  shouldShowPushPrompt,
  syncPushSubscriptionIfGranted,
} from '../../utils/pushNotifications';

/**
 * Syncs push subscription when user is logged in and permission already granted.
 * Prompt visibility is handled by PushNotificationPrompt component.
 */
export default function usePushNotifications(enabled = true) {
  const [supported] = useState(() => isPushSupported());

  useEffect(() => {
    if (!enabled || !supported) return undefined;
    if (typeof Notification === 'undefined') return undefined;
    if (Notification.permission !== 'granted') return undefined;

    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await syncPushSubscriptionIfGranted();
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, supported]);

  return {
    supported,
    canPrompt: enabled && supported && shouldShowPushPrompt(),
  };
}
