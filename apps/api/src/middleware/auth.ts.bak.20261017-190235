import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../lib/errors";

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string };
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  if (!token) return next(new AppError(401, "UNAUTHORIZED", "Missing bearer token."));
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    if (!payload.sub) throw new Error("no sub");
    req.user = { id: payload.sub };
    next();
  } catch {
    next(new AppError(401, "UNAUTHORIZED", "Invalid or expired token."));
  }
}
