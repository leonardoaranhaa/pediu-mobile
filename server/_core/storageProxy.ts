import type { Express } from "express";
import { ENV } from "./env";
import { sdk } from "./sdk";

function isSafeStorageKey(key: string) {
  return key.length > 0 && key.length <= 512 && !key.includes("..") && !key.includes("\\") && !key.startsWith("/");
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key || !isSafeStorageKey(key)) {
      res.status(400).send("Invalid storage key");
      return;
    }

    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).send("Authentication required");
      return;
    }

    if (!key.startsWith(`voice/${user.id}/`)) {
      res.status(403).send("Storage object not authorized");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(503).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL("v1/storage/presign/get", ENV.forgeApiUrl.replace(/\/+$/, "") + "/");
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url?: string };
      if (!url || !/^https:\/\//i.test(url)) {
        res.status(502).send("Invalid signed URL from backend");
        return;
      }

      res.set("Cache-Control", "private, no-store");
      res.redirect(307, url);
    } catch {
      res.status(502).send("Storage proxy error");
    }
  });
}
