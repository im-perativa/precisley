import { defineConfig, type PreviewServer, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";

function utcPayload(): string {
  const now = new Date();
  return JSON.stringify({ date: now.toISOString().slice(0, 10), utc: now.toISOString() });
}

function utcMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void): void {
  const path = req.url?.split("?")[0];
  if (path !== "/api/utc") {
    next();
    return;
  }
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(utcPayload());
}

function utcPlugin() {
  return {
    name: "precisley-utc-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(utcMiddleware);
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(utcMiddleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), utcPlugin()],
});
