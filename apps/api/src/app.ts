import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { addRequestId } from './config/logger';
import { authenticate, authorize, UserRole } from './middleware/auth';
import TransactionController from './controllers/transaction.controller';
import PriceSchemeController from './controllers/priceScheme.controller';

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request ID and correlation ID to all requests
app.use(addRequestId);

// Health check endpoint
app.get('/api/health', (req, res) => {
  req.logger?.info('Health check accessed');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes

// Price Schemes Routes
app.post('/api/price-schemes', authenticate, authorize([UserRole.ADMIN_MANUAL, UserRole.OWNER]), PriceSchemeController.createPriceScheme);
app.get('/api/price-schemes', authenticate, PriceSchemeController.getPriceSchemes);
app.put('/api/price-schemes/:id', authenticate, authorize([UserRole.ADMIN_MANUAL, UserRole.OWNER]), PriceSchemeController.updatePriceScheme);
app.delete('/api/price-schemes/:id', authenticate, authorize([UserRole.ADMIN_MANUAL, UserRole.OWNER]), PriceSchemeController.deletePriceScheme);
app.post('/api/pricing/calculate', authenticate, PriceSchemeController.calculatePrice);
app.get('/api/products/:productId/pricing/validate', authenticate, PriceSchemeController.validatePricing);

// Transaction Routes
app.post('/api/transactions', authenticate, authorize([UserRole.KASIR, UserRole.ADMIN_MANUAL, UserRole.OWNER]), TransactionController.createTransaction);
app.get('/api/transactions', authenticate, TransactionController.getTransactions);
app.get('/api/transactions/:id', authenticate, TransactionController.getTransaction);
app.put('/api/transactions/:id', authenticate, authorize([UserRole.KASIR, UserRole.ADMIN_MANUAL, UserRole.OWNER]), TransactionController.updateTransaction);

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const logger = (req as any).logger || console;

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    error: 'Internal server error',
    ...(isDevelopment && {
      message: err.message,
      stack: err.stack
    }),
  });
});

export default app;