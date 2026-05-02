import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:3001';

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Create socket connection once
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Join / leave org room when user changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    if (user?.organizationId) {
      socket.emit('join_org', user.organizationId);
    }

    return () => {
      if (user?.organizationId) {
        socket.emit('leave_org', user.organizationId);
      }
    };
  }, [user?.organizationId]);

  // Helper to join a specific org room (for public users browsing an org)
  const joinOrg = (orgId) => {
    if (socketRef.current && orgId) {
      socketRef.current.emit('join_org', orgId);
    }
  };

  const leaveOrg = (orgId) => {
    if (socketRef.current && orgId) {
      socketRef.current.emit('leave_org', orgId);
    }
  };

  const joinQueue = (queueId) => {
    if (socketRef.current && queueId) {
      socketRef.current.emit('join_queue', queueId);
    }
  };

  const leaveQueue = (queueId) => {
    if (socketRef.current && queueId) {
      socketRef.current.emit('leave_queue', queueId);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        connected,
        joinOrg,
        leaveOrg,
        joinQueue,
        leaveQueue,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
