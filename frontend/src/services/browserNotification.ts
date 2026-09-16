/**
 * ThermoShield Browser Notification Service (Web Notification API)
 *
 * Delivers browser notifications via the Web Notification API (window.Notification)
 * when ThermoShield is open in the browser.
 *
 * Strict safety rules:
 * 1. Never requests permission on page load, refresh, or login.
 * 2. Only requests permission upon explicit user action (e.g. clicking "Enable Browser Notifications").
 * 3. Gracefully handles unsupported browsers, denied states, and desktop/mobile environments.
 * 4. Transparent delivery: alerts run via the Web Notification API while ThermoShield is active.
 *
 * LIMITATION: These are not background Web Push notifications and do not provide
 * service-worker push delivery after the web application is closed.
 */

export type DeviceNotificationPermission = 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * Checks if the browser supports the native Notification API.
 */
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Returns the current notification permission status.
 */
export const getNotificationPermission = (): DeviceNotificationPermission => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as DeviceNotificationPermission;
};

/**
 * Requests browser notification permission.
 * MUST only be invoked from an explicit user gesture (button click).
 */
export const requestDeviceNotificationPermission = async (): Promise<DeviceNotificationPermission> => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const perm = await Notification.requestPermission();
    return perm as DeviceNotificationPermission;
  } catch (error) {
    console.warn('Notification permission request rejected:', error);
    return getNotificationPermission();
  }
};

export interface DeviceNotificationOptions {
  body?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: any;
  silent?: boolean;
}

/**
 * Dispatches a native browser notification if permission is granted.
 * Returns true if notification was dispatched, false otherwise.
 */
export const sendNativeDeviceNotification = (
  title: string,
  options?: DeviceNotificationOptions
): boolean => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notif = new Notification(title, {
      body: options?.body,
      tag: options?.tag,
      icon: options?.icon || '/vite.svg',
      badge: options?.badge || '/vite.svg',
      silent: options?.silent,
      data: options?.data,
    });

    // Auto-close after 8 seconds to prevent desktop clutter
    setTimeout(() => {
      try {
        notif.close();
      } catch {
        // Ignore if already closed
      }
    }, 8000);

    return true;
  } catch (err) {
    console.warn('Could not dispatch native device notification:', err);
    return false;
  }
};

/**
 * Sends a controlled test notification.
 * Available only when permission is granted.
 * Does not affect alert engine cooldowns, history, or incident records.
 */
export const sendTestDeviceNotification = (): boolean => {
  return sendNativeDeviceNotification('ThermoShield Test', {
    body: 'Device notifications are working correctly. You will receive important heat alerts here.',
    tag: `thermoshield-test-${Date.now()}`,
  });
};
