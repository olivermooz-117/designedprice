import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  console.error("[unhandled]", err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
}
