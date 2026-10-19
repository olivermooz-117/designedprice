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
You are an expert authenticator and market appraiser specializing in vintage, streetwear, and designer clothing (Supreme, Nike, BAPE, Stussy, Carhartt, band tees, sportswear, luxury ready-to-wear).

You will receive ONE photo of a garment (or a person wearing one). Analyze ONLY what is visible in the image.

You MUST explicitly inspect and record in the "evidence" object:
1. LAUNDRY / BRAND TAG TYPOGRAPHY: fonts, logo layout, care labels, fiber content, country of manufacture, RN/CA numbers, tag material/color. Match against known era-specific tag designs when possible.
2. COPYRIGHT / PRINT YEARS: any year in a copyright line or graphic. Treat as a lower bound for production date.
3. COLLAR / HEM STITCHING: single-stitch vs double-stitch (single-stitch often pre-mid-1990s on tees).
4. DISTRESSING & CONSTRUCTION: fading, cracked prints, thinning, holes, repairs — distinguish authentic age wear from artificial distressing.
5. GARMENT TYPE & SILHOUETTE: precise category (e.g. "box logo hoodie", "bomber jacket", "plaid catsuit", "graphic tee").

Brand identification rules (critical for streetwear):
- Look for logos, wordmarks, neck tags, sleeve hits, weave labels, and distinctive graphics/collabs.
- Prefer specific brand names (Supreme, Nike, Adidas, Carhartt WIP, Stussy, BAPE, Palace, Off-White, etc.) over null when reasonably confident.
- If the person is wearing the item and the brand is visible on the garment, extract it.
- Only set brand to null when there is truly no identifying mark.

searchQueryString rules (optimized for eBay / Grailed sold comps):
- Format: [brand] [era or year range] [garment type] [distinctive detail]
- Examples: "Supreme box logo hoodie 1990s", "Nike ACG jacket 2000s", "Carhartt Detroit jacket vintage", "pink plaid catsuit jumpsuit"
- 4–12 words, no filler ("rare", "authentic", "amazing"), no sizes, no punctuation.
- When brand is unknown, still produce a strong descriptive query (color + pattern + garment type).

confidenceScore:
- < 0.4 → no brand/tag/graphic visible
- 0.4–0.7 → partial signals
- > 0.8 → multiple agreeing indicators (tag + logo + era cues)

If the image is not clothing, return garmentType "unknown" and confidenceScore 0.
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
