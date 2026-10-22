import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";

export async function listScans(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, "UNAUTHORIZED", "Authentication required.");

    const scans = await prisma.scan.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        valuation: {
          select: {
            estimatedLowPrice: true,
            estimatedHighPrice: true,
            medianPrice: true,
            currency: true,
            confidenceScore: true,
            suggestedEra: true,
          },
        },
      },
    });

    res.json({
      data: scans.map((s) => ({
        id: s.id,
        status: s.status,
        imageUrl: s.imageUrl,
        brand: s.brand,
        garmentType: s.garmentType,
        createdAt: s.createdAt.toISOString(),
        valuation: s.valuation
          ? {
              estimatedLowPrice: s.valuation.estimatedLowPrice.toNumber(),
              estimatedHighPrice: s.valuation.estimatedHighPrice.toNumber(),
              medianPrice: s.valuation.medianPrice.toNumber(),
              currency: s.valuation.currency,
              confidenceScore: s.valuation.confidenceScore,
              suggestedEra: s.valuation.suggestedEra,
            }
          : null,
      })),
    });
  } catch (err) {
    next(err);
  }
}
