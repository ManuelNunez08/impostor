/**
 * Socket.io client configuration
 */

import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@/types/socket';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!socket) {
    // Determine socket URL based on environment
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    
    socket = io(url, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000, // 10 second connection timeout
    }) as TypedSocket;

    // Global error handler
    socket.on('error', (message: string) => {
      console.error('Socket error:', message);
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      console.error('   Make sure the Socket.io server is running on', url);
      console.error('   Run: npm run dev:all');
    });

    socket.on('connect_timeout', () => {
      console.error('❌ Connection timeout - server may not be running');
      console.error('   Run: npm run dev:all');
    });
  }

  return socket;
}

export function connectSocket(): void {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export { socket };

