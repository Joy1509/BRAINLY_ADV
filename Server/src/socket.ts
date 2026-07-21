import { Server } from 'socket.io';

let io: Server;

export const initIO = (server: any) => {
  io = new Server(server, {
    cors: { origin: true, credentials: true }
  });
  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};
