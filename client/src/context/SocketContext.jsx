import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext({
  socket: null,
  isConnected: false,
});

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Determine backend URL
    let serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    // If VITE_API_URL ends with /api, trim /api for root socket connection
    if (serverUrl.endsWith('/api')) {
      serverUrl = serverUrl.slice(0, -4);
    }

    const currentToken = token || localStorage.getItem('token');

    // Create new socket connection if none exists or token changed
    const newSocket = io(serverUrl, {
      auth: {
        token: currentToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', () => {
      setIsConnected(false);
    });

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [token, user?._id || user?.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};

/**
 * Reusable Custom Hook to subscribe to a Socket.IO event in any component cleanly
 * Prevents duplicate listeners & cleans up on unmount.
 */
export const useSocketEvent = (eventName, callback) => {
  const { socket } = useSocket();
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!socket || !eventName) return;

    const eventListener = (...args) => {
      if (savedCallback.current) {
        savedCallback.current(...args);
      }
    };

    socket.on(eventName, eventListener);

    return () => {
      socket.off(eventName, eventListener);
    };
  }, [socket, eventName]);
};

export default SocketContext;
