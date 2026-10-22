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
  const authorization = req.headers.authorization;
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  const token = match?.[1];

  if (!token) {
    console.error("[auth] missing bearer token");
    return next(
      new AppError(401, "UNAUTHORIZED", "Missing or malformed bearer token."),
    );
  }

  try {
    // Verify signature, expiry, issuer and audience (must match issueToken and devToken).
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: "designedprice-api",
      audience: "designedprice-web",
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;

    if (!payload.sub || typeof payload.sub !== "string") {
      console.error("[auth] token missing sub claim");
      throw new Error("no sub");
    }

    req.user = { id: payload.sub };
    next();
  } catch (err) {
    console.error(
      "[auth] jwt.verify failed:",
      err instanceof Error ? err.message : err,
    );
    next(new AppError(401, "UNAUTHORIZED", "Invalid or expired token."));
  }
}
