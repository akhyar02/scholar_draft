import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url().optional(),
  AWS_REGION: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_S3_ENDPOINT: z.string().url().optional(),
  AWS_S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().email(),
});

let parsedEnv: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (!parsedEnv) {
    parsedEnv = envSchema.parse(process.env);
  }

  return parsedEnv;
}
