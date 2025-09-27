import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import ToastNotification from './ToastNotification';
import notificationService from '../services/notificationService';

export default function NotificationManager() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handleShow = (notification) => {
      setNotifications(prev => [...prev, { ...notification, visible: true }]);
    };

    const handleHide = (id) => {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, visible: false } : n)
      );
      
      // Remove from array after animation
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 300);
    };

    const handleClear = () => {
      setNotifications(prev => prev.map(n => ({ ...n, visible: false })));
      setTimeout(() => {
        setNotifications([]);
      }, 300);
    };

    notificationService.on('notification:show', handleShow);
    notificationService.on('notification:hide', handleHide);
    notificationService.on('notification:clear', handleClear);

    return () => {
      notificationService.off('notification:show', handleShow);
      notificationService.off('notification:hide', handleHide);
      notificationService.off('notification:clear', handleClear);
    };
  }, []);

  const handleNotificationClose = (id) => {
    notificationService.hideNotification(id);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {notifications.map((notification, index) => (
        <View 
          key={notification.id}
          style={[styles.notificationWrapper, { top: 50 + (index * 80) }]}
        >
          <ToastNotification
            visible={notification.visible}
            title={notification.title}
            message={notification.message}
            type={notification.type}
            avatar={notification.avatar}
            duration={notification.duration}
            onClose={() => handleNotificationClose(notification.id)}
            onPress={() => {
              if (notification.onPress) {
                notification.onPress();
              }
              handleNotificationClose(notification.id);
            }}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
  },
  notificationWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});
