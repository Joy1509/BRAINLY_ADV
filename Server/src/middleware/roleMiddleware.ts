import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";

export const requireRole = (requiredRole: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = (req as any).userRole;
    
    if (!userRole || userRole !== requiredRole) {
      res.status(403).json({
        message: "Access denied. Insufficient permissions."
      });
      return;
    }
    
    next();
  };
};

export const requireAdmin = requireRole("admin");