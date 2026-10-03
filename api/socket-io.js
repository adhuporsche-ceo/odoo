const http = require('http');
const jwt = require('jsonwebtoken');
const { Server: SocketServer } = require('socket.io');
const { initializeServices } = require('../server');
const { configureRealtimeAdapter } = require('../services/realtimeAdapter');
const { pool } = require('../config/postgres');

const server = http.createServer((req, res) => {
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, message: 'Endpoint not found.' }));
});

const io = new SocketServer(server, {
  path: '/api/socket-io/socket.io',
  transports: ['websocket'],
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
      : false,
  },
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required.'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await initializeServices();
    await configureRealtimeAdapter(io);

    const { rows } = await pool.query(
      'SELECT id, name, email, role, department FROM users WHERE id = $1',
      [decoded.id]
    );
    if (!rows[0]) return next(new Error('Authentication required.'));
    socket.data.user = rows[0];
    next();
  } catch (error) {
    next(new Error('Authentication failed.'));
  }
});

io.on('connection', () => {});

module.exports = server;
