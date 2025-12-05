import { useEffect, useState, useCallback } from 'react';
import { getSocket, socketService } from '../api/socket';
import { useAuth } from '../../contexts/AuthContext';

export const useSocket = () => {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    // Get socket with auth token
    const socketInstance = getSocket(token);
    setSocket(socketInstance);
    setIsConnected(socketInstance?.connected || false);

    // Listen for connection state changes
    const handleConnectionChange = (state) => {
      setIsConnected(state === 'connected');
      if (state === 'connected') {
        setSocket(getSocket(token));
      }
    };

    socketService.addConnectionListener(handleConnectionChange);

    // Check initial connection state
    if (socketInstance?.connected) {
      setIsConnected(true);
    }

    return () => {
      socketService.removeConnectionListener(handleConnectionChange);
      // Don't close the socket here as it's shared across the app
    };
  }, [token]);

  return socket;
};
