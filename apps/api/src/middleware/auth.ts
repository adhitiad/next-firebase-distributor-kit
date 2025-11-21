import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { env } from '../config/environment';

// Extend Request interface to include user and logger
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
      logger?: any;
      correlationId?: string;
    }
  }
}

// JWT payload interface
interface JWTPayload {
  id: string;
  email: string;
  role: string;
}

// User roles enum
export enum UserRole {
  OWNER = 'OWNER',
  ADMIN_ENTRY = 'ADMIN_ENTRY',
  ADMIN_MANUAL = 'ADMIN_MANUAL',
  KASIR = 'KASIR',
  SALES = 'SALES',
}

// Role hierarchy for permissions
const roleHierarchy: Record<UserRole, number> = {
  [UserRole.OWNER]: 5,
  [UserRole.ADMIN_MANUAL]: 4,
  [UserRole.ADMIN_ENTRY]: 3,
  [UserRole.KASIR]: 2,
  [UserRole.SALES]: 1,
};

// Helper function to verify JWT token
const verifyToken = (token: string): Promise<JWTPayload> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, env.JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded as JWTPayload);
      }
    });
  });
};

// Authentication middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id, isActive: true },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid token or user not found' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role-based authorization middleware factory
export const authorize = (requiredRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRole = req.user.role as UserRole;
    const userRoleLevel = roleHierarchy[userRole];

    // Check if user has required role (or higher in hierarchy)
    const hasRequiredRole = requiredRoles.some(role => {
      const requiredRoleLevel = roleHierarchy[role];
      return userRoleLevel >= requiredRoleLevel;
    });

    if (!hasRequiredRole) {
      logger.warn(`Access denied for user ${req.user.id} with role ${userRole}`, {
        requiredRoles,
        userRole,
      });
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id, isActive: true },
      select: { id: true, email: true, role: true },
    });

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Optional auth should not fail the request
    next();
  }
};