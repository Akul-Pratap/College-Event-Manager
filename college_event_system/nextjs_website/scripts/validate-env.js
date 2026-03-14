#!/usr/bin/env node

const required = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_KEY",
  "NEXT_PUBLIC_FLASK_API_URL",
  "NEXT_PUBLIC_APP_URL",
];

const recommended = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "RESEND_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "NOVU_API_KEY",
  "LOGSNAG_TOKEN",
  "OPENWEATHER_API_KEY",
];

if (process.env.SKIP_ENV_VALIDATION === "true") {
  console.log("[env] Skipping environment validation (SKIP_ENV_VALIDATION=true).");
  process.exit(0);
}

const shouldEnforce =
  process.env.CI === "true" ||
  process.env.VERCEL === "1" ||
  process.env.NODE_ENV === "production";

if (!shouldEnforce) {
  console.log("[env] Validation not enforced outside CI/production.");
  process.exit(0);
}

const missingRequired = required.filter((name) => !process.env[name]);
if (missingRequired.length > 0) {
  console.error("[env] Missing required environment variables:");
  for (const name of missingRequired) {
    console.error(` - ${name}`);
  }
  process.exit(1);
}

const missingRecommended = recommended.filter((name) => !process.env[name]);
if (missingRecommended.length > 0) {
  console.warn("[env] Missing recommended environment variables:");
  for (const name of missingRecommended) {
    console.warn(` - ${name}`);
  }
}

if (
  process.env.CI === "true" &&
  process.env.NEXT_PUBLIC_FLASK_API_URL &&
  /localhost|127\.0\.0\.1/i.test(process.env.NEXT_PUBLIC_FLASK_API_URL)
) {
  console.error(
    "[env] NEXT_PUBLIC_FLASK_API_URL points to localhost in CI. Set a production API URL."
  );
  process.exit(1);
}

console.log("[env] Environment validation passed.");
