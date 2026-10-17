import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth";
import { analyzeScan, listScanHistory } from "../controllers/scans.controller";

const analyzeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

export const scansRouter = Router();
scansRouter.get("/history", requireAuth, listScanHistory);
scansRouter.post("/analyze", requireAuth, analyzeLimiter, analyzeScan);
