const { verifyAccessToken } = require('../utils/tokens');

// Sets up Socket.IO: each authenticated admin joins a private room (admin:<id>)
// plus a role room (role:SUPERADMIN or role:SUBADMIN) so events can be targeted.
function initSockets(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required.'));
      const payload = verifyAccessToken(token);
      socket.admin = { id: payload.sub, role: payload.role };
      next();
    } catch (err) {
      next(new Error('Invalid or expired token.'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`admin:${socket.admin.id}`);
    socket.join(`role:${socket.admin.role}`);

    socket.on('disconnect', () => {
      // no-op; rooms are cleaned up automatically by Socket.IO
    });
  });
}

module.exports = initSockets;
