import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;

    const s = io(API_BASE, { auth: { token }, transports: ['websocket'] });
    socketRef.current = s;
    setSocket(s);

    return () => { s.disconnect(); };
  }, [isAuthenticated]);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
};
