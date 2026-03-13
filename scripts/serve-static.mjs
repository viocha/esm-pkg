import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const host = "127.0.0.1";
const port = 4173;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

function resolveFilePath(urlPath) {
  const safePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(rootDir, safePath);

  if (filePath.endsWith(path.sep)) {
    filePath = path.join(filePath, "index.html");
  }

  return filePath;
}

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", `http://${host}:${port}`);
    const pathname = requestUrl.pathname === "/" ? "/examples/index.html" : requestUrl.pathname;
    const filePath = resolveFilePath(pathname);
    const stat = await fs.stat(filePath);
    const finalPath = stat.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const file = await fs.readFile(finalPath);
    const ext = path.extname(finalPath).toLowerCase();

    response.writeHead(200, {
      "Content-Type": contentTypes[ext] ?? "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    response.end(file);
  } catch {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`static server running at http://${host}:${port}`);
});
