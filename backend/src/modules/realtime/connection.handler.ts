import type { Socket } from 'socket.io';
import { jwtUtil }     from '../../utils/jwt.js';

export const handleConnection = (socket: Socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join:session', async (data: {
    sessionId: string;
    token?:    string;
  }) => {
    const room = `session:${data.sessionId}`;
    socket.join(room);
    console.log(`📺 Client ${socket.id} joined room: ${room}`);

    // if token provided → verify and join personal room
    if (data.token) {
      try {
        const decoded = jwtUtil.verifyAccessToken(data.token);
        socket.data.user = decoded;

        // join personal room for targeted ETA updates
        const personalRoom = `patient:${decoded.userId}`;
        socket.join(personalRoom);
        console.log(`👤 Patient joined personal room: ${personalRoom}`);

      } catch {
        console.log(`⚠️ Invalid token — joined as anonymous`);
      }
    }

    socket.emit('joined:session', {
      sessionId: data.sessionId,
      message:   'Successfully joined queue session',
    });
  });

  socket.on('leave:session', (data: { sessionId: string }) => {
    const room = `session:${data.sessionId}`;
    socket.leave(room);
    console.log(`👋 Client ${socket.id} left room: ${room}`);
  });

  // join:personal — patient has no session yet (no token today) but wants
  // to subscribe to their personal room so they get notified when a token
  // is issued to them by the receptionist
  socket.on('join:personal', (data: { token: string }) => {
    if (!data.token) return;
    try {
      const decoded = jwtUtil.verifyAccessToken(data.token);
      socket.data.user = decoded;
      const personalRoom = `patient:${decoded.userId}`;
      socket.join(personalRoom);
      console.log(`👤 Patient joined personal room (no session): ${personalRoom}`);
      socket.emit('joined:personal', { message: 'Subscribed for personal notifications' });
    } catch {
      console.log(`⚠️ join:personal — invalid token`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
};