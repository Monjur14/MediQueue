import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('accessToken')
      : null;

    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    // refresh token in case it changed since socket was created
    const token = localStorage.getItem('accessToken');
    if (token) {
      s.auth = { token };
    }
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

// ── Typed socket events (server → client) ───────────────────────────
export interface TokenCalledPayload {
  tokenId: string;
  tokenNumber: number;
  patientId: string;
  sessionId: string;
}

export interface QueueUpdatePayload {
  sessionId: string;
  tokens: Array<{
    id: string;
    tokenNumber: number;
    status: string;
    estimatedWaitMinutes?: number;
  }>;
}

export interface EtaUpdatePayload {
  sessionId: string;
  updates: Array<{ tokenId: string; estimatedWaitMinutes: number }>;
}

export interface BreakPayload {
  sessionId: string;
  breakId: string;
  startedAt?: string;
  endedAt?: string;
}
