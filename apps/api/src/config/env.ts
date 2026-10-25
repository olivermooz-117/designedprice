import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  GEMINI_API_KEY: z.string().min(10, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  DATABASE_URL: z.string().url(),
  SERPAPI_API_KEY: z.string().min(10),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  ALLOWED_IMAGE_HOSTS: z.string().min(1),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  PUBLIC_BASE_URL: z.string().optional(),
  MAX_IMAGE_BYTES: z.coerce.number().default(8 * 1024 * 1024),
  CORS_ORIGINS: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[config] Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

// Production-specific validation
if (env.NODE_ENV === "production") {
  const errors: string[] = [];

  if (!env.CORS_ORIGINS || env.CORS_ORIGINS.trim() === "") {
    errors.push("CORS_ORIGINS must be set in production (comma-separated allowed origins)");
  } else if (env.CORS_ORIGINS.split(",").some((o: string) => o.trim() === "*")) {
    errors.push("CORS_ORIGINS must not contain '*' in production");
  }

  if (!env.S3_BUCKET || !env.S3_PUBLIC_BASE_URL) {
    errors.push("S3_BUCKET and S3_PUBLIC_BASE_URL are required in production for durable image storage");
  }

  if (env.JWT_SECRET.length < 64) {
    errors.push("JWT_SECRET should be at least 64 characters in production");
  }

  if (env.ALLOWED_IMAGE_HOSTS.trim() === "*") {
    errors.push("ALLOWED_IMAGE_HOSTS must not be '*' in production");
  }

  if (!env.PUBLIC_BASE_URL || !env.PUBLIC_BASE_URL.startsWith("https://")) {
    errors.push("PUBLIC_BASE_URL must be set to an HTTPS URL in production");
  }

  if (errors.length > 0) {
    console.error("[config] Production configuration errors:");
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log("[config] Production configuration validated successfully");
}

export { env };
