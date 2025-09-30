import { useEffect, useState } from 'react';
import { getSocket } from '../api/socket';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketInstance = getSocket();
    setSocket(socketInstance);

    return () => {
      // Don't close the socket here as it's shared across the app
    };
  }, []);

  return socket;
};
