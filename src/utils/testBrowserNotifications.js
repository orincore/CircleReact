import browserNotificationService from '../services/browserNotificationService';

// Test browser notifications functionality
export const testBrowserNotifications = async () => {
  console.log('🧪 Testing browser notifications...');
  
  // Check initial status
  const status = browserNotificationService.getStatus();
  console.log('📊 Initial status:', status);
  
  if (!status.supported) {
    console.error('❌ Browser notifications not supported');
    return false;
  }
  
  // Request permission if needed
  if (status.permission !== 'granted') {
    console.log('🔔 Requesting permission...');
    const granted = await browserNotificationService.requestPermission();
    if (!granted) {
      console.error('❌ Permission denied');
      return false;
    }
  }
  
  // Test different notification types
  console.log('🧪 Testing friend request notification...');
  browserNotificationService.forceShowNotification({
    title: '👥 Test Friend Request',
    body: 'John Doe wants to be your friend',
    tag: 'test-friend-request',
    data: { type: 'test' }
  });
  
  setTimeout(() => {
    console.log('🧪 Testing message notification...');
    browserNotificationService.forceShowNotification({
      title: '💬 Test Message',
      body: 'Hey there! This is a test message.',
      tag: 'test-message',
      data: { type: 'test' }
    });
  }, 2000);
  
  setTimeout(() => {
    console.log('🧪 Testing match notification...');
    browserNotificationService.forceShowNotification({
      title: '💕 Test Match!',
      body: 'You matched with Sarah Johnson',
      tag: 'test-match',
      data: { type: 'test' }
    });
  }, 4000);
  
  setTimeout(() => {
    console.log('🧪 Testing profile visit notification...');
    browserNotificationService.showProfileVisitNotification({
      visitorName: 'Alex Thompson',
      visitorId: 'test-visitor-123'
    });
  }, 6000);
  
  console.log('✅ Test notifications sent!');
  return true;
};

// Test with page visibility
export const testNotificationVisibility = () => {
  console.log('🧪 Testing notification visibility logic...');
  
  const status = browserNotificationService.getStatus();
  console.log('📊 Service status:', status);
  
  const canShow = browserNotificationService.canShowNotifications();
  const canForce = browserNotificationService.canForceShow();
  
  console.log('🔍 Visibility check:', {
    canShow,
    canForce,
    pageHidden: document.visibilityState === 'hidden',
    visibilityState: document.visibilityState
  });
  
  return { canShow, canForce };
};

// Test profile visit notifications specifically
export const testProfileVisitNotification = async () => {
  console.log('🧪 Testing profile visit notifications...');
  
  const status = browserNotificationService.getStatus();
  if (!status.supported) {
    console.error('❌ Browser notifications not supported');
    return false;
  }
  
  // Request permission if needed
  if (status.permission !== 'granted') {
    console.log('🔔 Requesting permission for profile visit test...');
    const granted = await browserNotificationService.requestPermission();
    if (!granted) {
      console.error('❌ Permission denied for profile visit test');
      return false;
    }
  }
  
  // Test different profile visit scenarios
  console.log('🧪 Testing normal profile visit notification...');
  browserNotificationService.showProfileVisitNotification({
    visitorName: 'John Doe',
    visitorId: 'user-123'
  });
  
  setTimeout(() => {
    console.log('🧪 Testing profile visit with long name...');
    browserNotificationService.showProfileVisitNotification({
      visitorName: 'Alexander Christopher Thompson-Williams',
      visitorId: 'user-456'
    });
  }, 2000);
  
  setTimeout(() => {
    console.log('🧪 Testing profile visit with special characters...');
    browserNotificationService.showProfileVisitNotification({
      visitorName: 'María José García-López',
      visitorId: 'user-789'
    });
  }, 4000);
  
  // Test error handling
  setTimeout(() => {
    console.log('🧪 Testing profile visit with invalid data...');
    browserNotificationService.showProfileVisitNotification({
      visitorName: '',
      visitorId: null
    });
  }, 6000);
  
  console.log('✅ Profile visit notification tests started!');
  return true;
};

// Debug the entire notification system
export const debugNotificationSystem = () => {
  console.log('🔧 === NOTIFICATION SYSTEM DEBUG ===');
  
  // 1. Check browser support
  console.log('1️⃣ Browser Support Check:');
  const status = browserNotificationService.getStatus();
  console.log('   Status:', status);
  
  // 2. Check page visibility
  console.log('2️⃣ Page Visibility Check:');
  console.log('   visibilityState:', document.visibilityState);
  console.log('   hidden:', document.hidden);
  console.log('   canShow:', browserNotificationService.canShowNotifications());
  console.log('   canForce:', browserNotificationService.canForceShow());
  
  // 3. Test notification creation
  console.log('3️⃣ Testing Notification Creation:');
  if (status.enabled) {
    console.log('   Attempting to show test notification...');
    const result = browserNotificationService.forceShowNotification({
      title: '🧪 Debug Test',
      body: 'This is a debug test notification',
      tag: 'debug-test'
    });
    console.log('   Result:', result);
  } else {
    console.log('   ❌ Notifications not enabled - permission:', status.permission);
  }
  
  // 4. Check socket connection
  console.log('4️⃣ Socket Connection Check:');
  try {
    const socket = window.socket || 'Not available on window';
    console.log('   Socket on window:', socket);
  } catch (error) {
    console.log('   Socket check error:', error);
  }
  
  console.log('🔧 === DEBUG COMPLETE ===');
  return status;
};

// Force enable notifications for testing
export const forceEnableNotifications = async () => {
  console.log('🔧 Force enabling notifications...');
  
  if (!browserNotificationService.isSupported) {
    console.error('❌ Browser notifications not supported');
    return false;
  }
  
  if (browserNotificationService.permission !== 'granted') {
    console.log('🔔 Requesting permission...');
    const granted = await browserNotificationService.requestPermission();
    if (!granted) {
      console.error('❌ Permission denied');
      return false;
    }
  }
  
  // Test immediate notification
  console.log('🧪 Testing immediate notification...');
  const result = browserNotificationService.forceShowNotification({
    title: '✅ Notifications Enabled!',
    body: 'Browser notifications are now working',
    tag: 'enable-test'
  });
  
  console.log('✅ Force enable result:', result);
  return result;
};

// Test the exact profile visit notification format from backend
export const testBackendProfileVisitNotification = () => {
  console.log('🧪 Testing backend profile visit notification format...');
  
  // Simulate the exact notification format from backend logs (same as NotificationPanel receives)
  const mockNotification = {
    notification: {
      id: "test-notification-id",
      recipient_id: "8ccd6396-3d6f-475d-abac-a3a0a0aea279",
      sender_id: "b0f73a8c-19d7-4c30-b78c-197e795e38b0",
      type: "profile_visit",
      title: "Profile Visit",
      message: "Sushant Suradkar visited your profile",
      data: {
        action: "profile_visit"
      },
      read: false,
      created_at: new Date().toISOString(),
      sender: {
        id: "b0f73a8c-19d7-4c30-b78c-197e795e38b0",
        first_name: "Sushant",
        last_name: "Suradkar",
        username: "sushant",
        profile_photo_url: "https://example.com/photo.jpg"
      }
    }
  };
  
  console.log('🔔 Simulating notification:new event with data:', mockNotification);
  
  // Manually trigger the notification handler
  if (window.browserNotificationService) {
    const result = window.browserNotificationService.showProfileVisitNotification({
      visitorName: 'Sushant Suradkar',
      visitorId: 'b0f73a8c-19d7-4c30-b78c-197e795e38b0'
    });
    console.log('🔔 Manual notification result:', result);
  } else {
    console.error('❌ browserNotificationService not available on window');
  }
  
  return mockNotification;
};

// Test exact same socket event as NotificationPanel receives
export const testSameSocketAsPanel = () => {
  console.log('🧪 Testing same socket event as NotificationPanel...');
  
  // Get the exact same socket that NotificationPanel uses
  const socket = window.getSocket ? window.getSocket() : null;
  
  if (!socket) {
    console.error('❌ No socket available');
    return false;
  }
  
  console.log('🔌 Using same socket as NotificationPanel:', {
    connected: socket.connected,
    id: socket.id
  });
  
  // Create the exact notification format that NotificationPanel receives
  const testNotification = {
    notification: {
      id: "manual-test-" + Date.now(),
      recipient_id: "8ccd6396-3d6f-475d-abac-a3a0a0aea279",
      sender_id: "b0f73a8c-19d7-4c30-b78c-197e795e38b0",
      type: "profile_visit",
      title: "Profile Visit",
      message: "Manual Test visited your profile",
      data: { action: "profile_visit" },
      read: false,
      created_at: new Date().toISOString(),
      sender: {
        id: "b0f73a8c-19d7-4c30-b78c-197e795e38b0",
        first_name: "Manual",
        last_name: "Test",
        username: "test"
      }
    }
  };
  
  console.log('📤 Manually emitting notification:new event (same format as backend)');
  
  // Emit the exact same event format that the backend sends
  socket.emit('notification:new', testNotification);
  
  return true;
};

// Test socket event simulation
export const simulateSocketNotification = () => {
  console.log('🧪 Simulating socket notification event...');
  
  const mockNotification = testBackendProfileVisitNotification();
  
  // Try to trigger the socket event manually if socket is available
  if (window.socket && window.socket.emit) {
    console.log('🔌 Emitting test notification via socket...');
    window.socket.emit('notification:new', mockNotification);
  } else {
    console.warn('⚠️ Socket not available on window for testing');
  }
  
  return mockNotification;
};

// Quick socket connectivity test
export const quickSocketTest = () => {
  console.log('🔌 === QUICK SOCKET TEST ===');
  
  // Check if socket exists and is connected
  const socket = window.getSocket ? window.getSocket() : null;
  
  if (!socket) {
    console.error('❌ No socket available');
    return false;
  }
  
  console.log('🔌 Socket status:', {
    connected: socket.connected,
    id: socket.id,
    hasAuth: !!socket.handshake?.auth?.token
  });
  
  // Test basic connectivity
  socket.emit('ping');
  console.log('📤 Sent ping to test connectivity');
  
  // Listen for pong
  socket.on('pong', () => {
    console.log('📥 ✅ Received pong - socket is working!');
  });
  
  return true;
};

// Test if socket is properly receiving events for current user
export const testSocketUserEvents = () => {
  console.log('🧪 Testing socket user event reception...');
  
  // Get current user from auth context if available
  const userId = window.user?.id || '8ccd6396-3d6f-475d-abac-a3a0a0aea279'; // fallback to test user
  
  console.log('👤 Testing events for user ID:', userId);
  
  // Try to access socket from different possible locations
  let socket = null;
  if (window.socket) {
    socket = window.socket;
    console.log('🔌 Found socket on window.socket');
  } else if (window.getSocket) {
    socket = window.getSocket();
    console.log('🔌 Found socket via window.getSocket()');
  } else {
    console.error('❌ No socket found for testing');
    return false;
  }
  
  if (!socket) {
    console.error('❌ Socket is null');
    return false;
  }
  
  console.log('🔌 Socket status:', {
    connected: socket.connected,
    id: socket.id,
    auth: socket.handshake?.auth,
    userId: socket.data?.user?.id || socket.userId
  });
  
  // Set up a test listener
  const testEventName = 'test:notification:' + Date.now();
  socket.on(testEventName, (data) => {
    console.log('✅ Received test event:', testEventName, data);
  });
  
  // Try to emit a test event to ourselves
  console.log('🔌 Emitting test event:', testEventName);
  socket.emit('test:user:notification', {
    userId: userId,
    testEvent: testEventName,
    message: 'Test notification for user ' + userId
  });
  
  // Clean up after 5 seconds
  setTimeout(() => {
    socket.off(testEventName);
    console.log('🧹 Cleaned up test listener');
  }, 5000);
  
  return true;
};

// Add to window for manual testing
if (typeof window !== 'undefined') {
  window.testBrowserNotifications = testBrowserNotifications;
  window.testNotificationVisibility = testNotificationVisibility;
  window.testProfileVisitNotification = testProfileVisitNotification;
  window.testBackendProfileVisitNotification = testBackendProfileVisitNotification;
  window.testSameSocketAsPanel = testSameSocketAsPanel;
  window.simulateSocketNotification = simulateSocketNotification;
  window.quickSocketTest = quickSocketTest;
  window.testSocketUserEvents = testSocketUserEvents;
  window.debugNotificationSystem = debugNotificationSystem;
  window.forceEnableNotifications = forceEnableNotifications;
  window.browserNotificationService = browserNotificationService;
}
