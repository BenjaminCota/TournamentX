const http = require('node:http');
const { Server } = require('socket.io');
const app = require('./app');
const env = require('./config/env');

function createRealtimeServer() {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: env.socketCorsOrigin, methods: ['GET', 'POST', 'PATCH'] },
  });

  app.set('io', io);
  io.on('connection', (socket) => {
    socket.on('subscribe-match', (matchId, acknowledge) => {
      if (typeof matchId === 'string' && matchId.trim()) {
        socket.join(`match:${matchId}`);
        if (typeof acknowledge === 'function') acknowledge({ ok: true });
      }
    });
    socket.on('unsubscribe-match', (matchId) => {
      if (typeof matchId === 'string') socket.leave(`match:${matchId}`);
    });
  });

  return { server, io };
}

if (require.main === module) {
  const { server } = createRealtimeServer();
  server.listen(env.port, () => {
    console.log(`TournamentX Rewards API disponible en http://localhost:${env.port}`);
  });
}

module.exports = { createRealtimeServer };
