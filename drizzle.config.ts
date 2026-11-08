import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

function needsSsl(url: string): boolean {
  const host = new URL(url).hostname;
  return host !== "localhost" && host !== "127.0.0.1" && host !== "::1";
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: needsSsl(connectionString) ? "require" : false,
  },
});
