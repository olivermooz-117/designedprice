import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  GEMINI_API_KEY: z.string().min(10, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  DATABASE_URL: z.string().url(),
  SERPAPI_API_KEY: z.string().min(10),
  JWT_SECRET: z.string().min(16),
  ALLOWED_IMAGE_HOSTS: z.string().min(1),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  MAX_IMAGE_BYTES: z.coerce.number().default(8 * 1024 * 1024),
});

export const env = EnvSchema.parse(process.env);
