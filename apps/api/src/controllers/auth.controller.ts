import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { env } from "../config/env";

const CredsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(80).optional(),
});

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "30d" });
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = CredsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid email or password.", parsed.error.flatten());
    }
    const { email, password, displayName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError(409, "EMAIL_TAKEN", "Email already registered.");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, displayName: displayName ?? email.split("@")[0] },
    });

    const token = signToken(user.id);
    res.status(201).json({
      data: {
        token,
        user: { id: user.id, email: user.email, displayName: user.displayName },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = CredsSchema.omit({ displayName: true }).safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid email or password.");
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");

    const token = signToken(user.id);
    res.json({
      data: {
        token,
        user: { id: user.id, email: user.email, displayName: user.displayName },
      },
    });
  } catch (err) {
    next(err);
  }
}
