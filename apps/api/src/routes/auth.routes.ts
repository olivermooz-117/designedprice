import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login } from "../controllers/auth.controller";

// Needs app.set("trust proxy", 1) when deployed behind Render/Heroku (set in app.ts).
// Successful requests don't count, so only failed/guessing attempts burn the budget.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many authentication attempts. Try again later.",
    },
  },
});

export const authRouter = Router();
authRouter.post("/register", authLimiter, register);
authRouter.post("/login", authLimiter, login);
