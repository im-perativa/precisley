/**
 * Cloudflare Worker: static SPA + UTC day from the isolate clock
 * (not the visitor's device).
 */
export default {
  async fetch(request: Request, env: { ASSETS: Fetcher }): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/utc") {
      const now = new Date();
      return Response.json(
        { date: now.toISOString().slice(0, 10), utc: now.toISOString() },
        { headers: { "cache-control": "no-store" } },
      );
    }
    return env.ASSETS.fetch(request);
  },
};
