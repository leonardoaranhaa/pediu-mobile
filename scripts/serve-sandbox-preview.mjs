import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(process.env.PREVIEW_ROOT ?? ".sandbox-preview");
const port = Number(process.env.PREVIEW_PORT ?? 8081);
const host = process.env.PREVIEW_HOST ?? "0.0.0.0";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  const relative = decoded.replace(/^\/+/, "");
  const candidate = path.resolve(root, relative);
  return candidate.startsWith(`${root}${path.sep}`) || candidate === root
    ? candidate
    : null;
}

function fileResponse(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    contentType: contentTypes[extension] ?? "application/octet-stream",
    body: fs.readFileSync(filePath),
  };
}

const server = http.createServer((request, response) => {
  try {
    const requested = safePath(request.url ?? "/");
    if (!requested) {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Invalid path");
      return;
    }

    let target = requested;
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      if (path.extname(target)) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }
      target = path.join(root, "index.html");
    }

    const { contentType, body } = fileResponse(target);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    console.error("[sandbox-preview] request failed", error);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Preview server error");
  }
});

server.listen(port, host, () => {
  console.log(`[sandbox-preview] serving ${root}`);
  console.log(`[sandbox-preview] listening on http://${host}:${port}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
