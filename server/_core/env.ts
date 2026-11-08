export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

export function adminEmailSet(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string): boolean {
  return adminEmailSet().has(email.trim().toLowerCase());
}

export function assertRuntimeConfig() {
  if (!ENV.isProduction) return;
  const missing = [
    !ENV.cookieSecret && "JWT_SECRET",
    !ENV.databaseUrl && "DATABASE_URL",
    !process.env.ALLOWED_ORIGINS?.trim() && "ALLOWED_ORIGINS",
    !process.env.OBSERVABILITY_TOKEN?.trim() && "OBSERVABILITY_TOKEN",
  ].filter((value): value is string => Boolean(value));
  if (missing.length > 0)
    throw new Error(`Missing production configuration: ${missing.join(", ")}`);
}
