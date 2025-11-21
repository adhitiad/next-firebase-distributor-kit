import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { checkDatabaseConnection } from './config/database';
import { env } from './config/environment';
import { logger } from './config/logger';

// Create HTTP server
const server = createServer(app);

// Create Socket.IO server
const io = new SocketIOServer(server, {
  cors: {
    origin: env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Client connected to Socket.IO', {
    socketId: socket.id,
    ip: socket.handshake.address,
  });

  // Handle room subscriptions for stock updates
  socket.on('subscribe-stock-updates', (data: any) => {
    if (data && typeof data === 'object' && 'productId' in data) {
      const room = `stock-${data.productId}`;
      socket.join(room);

      logger.info('Client subscribed to stock updates', {
        socketId: socket.id,
        productId: data.productId,
        room,
      });
    }
  });

  socket.on('unsubscribe-stock-updates', (data: any) => {
    if (data && typeof data === 'object' && 'productId' in data) {
      const room = `stock-${data.productId}`;
      socket.leave(room);

      logger.info('Client unsubscribed from stock updates', {
        socketId: socket.id,
        productId: data.productId,
        room,
      });
    }
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected from Socket.IO', {
      socketId: socket.id,
    });
  });
});

// Helper function to broadcast stock updates
export const broadcastStockUpdate = (productId: string, stockData: any) => {
  io.to(`stock-${productId}`).emit('stock-update', {
    productId,
    ...stockData,
    timestamp: new Date().toISOString(),
  });
};

// Make Socket.IO available globally for other modules
(global as any).io = io;

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    // Close Socket.IO connections
    io.close(() => {
      logger.info('Socket.IO server closed');
    });

    // Disconnect from database
    try {
      const { prisma } = await import('./config/database');
      await prisma.$disconnect();
      logger.info('Database disconnected');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
    }

    logger.info('Graceful shutdown completed');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, 30000);
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Start listening
    server.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
      logger.info(`📝 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 Frontend URL: ${env.FRONTEND_URL}`);
      logger.info(`📊 Database connected: ${dbConnected}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();