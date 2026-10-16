import { env } from "../config/env";
import { AppError } from "../lib/errors";
import type { GarmentAnalysis } from "./GeminiVisionService";

export interface RawComp {
  platform: "EBAY" | "GOOGLE_SHOPPING";
  itemUrl: string;
  title: string;
  price: number;
  currency: string;
  thumbnail: string | null;
}

export interface CompProvider {
  fetchSoldComps(query: string, limit: number): Promise<RawComp[]>;
}

interface SerpApiEbayItem {
  title?: string;
  link?: string;
  thumbnail?: string;
  price?: { raw?: string; extracted?: number; from?: { extracted?: number } };
}
interface SerpApiEbayResponse {
  organic_results?: SerpApiEbayItem[];
  error?: string;
}

export class SerpApiEbayProvider implements CompProvider {
  async fetchSoldComps(query: string, limit: number): Promise<RawComp[]> {
    const params = new URLSearchParams({
      engine: "ebay",
      _nkw: query,
      LH_Sold: "1",
      LH_Complete: "1",
      _ipg: String(Math.min(limit, 100)),
      api_key: env.SERPAPI_API_KEY,
    });

    let res: Response;
    try {
      res = await fetch(`https://serpapi.com/search.json?${params}`, {
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      throw new AppError(502, "PRICING_UNAVAILABLE", "Pricing provider unreachable.", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
    if (!res.ok) {
      throw new AppError(502, "PRICING_UNAVAILABLE", `Pricing provider returned ${res.status}.`);
    }

    const data = (await res.json()) as SerpApiEbayResponse;
    if (data.error && !/hasn't returned any results/i.test(data.error)) {
      throw new AppError(502, "PRICING_UNAVAILABLE", "Pricing provider error.", data.error);
    }

    return (data.organic_results ?? []).flatMap((item): RawComp[] => {
      const price = item.price?.extracted ?? item.price?.from?.extracted;
      if (!item.link || !item.title || typeof price !== "number" || price <= 0) return [];
      return [{
        platform: "EBAY",
        itemUrl: item.link,
        title: item.title,
        price,
        currency: "USD",
        thumbnail: item.thumbnail ?? null,
      }];
    });
  }
}

export interface PriceEstimate {
  lowPrice: number;
  highPrice: number;
  medianPrice: number;
  currency: string;
  confidenceScore: number;
  queryUsed: string;
  queryTier: 1 | 2 | 3;
  comparables: RawComp[];
}

const MIN_COMPS = 5;
const EXCLUDE_RE = /\b(lot|bundle|reprint|replica|reproduction|sewing pattern|sticker|patch only)\b/i;

export class PricingService {
  constructor(private readonly provider: CompProvider = new SerpApiEbayProvider()) {}

  async estimate(analysis: GarmentAnalysis): Promise<PriceEstimate | null> {
    const tiers = this.buildQueryTiers(analysis);

    for (const [i, query] of tiers.entries()) {
      const raw = await this.provider.fetchSoldComps(query, 60);
      const comps = this.clean(raw, analysis.brand);
      if (comps.length >= MIN_COMPS || i === tiers.length - 1) {
        if (comps.length === 0) return null;
        const inliers = this.removeOutliers(comps);
        const prices = inliers.map((c) => c.price).sort((a, b) => a - b);
        const tier = Math.min(i + 1, 3) as 1 | 2 | 3;

        return {
          lowPrice: round2(percentile(prices, 0.25)),
          highPrice: round2(percentile(prices, 0.75)),
          medianPrice: round2(percentile(prices, 0.5)),
          currency: "USD",
          confidenceScore: this.blendConfidence(analysis.confidenceScore, inliers.length, tier),
          queryUsed: query,
          queryTier: tier,
          comparables: inliers.slice(0, 10),
        };
      }
    }
    return null;
  }

  private buildQueryTiers(a: GarmentAnalysis): string[] {
    const full = sanitizeQuery(a.searchQueryString);
    const noEra = sanitizeQuery(
      a.searchQueryString.replace(/\b(19|20)\d0s\b|\b(19|20)\d{2}(-(19|20)?\d{2})?\b/g, "")
    );
    const basic = sanitizeQuery(`${a.brand ?? ""} ${a.garmentType} vintage`);
    return [...new Set([full, noEra, basic])].filter((q) => q.length >= 3);
  }

  private clean(raw: RawComp[], brand: string | null): RawComp[] {
    const seen = new Set<string>();
    const brandToken = brand?.toLowerCase().split(/\s+/)[0];
    return raw.filter((c) => {
      if (seen.has(c.itemUrl) || EXCLUDE_RE.test(c.title)) return false;
      if (brandToken && !c.title.toLowerCase().includes(brandToken)) return false;
      seen.add(c.itemUrl);
      return true;
    });
  }

  private removeOutliers(comps: RawComp[]): RawComp[] {
    if (comps.length < 4) return comps;
    const sorted = comps.map((c) => c.price).sort((a, b) => a - b);
    const q1 = percentile(sorted, 0.25);
    const q3 = percentile(sorted, 0.75);
    const iqr = q3 - q1;
    return comps.filter((c) => c.price >= q1 - 1.5 * iqr && c.price <= q3 + 1.5 * iqr);
  }

  private blendConfidence(geminiConf: number, compCount: number, tier: 1 | 2 | 3): number {
    const countFactor = Math.min(compCount / 15, 1);
    const tierPenalty = tier === 1 ? 1 : tier === 2 ? 0.85 : 0.7;
    return round2(geminiConf * (0.4 + 0.6 * countFactor) * tierPenalty);
  }
}

function sanitizeQuery(q: string): string {
  return q.replace(/[^\p{L}\p{N}\s'&-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}
function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}
const round2 = (n: number) => Math.round(n * 100) / 100;
