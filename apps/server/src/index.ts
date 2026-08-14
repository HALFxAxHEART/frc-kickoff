import { env } from "./config/env";
import { createLogger } from "./lib/logger";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/context";

const logger = createLogger("server");

const WEB_DIST = new URL("../../web/dist", import.meta.url).pathname;

async function serveStatic(pathname: string): Promise<Response> {
  const filePath = pathname === "/" ? "/index.html" : pathname;
  const file = Bun.file(`${WEB_DIST}${filePath}`);
  if (await file.exists()) return new Response(file);

  // SPA fallback: unknown non-asset paths resolve to index.html so client-side routing takes over.
  const indexFile = Bun.file(`${WEB_DIST}/index.html`);
  if (await indexFile.exists()) return new Response(indexFile);

  return new Response("Not found", { status: 404 });
}

const server = Bun.serve({
  port: env.PORT,
  idleTimeout: 60,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    if (url.pathname.startsWith("/api/trpc")) {
      return fetchRequestHandler({
        endpoint: "/api/trpc",
        req,
        router: appRouter,
        createContext,
      });
    }

    return serveStatic(url.pathname);
  },
});

logger.info("server listening", { port: server.port, env: env.NODE_ENV });
