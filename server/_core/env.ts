export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  pixApiUrl: process.env.PIX_API_URL ?? "",
  pixApiKey: process.env.PIX_API_KEY ?? "",
};

export function assertRuntimeConfig() {
  if (!ENV.isProduction) return;
  const missing = [
    !ENV.appId && "VITE_APP_ID",
    !ENV.cookieSecret && "JWT_SECRET",
    !ENV.databaseUrl && "DATABASE_URL",
    !process.env.ALLOWED_ORIGINS?.trim() && "ALLOWED_ORIGINS",
    !process.env.OBSERVABILITY_TOKEN?.trim() && "OBSERVABILITY_TOKEN",
  ].filter((value): value is string => Boolean(value));
  if (missing.length > 0) throw new Error(`Missing production configuration: ${missing.join(", ")}`);
}
