/**
 * Custom environment loader that prioritizes system environment variables
 * over .env file values. This ensures that Manus platform-injected variables
 * are not overridden by placeholder values in .env
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const profile = process.env.EAS_BUILD_PROFILE?.trim();
const envPaths = [
  profile && path.resolve(process.cwd(), `.env.${profile}.local`),
  path.resolve(process.cwd(), ".env"),
].filter(Boolean);

for (const envPath of envPaths) {
  if (!fs.existsSync(envPath)) continue;
  const envContent = fs.readFileSync(envPath, "utf8");
  const lines = envContent.split("\n");

  lines.forEach((line) => {
    // Skip comments and empty lines
    if (!line || line.trim().startsWith("#")) return;

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^['\"]|['\"]$/g, ""); // Remove quotes

      // Only set if not already defined in the system or a higher-priority file
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Map system variables to Expo public variables
const mappings = {
  VITE_APP_ID: "EXPO_PUBLIC_APP_ID",
  API_BASE_URL: "EXPO_PUBLIC_API_BASE_URL",
  VITE_OAUTH_PORTAL_URL: "EXPO_PUBLIC_OAUTH_PORTAL_URL",
  OAUTH_SERVER_URL: "EXPO_PUBLIC_OAUTH_SERVER_URL",
  OWNER_OPEN_ID: "EXPO_PUBLIC_OWNER_OPEN_ID",
  OWNER_NAME: "EXPO_PUBLIC_OWNER_NAME",
};

for (const [systemVar, expoVar] of Object.entries(mappings)) {
  if (process.env[systemVar] && !process.env[expoVar]) {
    process.env[expoVar] = process.env[systemVar];
  }
}
