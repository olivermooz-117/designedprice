import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "node:path";
import { scansRouter } from "./routes/scans.routes";
import { authRouter } from "./routes/auth.routes";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();

// Behind Render/Heroku the real client IP arrives in X-Forwarded-For; rate limiting needs it.
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const origins = process.env.CORS_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    // CORS_ORIGINS unset: allow any origin in development, none in production.
    origin: origins && origins.length > 0 ? origins : process.env.NODE_ENV !== "production",
    credentials: true,
  }),
);

app.use(express.json({ limit: "12mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/scans", scansRouter);
app.use(errorHandler);
