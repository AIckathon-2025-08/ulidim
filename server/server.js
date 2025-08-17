import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { initializeDatabase } from './database/connection.js';
import { setupWebSocket } from './websocket/handlers.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow for development
}));

// General rate limiting (more generous)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    message: 'Too many requests from this IP, please try again later.'
  }
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 auth requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    message: 'Too many authentication attempts, please try again later.'
  }
});

// Very lenient rate limiting for stats endpoints (real-time updates)
const statsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 stats requests per minute
  message: {
    success: false,
    error: {
      message: 'Too many stats requests, please slow down.',
      code: 'STATS_RATE_LIMIT_EXCEEDED'
    },
    message: 'Too many stats requests, please slow down.'
  }
});

app.use(generalLimiter);

// CORS
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://172.20.0.5:3000", // Docker network IP
    /https?:\/\/.+\.ngrok-free\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')));
}

// Setup routes with io injection
const setupRoutes = async () => {
    const { createGameRoutes } = await import('./routes/games.js');
    const { createVoteRoutes } = await import('./routes/votes.js');
    const authRoutes = await import('./routes/auth.js');

    // Authentication routes (with stricter rate limiting)
    app.use('/api/auth', authLimiter, authRoutes.default);

    // Game and vote routes (require io for real-time features)
    app.use('/api/games', createGameRoutes(io));
    app.use('/api/votes', createVoteRoutes(io));

    // Apply stats rate limiter to stats endpoints specifically
    app.use('/api/games/*/stats', statsLimiter);
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database connection
    await initializeDatabase();
    console.log('✅ Database connected successfully');

    // Setup routes and WebSocket
    await setupRoutes();
    setupWebSocket(io);

    // Error handling middleware (must be registered AFTER routes)
    app.use((error, req, res, next) => {
      console.error('Server Error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });

    // JSON parsing error handler (must be AFTER routes)
    app.use((err, req, res, next) => {
      if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid JSON in request body',
            code: 'INVALID_JSON'
          },
          message: 'Invalid JSON in request body'
        });
      }
      next(err);
    });

    // Global error handler (registered AFTER routes)
    app.use((err, req, res, next) => {
      console.error(`❌ ${req.method} ${req.path}:`, {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        },
        message: 'Internal server error'
      });
    });

    // 404 handler (registered AFTER routes)
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: {
          message: 'Not Found',
          code: 'NOT_FOUND'
        },
        message: 'Not Found'
      });
    });

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { io };
