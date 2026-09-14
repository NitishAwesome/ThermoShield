import React from 'react';
import { Profile } from './Profile';

/**
 * Legacy Route Compatibility Adapter:
 * Seamlessly routes /notification-settings and /notifications into the
 * unified Profile & Safety Preferences hub with the Alert Preferences tab focused.
 */
export const NotificationSettings: React.FC = () => {
  return <Profile initialTab="alerts" />;
};

export default NotificationSettings;
