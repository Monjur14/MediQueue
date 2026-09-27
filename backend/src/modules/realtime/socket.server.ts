import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createServer } from 'http';
import { redis } from '../../config/redis.js';
import { handleConnection } from './connection.handler.js';
import type { Express } from 'express';

export let io: Server;

export const initSocketServer = (app: Express) => {
  const httpServer = createServer(app);

  // create a separate redis connection for pub/sub
  const pubClient = redis;
  const subClient = redis.duplicate();

  const allowedOrigins = [
    process.env.FRONTEND_URL ?? "https://mediqueue.monjurhossen.online",
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter(Boolean) as string[];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Socket CORS: origin ${origin} not allowed`));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // attach redis adapter — enables multi-server scaling
  io.adapter(createAdapter(pubClient, subClient));

  // handle connections
  io.on('connection', handleConnection);

  console.log('✅ Socket.io initialized');

  return httpServer;
};