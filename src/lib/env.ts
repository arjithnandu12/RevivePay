import { z } from "zod";

const optionalUrl = z.string().url().optional();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().min(1),
  APP_API_KEY: z.string().min(24).optional(),
  DEFAULT_TENANT_ID: z.string().min(1).default("default"),
  NEXT_PUBLIC_APP_URL: optionalUrl,
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
});

let cachedEnv: z.infer<typeof envSchema> | undefined;

export function getEnv() {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function isProduction() {
  return getEnv().NODE_ENV === "production";
}