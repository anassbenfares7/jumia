import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// Extend Express Request type definitions to safely hold our logged-in user's payload
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'buyer' | 'vendor' | 'admin';
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  // standard format: 'Bearer TOKEN_STRING'
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ status: 'error', message: 'Access denied. No authentication token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as AuthenticatedRequest['user'];
    req.user = decoded; // Attach the validated payload directly to the request object
    next(); // Pass control to the next middleware/controller function
  } catch (err) {
    res.status(403).json({ status: 'error', message: 'Invalid or expired session token.' });
    return;
  }
};

// Role-based Access Control (RBAC) closure factory
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ status: 'error', message: 'Forbidden. You do not have permission to access this resource.' });
      return;
    }

    next();
  };
};
