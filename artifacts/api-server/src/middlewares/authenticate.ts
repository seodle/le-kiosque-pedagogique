import { Request, Response, NextFunction } from "express";
import { verifyToken, type TokenPayload } from "../lib/jwt.js";

declare global {
  namespace Express {
    interface Request {
      authPayload?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.authPayload = payload;
  next();
}

export function requireStaff(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const payload = req.authPayload;
    if (!payload || payload.type !== "staff") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (roles.length > 0 && !roles.includes(payload.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export function requireTeacherOrStaff(req: Request, res: Response, next: NextFunction): void {
  const payload = req.authPayload;
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
