import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { hashPassword, verifyPassword } from "../lib/password";

const RegisterSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
  displayName: z.string().trim().min(1).max(80).optional(),
}).strict();

const LoginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

function issueToken(user: { id: string; email: string }) {
  return jwt.sign(
    { email: user.email },
    env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: "7d",
      issuer: "designedprice-api",
      audience: "designedprice-web",
    },
  );
}

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = RegisterSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Provide a valid email and a password of 10–128 characters.",
        parsed.error.flatten(),
      );
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new AppError(
        409,
        "EMAIL_ALREADY_REGISTERED",
        "An account with this email already exists.",
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: parsed.data.displayName || null,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    const token = issueToken(user);

    res.status(201).json({
      data: {
        user,
        token,
        tokenType: "Bearer",
        expiresIn: 604800,
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      next(
        new AppError(
          409,
          "EMAIL_ALREADY_REGISTERED",
          "An account with this email already exists.",
        ),
      );
      return;
    }

    next(error);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = LoginSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Provide a valid email and password.",
        parsed.error.flatten(),
      );
    }

    const email = parsed.data.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        passwordHash: true,
      },
    });

    const validPassword =
      user?.passwordHash
        ? await verifyPassword(parsed.data.password, user.passwordHash)
        : false;

    if (!user || !validPassword) {
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid email or password.",
      );
    }

    const token = issueToken(user);

    res.status(200).json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
        token,
        tokenType: "Bearer",
        expiresIn: 604800,
      },
    });
  } catch (error) {
    next(error);
  }
}
