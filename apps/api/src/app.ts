import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "node:path";
import { scansRouter } from "./routes/scans.routes";
import { authRouter } from "./routes/auth.routes";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./config/env";

export const app = express();

// Behind Render/Heroku the real client IP arrives in X-Forwarded-For; rate limiting needs it.
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS: In production, CORS_ORIGINS is validated at startup and must be a non-empty comma-separated list.
// In development/test, allow any origin for convenience.
const corsOrigins = env.CORS_ORIGINS?.split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean) ?? [];
const isDev = env.NODE_ENV !== "production";
app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : isDev,
    credentials: true,
  }),
);

app.use(express.json({ limit: "12mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/scans", scansRouter);
app.use(errorHandler);
