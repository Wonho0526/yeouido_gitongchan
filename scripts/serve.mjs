import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

export function startServer(port = 0) {
  const server = http.createServer(async (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const relative = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
    const filePath = path.join(ROOT, relative);

    if (!filePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    try {
      const body = await fs.readFile(filePath);
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end("Not Found");
    }
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      resolve({ server, origin: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const { origin } = await startServer(Number(process.env.PORT) || 8080);
  console.log(`Serving ${ROOT} at ${origin}`);
}
