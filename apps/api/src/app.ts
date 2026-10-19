import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "node:path";
import { scansRouter } from "./routes/scans.routes";
import { authRouter } from "./routes/auth.routes";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(",") ?? true }));
app.use(express.json({ limit: "12mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/scans", scansRouter);
app.use(errorHandler);
