import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { z } from "zod";
import { env } from "../config/env";
import { GeminiError } from "../lib/errors";

export const GarmentAnalysisSchema = z.object({
  evidence: z.object({
    labelTypography: z.string(),
    copyrightYear: z.number().int().min(1900).max(2100).nullable(),
    collarStitching: z.enum(["single", "double", "other", "not_visible"]),
    distressing: z.string(),
    garmentCues: z.string(),
  }),
  brand: z.string().nullable(),
  garmentType: z.string().min(1),
  estimatedEra: z.string().min(1),
  confidenceScore: z.number().min(0).max(1),
  searchQueryString: z.string().min(3).max(120),
});
export type GarmentAnalysis = z.infer<typeof GarmentAnalysisSchema>;

const GEMINI_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  propertyOrdering: [
    "evidence", "brand", "garmentType", "estimatedEra", "confidenceScore", "searchQueryString",
  ],
  properties: {
    evidence: {
      type: Type.OBJECT,
      propertyOrdering: [
        "labelTypography", "copyrightYear", "collarStitching", "distressing", "garmentCues",
      ],
      properties: {
        labelTypography: {
          type: Type.STRING,
          description: "Brand/laundry tag typography, fonts, layout, materials. 'not_visible' if absent.",
        },
        copyrightYear: {
          type: Type.INTEGER,
          nullable: true,
          description: "Year printed in a copyright line, or null if none visible.",
        },
        collarStitching: {
          type: Type.STRING,
          format: "enum",
          enum: ["single", "double", "other", "not_visible"],
        },
        distressing: {
          type: Type.STRING,
          description: "Fading, cracking prints, holes, stains, wash wear; or 'none observed'.",
        },
        garmentCues: {
          type: Type.STRING,
          description: "Cut, fabric, hardware, graphic style that indicate garment type.",
        },
      },
      required: ["labelTypography", "copyrightYear", "collarStitching", "distressing", "garmentCues"],
    },
    brand: { type: Type.STRING, nullable: true, description: "Brand, or null if it cannot be determined." },
    garmentType: { type: Type.STRING, description: "e.g. 'graphic t-shirt', 'bomber jacket', 'hoodie'." },
    estimatedEra: { type: Type.STRING, description: "Decade or range, e.g. '1990s' or '1994-1998'." },
    confidenceScore: { type: Type.NUMBER, description: "0.0 to 1.0. Be conservative." },
    searchQueryString: {
      type: Type.STRING,
      description: "Optimized e-commerce query: brand + era + garment + distinctive graphic/model. No filler words.",
    },
  },
  required: ["evidence", "brand", "garmentType", "estimatedEra", "confidenceScore", "searchQueryString"],
};

const SYSTEM_INSTRUCTION = `
You are an expert authenticator and appraiser of vintage, streetwear, and designer clothing.
You will receive ONE photo of a garment. Analyze ONLY what is visible.

You MUST explicitly inspect the image for each of these visual indicators and record what you see in the "evidence" object:
1. LAUNDRY / BRAND TAG TYPOGRAPHY: fonts, logo layout, care-label format, fiber content, country of manufacture, RN/CA numbers, tag material and color. Compare against known tag designs by era.
2. COPYRIGHT TEXT YEARS: any copyright line with a year (often at the print's hem or under the graphic). Treat as a lower bound for production date, not an exact date.
3. COLLAR STITCHING: single-stitch vs. double-stitch on collar, sleeve hems, and bottom hem. Single-stitch commonly indicates pre-mid-1990s production for tees; verify against other evidence.
4. OVERALL DISTRESSING: fading, cracked or peeling prints, thinning fabric, holes, repairs. Distinguish authentic age wear from artificial distressing.
5. GARMENT TYPE: precise category based on cut, fabric, and construction.

Rules:
- If an indicator is not visible, say so ("not_visible" / null). NEVER invent a tag, year, or stitching detail.
- Derive "estimatedEra" by combining indicators; when evidence conflicts, prefer the more recent plausible era.
- "brand" must be null if you cannot identify it with reasonable certainty.
- "confidenceScore" (0-1) reflects overall certainty: below 0.4 when no tag or identifying graphic is visible; above 0.8 only when multiple indicators agree.
- "searchQueryString" must be an optimized marketplace query, 4-10 words, in this order: brand, era, garment type, distinctive graphic/model/collab. No punctuation, no adjectives like "rare" or "amazing", no sizes.
- If the image is not clothing, return garmentType "unknown" with confidenceScore 0.
Return ONLY JSON matching the provided schema.
`.trim();

export interface ImagePayload {
  mimeType: string;
  base64: string;
}

export interface GeminiAnalysisResult {
  analysis: GarmentAnalysis;
  rawResponseText: string;
  model: string;
}

export class GeminiVisionService {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string = env.GEMINI_API_KEY, model: string = env.GEMINI_MODEL) {
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async analyzeGarment(image: ImagePayload): Promise<GeminiAnalysisResult> {
    const response = await this.withRetry(() =>
      this.client.models.generateContent({
        model: this.model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: image.mimeType, data: image.base64 } },
              { text: "Analyze this garment and return the JSON appraisal." },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: GEMINI_RESPONSE_SCHEMA,
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      })
    );

    const text = response.text;
    if (!text) {
      throw new GeminiError("Gemini returned no content (possibly blocked by safety filters).", {
        finishReason: response.candidates?.[0]?.finishReason,
        promptFeedback: response.promptFeedback,
      });
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch {
      throw new GeminiError("Gemini returned malformed JSON.", { text });
    }

    const result = GarmentAnalysisSchema.safeParse(parsedJson);
    if (!result.success) {
      throw new GeminiError("Gemini response failed schema validation.", result.error.flatten());
    }

    return { analysis: result.data, rawResponseText: text, model: this.model };
  }

  private async withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        const status = (err as { status?: number })?.status;
        const retryable = status === 429 || status === 500 || status === 503;
        if (!retryable || attempt === maxAttempts) break;
        const delay = 500 * 2 ** (attempt - 1) + Math.random() * 250;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new GeminiError("Gemini API request failed.", {
      message: lastErr instanceof Error ? lastErr.message : String(lastErr),
    });
  }
}
