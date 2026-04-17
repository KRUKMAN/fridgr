#!/usr/bin/env node

const requiredKeys = [
  "EXPO_PUBLIC_APP_ENV",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
];
const warningKeys = ["SENTRY_DSN"];

const missingRequired = requiredKeys.filter((key) => {
  const value = process.env[key];
  return typeof value !== "string" || value.trim().length === 0;
});

if (missingRequired.length > 0) {
  for (const key of missingRequired) {
    console.error(`[ci] Required environment variable is not set: ${key}`);
  }

  process.exit(1);
}

for (const key of warningKeys) {
  const value = process.env[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    console.warn(`[ci] Warning: optional environment variable is not set: ${key}`);
  }
}

console.log("[ci] Required environment variables are set.");
