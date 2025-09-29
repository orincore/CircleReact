// Temporary socket configuration for Vercel testing
// Vercel doesn't support WebSocket connections, so we'll disable real-time features temporarily

const ENABLE_SOCKET = false; // Set to false for Vercel deployment

export const createSocket = (token) => {
  if (!ENABLE_SOCKET) {
    console.log('🚫 Socket.IO disabled for Vercel deployment');
    return {
      // Mock socket object for compatibility
      emit: () => console.log('Socket emit disabled'),
      on: () => console.log('Socket on disabled'),
      off: () => console.log('Socket off disabled'),
      disconnect: () => console.log('Socket disconnect disabled'),
      connected: false,
    };
  }
  
  // Original socket creation code would go here
  // when deploying to a platform that supports WebSockets
};

export { ENABLE_SOCKET };
