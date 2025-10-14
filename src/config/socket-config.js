// Temporary socket configuration for Vercel testing
// Vercel doesn't support WebSocket connections, so we'll disable real-time features temporarily

const ENABLE_SOCKET = false; // Set to false for Vercel deployment

export const createSocket = (token) => {
  if (!ENABLE_SOCKET) {
    //console.log('🚫 Socket.IO disabled for Vercel deployment');
    return {
      // Mock socket object for compatibility
      emit: () => {},
      on: () => {},
      off: () => {},
      disconnect: () => {},
      connected: false,
    };
  }
  
  // Original socket creation code would go here
  // when deploying to a platform that supports WebSockets
};

export { ENABLE_SOCKET };
