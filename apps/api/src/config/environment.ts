import { z } from 'zod';

// Environment variables validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3001'),

  // Database
  DATABASE_URL: z.string().url('Invalid database URL'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Redis
  REDIS_URL: z.string().url('Invalid Redis URL').optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  // Flip.id
  FLIP_SECRET_KEY: z.string().optional(),
  FLIP_WEBHOOK_SECRET: z.string().optional(),

  // CORS
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Parse and validate environment variables
export const env = envSchema.parse(process.env);

// Export for type safety
export type Env = z.infer<typeof envSchema>;