import React from 'react';
import { Platform } from 'react-native';
import useBrowserNotifications from '../hooks/useBrowserNotifications';
import NotificationPermissionBanner from './NotificationPermissionBanner';

export default function BrowserNotificationProvider({ children }) {
  // Initialize browser notifications hook
  useBrowserNotifications();

  return (
    <>
      {children}
      {/* Show permission banner only on web */}
      {Platform.OS === 'web' && <NotificationPermissionBanner />}
    </>
  );
}
