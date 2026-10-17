import type { NextFunction, Request, Response } from "express";
import { Prisma, ScanStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { loadImageFromUrl, parseBase64Image } from "../lib/imageLoader";
import { uploadScanImage } from "../lib/storage";
import { GeminiVisionService, type ImagePayload } from "../services/GeminiVisionService";
import { PricingService, type PriceEstimate } from "../services/PricingService";

const AnalyzeBodySchema = z.union([
  z.object({ imageUrl: z.string().url() }).strict(),
  z.object({ imageBase64: z.string().min(100), mimeType: z.string() }).strict(),
]);

export interface ScanResponse {
  id: string;
  status: ScanStatus;
  imageUrl: string;
  createdAt: string;
  identification: {
    brand: string | null;
    garmentType: string | null;
    searchQueryString: string | null;
  };
  valuation: null | {
    id: string;
    estimatedLowPrice: number;
    estimatedHighPrice: number;
    medianPrice: number;
    currency: string;
    confidenceScore: number;
    suggestedEra: string;
    comparables: Array<{
      id: string;
      platform: string;
      itemUrl: string;
      price: number;
      title: string;
      thumbnail: string | null;
    }>;
  };
}

const scanInclude = { valuation: { include: { comparables: true } } } satisfies Prisma.ScanInclude;
type ScanWithRelations = Prisma.ScanGetPayload<{ include: typeof scanInclude }>;

function toResponse(scan: ScanWithRelations): ScanResponse {
  const v = scan.valuation;
  return {
    id: scan.id,
    status: scan.status,
    imageUrl: scan.imageUrl,
    createdAt: scan.createdAt.toISOString(),
    identification: {
      brand: scan.brand,
      garmentType: scan.garmentType,
      searchQueryString: scan.searchQueryString,
    },
    valuation: v && {
      id: v.id,
      estimatedLowPrice: v.estimatedLowPrice.toNumber(),
      estimatedHighPrice: v.estimatedHighPrice.toNumber(),
      medianPrice: v.medianPrice.toNumber(),
      currency: v.currency,
      confidenceScore: v.confidenceScore,
      suggestedEra: v.suggestedEra,
      comparables: v.comparables.map((c) => ({
        id: c.id,
        platform: c.platform,
        itemUrl: c.itemUrl,
        price: c.price.toNumber(),
        title: c.title,
        thumbnail: c.thumbnail,
      })),
    },
  };
}

const gemini = new GeminiVisionService();
const pricing = new PricingService();

export async function listScanHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
    }

    const scans = await prisma.scan.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: scanInclude,
    });

    res.status(200).json({
      data: scans.map(toResponse),
      meta: { count: scans.length, limit: 50 },
    });
  } catch (error) {
    next(error);
  }
}

export async function analyzeScan(req: Request, res: Response, next: NextFunction): Promise<void> {
  let scanId: string | undefined;

  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, "UNAUTHORIZED", "Authentication required.");

    const parsed = AnalyzeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Provide either imageUrl, or imageBase64 + mimeType.",
        parsed.error.flatten()
      );
    }
    const body = parsed.data;

    let image: ImagePayload;
    let imageUrl: string;
    if ("imageUrl" in body) {
      image = await loadImageFromUrl(body.imageUrl);
      imageUrl = body.imageUrl;
    } else {
      image = parseBase64Image(body.imageBase64, body.mimeType);
      imageUrl = await uploadScanImage(userId, image.mimeType, image.base64);
    }

    const scan = await prisma.scan.create({
      data: { userId, imageUrl, status: ScanStatus.PROCESSING },
    });
    scanId = scan.id;

    const { analysis, rawResponseText, model } = await gemini.analyzeGarment(image);
    const rawGeminiResponse = JSON.parse(rawResponseText) as Prisma.InputJsonValue;

    let estimate: PriceEstimate | null = null;
    try {
      estimate = analysis.garmentType === "unknown" ? null : await pricing.estimate(analysis);
    } catch (pricingErr) {
      console.error("[analyze] pricing lookup failed", { scanId, pricingErr });
    }

    const saved = await prisma.scan.update({
      where: { id: scan.id },
      data: {
        status: estimate ? ScanStatus.COMPLETED : ScanStatus.NO_COMPARABLES,
        brand: analysis.brand,
        garmentType: analysis.garmentType,
        searchQueryString: analysis.searchQueryString,
        geminiModel: model,
        rawGeminiResponse,
        ...(estimate && {
          valuation: {
            create: {
              estimatedLowPrice: new Prisma.Decimal(estimate.lowPrice),
              estimatedHighPrice: new Prisma.Decimal(estimate.highPrice),
              medianPrice: new Prisma.Decimal(estimate.medianPrice),
              currency: estimate.currency,
              confidenceScore: estimate.confidenceScore,
              suggestedEra: analysis.estimatedEra,
              queryUsed: estimate.queryUsed,
              comparables: {
                create: estimate.comparables.map((c) => ({
                  platform: c.platform,
                  itemUrl: c.itemUrl,
                  price: new Prisma.Decimal(c.price),
                  currency: c.currency,
                  title: c.title.slice(0, 500),
                  thumbnail: c.thumbnail,
                })),
              },
            },
          },
        }),
      },
      include: scanInclude,
    });

    res.status(estimate ? 201 : 200).json({ data: toResponse(saved) });
  } catch (err) {
    if (scanId) {
      await prisma.scan
        .update({
          where: { id: scanId },
          data: {
            status: ScanStatus.FAILED,
            errorMessage: err instanceof Error ? err.message.slice(0, 500) : "Unknown error",
          },
        })
        .catch((e) => console.error("[analyze] failed to mark scan FAILED", e));
    }
    next(err);
  }
}
