import winston from 'winston';
import { randomUUID } from 'crypto';
import { env } from './environment';

// Custom format for consistent logging
const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => ({
    timestamp,
    level,
    message,
    correlationId: correlationId || 'none',
    ...meta,
  }))
);

// Create logger instance
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: customFormat,
  defaultMeta: {
    service: 'distributor-api',
    version: '1.0.0',
  },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, correlationId }) => {
          const cid = correlationId ? ` [${correlationId}]` : '';
          return `${timestamp} ${level}${cid}: ${message}`;
        })
      ),
    }),
  ],
});

// Add file transports for production
if (env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: customFormat,
    })
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: customFormat,
    })
  );
}

// Helper function to create child logger with correlation ID
export const createChildLogger = (correlationId?: string) => {
  return logger.child({
    correlationId: correlationId || randomUUID(),
  });
};

// Request middleware for adding correlation ID to logs
export const addRequestId = (req: any, res: any, next: any) => {
  req.correlationId = randomUUID();
  req.logger = createChildLogger(req.correlationId);

  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', req.correlationId);

  next();
};

export default logger;