import { closeDb } from "../server/db";

/** Smoke scripts that mint a session open the server pool. Close it and exit. */
export async function finishDatabaseScript() {
  try {
    await closeDb();
  } finally {
    process.exit(process.exitCode ?? 0);
  }
}
