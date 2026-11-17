// Worker entry: the front door. It applies a rate limit, then routes /mcp
// to the MCP server. The web page at / is served from the public/ folder.
import { createMcpHandler } from "agents/mcp/server";
import { createServer } from "./server";

interface Env {
  RATE_LIMITER?: RateLimit;
}

const mcp = createMcpHandler(createServer, { route: "/mcp" });

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/mcp") {
      // One counter per caller address, so a stray loop cannot run up a bill.
      const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
      if (env.RATE_LIMITER) {
        const { success } = await env.RATE_LIMITER.limit({ key: ip });
        if (!success) {
          return new Response("Too many requests. Please wait a minute and try again.", {
            status: 429,
            headers: { "retry-after": "60" },
          });
        }
      }
      return mcp(request, env, ctx);
    }

    if (pathname === "/sse") {
      return new Response(
        "This server speaks Streamable HTTP only. Use the same address ending in /mcp instead of /sse.",
        { status: 404 }
      );
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
