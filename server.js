const http = require('http');
const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Server: SocketServer } = require('socket.io');
const { configureRealtimeAdapter } = require('./services/realtimeAdapter');

// Fail fast for mongoose if database is offline
mongoose.set('bufferCommands', false);

// Load environment variables
dotenv.config();

const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { pool, initializeDatabase } = require('./config/postgres');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const auditRoutes = require('./routes/auditRoutes');
const studentApplicationRoutes = require('./routes/studentApplicationRoutes');
const studentRoutes = require('./routes/studentRoutes');
const insightRoutes = require('./routes/insightRoutes');
const reportRoutes = require('./routes/reportRoutes');
const compatRoutes = require('./routes/compatRoutes');
const placementCrmRoutes = require('./routes/placementCrmRoutes');
const compression = require('compression');
const { protect } = require('./middleware/authMiddleware');

const app = express();
// Enable trust proxy for cloud environments / reverse proxies (Cloud Run, AI Studio)
app.set('trust proxy', 1);

const httpServer = http.createServer(app);
const io = new SocketServer(httpServer, {
  path: process.env.VERCEL === '1' ? '/api/socket-io/socket.io' : '/socket.io',
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
      : process.env.NODE_ENV === 'production' ? false : '*',
  },
});

app.set('io', io);

let initializationPromise;
const initializeServices = () => {
  if (initializationPromise) return initializationPromise;
  initializationPromise = initializeServicesOnce().catch((error) => {
    initializationPromise = null;
    throw error;
  });
  return initializationPromise;
};

const initializeServicesOnce = async () => {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL;

  if (isProduction && (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET, 'utf8') < 32)) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
  }
  if (isProduction && !mongoUri) {
    throw new Error('MONGODB_URI is required in production for placement and application data.');
  }

  await initializeDatabase();

  if (mongoUri && mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(mongoUri, {
        dbName: process.env.MONGODB_DB_NAME || 'studentProfilingSystem',
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        maxPoolSize: process.env.VERCEL === '1' ? 5 : 10,
        minPoolSize: 0,
      });
      console.log('MongoDB connected successfully.');
    } catch (mongoErr) {
      if (isProduction) throw mongoErr;
      console.warn('MongoDB connection failed; optional MongoDB features are unavailable:', mongoErr.message);
    }
  }

  if (mongoose.connection.readyState === 1 && process.env.VERCEL === '1') {
    await configureRealtimeAdapter(io);
  }
};

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required.'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await initializeServices();
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

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

const fallbackApplications = [];

app.locals = app.locals || {};
app.locals.fallbackApplications = fallbackApplications;

// Gzip/Brotli Compression for snappy response times
app.use(compression());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Same-origin is the production default; cross-origin access must be configured explicitly.
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : process.env.NODE_ENV === 'production' ? false : '*',
}));

// Set security headers with Helmet
// Allow CDNs for Bootstrap, Bootstrap Icons, and Chart.js
app.use(
  helmet({
    frameguard: { action: 'sameorigin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com',
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com',
          'https://fonts.googleapis.com',
        ],
        fontSrc: [
          "'self'",
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com',
          'https://fonts.gstatic.com',
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting for API requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP address, please try again after 15 minutes.',
  },
});
app.use('/api', limiter);
app.get('/api/runtime-config', (req, res) => {
  const socketPath = process.env.VERCEL === '1'
    ? '/api/socket-io/socket.io'
    : '/socket.io';
  res.json({
    success: true,
    data: {
      socketPath,
      socketScriptPath: `${socketPath}/socket.io.js`,
      socketTransports: process.env.VERCEL === '1' ? ['websocket'] : ['websocket', 'polling'],
    },
  });
});
app.use('/api', async (req, res, next) => {
  try {
    await initializeServices();
    next();
  } catch (error) {
    next(error);
  }
});

// Serve static frontend assets with caching and ETag support
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  etag: true,
}));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await initializeServices();
    await pool.query('SELECT 1');
    res.status(200).json({
      success: true,
      databases: {
        postgres: 'connected',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Required database health check failed:', error.message);
    res.status(503).json({ success: false, message: 'Required database health check failed.' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/student-applications', studentApplicationRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/placement', placementCrmRoutes);
app.use('/api', placementCrmRoutes);
app.use('/api', compatRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.',
  });
});

// Fallback for frontend SPA navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await initializeServices();
    const port = Number(process.env.PORT) || 3000;
    const server = httpServer.listen(port, '0.0.0.0', () => {
      console.log(`\n======================================================`);
      console.log(`Student Academic Personal and Career Profiling System`);
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${port}`);
      console.log(`======================================================\n`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Stop the existing server or set PORT to another value.`);
      } else {
        console.error('Backend listener failed:', error.message);
      }
      process.exitCode = 1;
    });
  } catch (err) {
    const reason = err.code || err.name || err.message;
    console.error('Failed to start backend:', reason);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.httpServer = httpServer;
module.exports.initializeServices = initializeServices;
