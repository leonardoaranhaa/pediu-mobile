export type PostgresConnectionOptions = {
  url: string;
  prepare: boolean;
  ssl: "require" | undefined;
  max: number;
  pooled: boolean;
};

export function postgresConnectionOptions(
  connectionString: string,
): PostgresConnectionOptions {
  const url = new URL(connectionString);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error(
      "DATABASE_URL precisa começar com postgresql://. Cole a connection string do Supabase.",
    );
  }
  const host = url.hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const sslMode = url.searchParams.get("sslmode");
  const pooled =
    url.port === "6543" ||
    url.searchParams.get("pgbouncer") === "true" ||
    host.includes("pooler.supabase.com");
  url.searchParams.delete("sslmode");
  url.searchParams.delete("pgbouncer");
  const ssl = !local && sslMode !== "disable" ? "require" : undefined;
  return {
    url: url.toString(),
    prepare: !pooled,
    ssl,
    max: 10,
    pooled,
  };
}
