/**
 * Authless remote MCP server for Naver content, on Cloudflare Workers.
 *
 * Speaks the Streamable HTTP transport that Claude's custom connectors use:
 * JSON-RPC 2.0 over POST, plus a GET SSE endpoint for clients that open one.
 * No auth, no API keys - Naver's public pages are scraped from the edge.
 */

import { NaverError } from "./naver.js";
import {
  naverBlogSearch,
  naverBlogRead,
  naverNewsSearch,
  naverNewsRead,
  naverCafeSearch,
  naverPlaceReviews,
} from "./tools.js";

const SERVER_INFO = { name: "naver-content-mcp", version: "1.0.0" };
const SUPPORTED_PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const DEFAULT_PROTOCOL = "2025-06-18";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Authorization",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
};

const TOOLS = [
  {
    name: "naver_blog_search",
    description:
      "네이버 블로그를 검색해 글 목록(제목 + URL)을 돌려준다. 본문이 필요하면 결과 URL을 naver_blog_read 에 넣어라. 네이버 오픈 API가 아니라 모바일 검색 페이지를 직접 스크랩한다.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "검색어 (한국어 권장)" },
        count: { type: "integer", description: "가져올 개수 (1-100, 기본 10)", minimum: 1, maximum: 100 },
        sort: { type: "string", enum: ["sim", "date"], description: "sim=정확도순(기본), date=최신순" },
      },
      required: ["query"],
    },
  },
  {
    name: "naver_blog_read",
    description:
      "네이버 블로그 글 하나의 본문 전체를 마크다운으로 읽어온다. blog.naver.com URL은 iframe 구조라 본문이 안 나오므로 자동으로 m.blog.naver.com 으로 변환해 요청한다. 스마트에디터 ONE(se-main-container)을 우선 처리하고 구버전 레이아웃도 폴백으로 지원한다.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "블로그 글 URL. blog.naver.com / m.blog.naver.com / PostView 링크 모두 가능",
        },
        max_chars: {
          type: "integer",
          description:
            "본문 최대 글자수 (기본 8000). 컨텍스트를 아끼려면 2000~3000, 전체가 필요하면 0(무제한). 잘린 경우 응답에 명시된다.",
          minimum: 0,
        },
      },
      required: ["url"],
    },
  },
  {
    name: "naver_news_search",
    description: "네이버 뉴스를 검색해 기사 목록(제목 + URL)을 돌려준다. 본문은 naver_news_read 로 읽는다.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "검색어" },
        count: { type: "integer", description: "가져올 개수 (1-100, 기본 10)", minimum: 1, maximum: 100 },
      },
      required: ["query"],
    },
  },
  {
    name: "naver_news_read",
    description: "네이버 뉴스 기사 하나의 본문 전체를 읽어온다 (n.news.naver.com 기사 URL).",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "네이버 뉴스 기사 URL" },
        max_chars: {
          type: "integer",
          description: "본문 최대 글자수 (기본 8000, 0이면 무제한). 잘린 경우 응답에 명시된다.",
          minimum: 0,
        },
      },
      required: ["url"],
    },
  },
  {
    name: "naver_cafe_search",
    description:
      "네이버 카페의 공개 글을 검색해 목록을 돌려준다. 로그인이 필요한 회원 전용 글은 접근하지 않는다.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "검색어" },
        count: { type: "integer", description: "가져올 개수 (1-100, 기본 10)", minimum: 1, maximum: 100 },
      },
      required: ["query"],
    },
  },
  {
    name: "naver_place_reviews",
    description:
      "네이버 플레이스(장소)에 대한 블로그 리뷰 글 목록을 돌려준다. 맛집/카페/숙소 후기를 모을 때 쓴다.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "장소명 (예: '성수동 카페', '제주 흑돼지')" },
        count: { type: "integer", description: "가져올 개수 (1-100, 기본 10)", minimum: 1, maximum: 100 },
      },
      required: ["query"],
    },
  },
];

const HANDLERS = {
  naver_blog_search: naverBlogSearch,
  naver_blog_read: naverBlogRead,
  naver_news_search: naverNewsSearch,
  naver_news_read: naverNewsRead,
  naver_cafe_search: naverCafeSearch,
  naver_place_reviews: naverPlaceReviews,
};

/** Turn an internal error into text that tells the model what to do next. */
function describeFailure(err) {
  if (err instanceof NaverError) {
    const hint =
      {
        BLOCKED:
          "네이버가 요청을 거부했습니다(차단/레이트리밋). 파싱 실패가 아닙니다. 잠시 후 다시 시도하거나 다른 글을 시도하세요.",
        PARSE_FAILED:
          "네이버 페이지는 정상적으로 받았지만 본문 영역을 찾지 못했습니다. 차단이 아니라 레이아웃 문제입니다.",
        NOT_FOUND: "해당 글이 존재하지 않거나 삭제/비공개 상태입니다.",
        BAD_INPUT: "입력값이 올바르지 않습니다.",
        TRANSPORT: "네트워크 요청 자체가 실패했습니다.",
        UPSTREAM: "네이버 서버가 오류를 반환했습니다.",
      }[err.kind] || "알 수 없는 오류입니다.";

    let out = `[${err.kind}] ${err.message}\n\n→ ${hint}`;
    if (err.detail?.trace) {
      out += `\n\n시도한 경로:\n${err.detail.trace
        .map((t) => `  - ${t.route}: ${t.result}${t.message ? ` (${t.message})` : ""}`)
        .join("\n")}`;
    }
    return out;
  }
  return `[INTERNAL] ${err?.message || String(err)}`;
}

async function callTool(name, args) {
  const fn = HANDLERS[name];
  if (!fn) {
    return { content: [{ type: "text", text: `[BAD_INPUT] Unknown tool: ${name}` }], isError: true };
  }
  try {
    const text = await fn(args || {});
    return { content: [{ type: "text", text }] };
  } catch (err) {
    return { content: [{ type: "text", text: describeFailure(err) }], isError: true };
  }
}

/* ------------------------------------------------------------- JSON-RPC */

const rpcResult = (id, result) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

async function handleRpc(msg) {
  const { id, method, params } = msg || {};

  switch (method) {
    case "initialize": {
      const asked = params?.protocolVersion;
      const version = SUPPORTED_PROTOCOLS.includes(asked) ? asked : DEFAULT_PROTOCOL;
      return rpcResult(id, {
        protocolVersion: version,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "네이버 블로그/뉴스/카페/플레이스 본문을 가져오는 서버입니다. 검색으로 URL을 찾고 read 도구로 본문을 읽으세요.",
      });
    }
    case "tools/list":
      return rpcResult(id, { tools: TOOLS });
    case "tools/call": {
      const res = await callTool(params?.name, params?.arguments);
      return rpcResult(id, res);
    }
    case "ping":
      return rpcResult(id, {});
    case "resources/list":
      return rpcResult(id, { resources: [] });
    case "prompts/list":
      return rpcResult(id, { prompts: [] });
    default:
      // Notifications carry no id and expect no reply.
      if (id === undefined || id === null) return null;
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });

const LANDING = `<!doctype html><meta charset="utf-8">
<title>Naver Content MCP</title>
<style>body{font:15px/1.7 system-ui,sans-serif;max-width:44rem;margin:3rem auto;padding:0 1.2rem}
code{background:#f3f4f6;padding:.15em .4em;border-radius:4px}</style>
<h1>Naver Content MCP</h1>
<p>Authless remote MCP server. Add this URL as a custom connector:</p>
<p><code id="u"></code></p>
<p>Tools: naver_blog_search, naver_blog_read, naver_news_search, naver_news_read,
naver_cafe_search, naver_place_reviews.</p>
<script>document.getElementById('u').textContent=location.origin+'/mcp'</script>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (path === "/health") {
      return json({ ok: true, server: SERVER_INFO, tools: TOOLS.map((t) => t.name) });
    }

    if (path === "/" && request.method === "GET") {
      return new Response(LANDING, { headers: { "Content-Type": "text/html; charset=utf-8", ...CORS } });
    }

    if (path === "/mcp" || path === "/sse") {
      // Some clients open an SSE stream first; keep it open and idle. All real
      // traffic goes over POST, which is what the Streamable HTTP spec allows.
      if (request.method === "GET") {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(": connected\n\n"));
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-store",
            Connection: "keep-alive",
            ...CORS,
          },
        });
      }

      if (request.method === "DELETE") return new Response(null, { status: 204, headers: CORS });

      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }

      let payload;
      try {
        payload = await request.json();
      } catch {
        return json(rpcError(null, -32700, "Parse error"), 400);
      }

      // A client may batch requests in an array.
      if (Array.isArray(payload)) {
        const out = [];
        for (const msg of payload) {
          const r = await handleRpc(msg);
          if (r) out.push(r);
        }
        return out.length ? json(out) : new Response(null, { status: 202, headers: CORS });
      }

      const response = await handleRpc(payload);
      if (!response) return new Response(null, { status: 202, headers: CORS });

      // Reply as SSE when the client asked for a stream, otherwise plain JSON.
      const accept = request.headers.get("Accept") || "";
      if (accept.includes("text/event-stream")) {
        const body = `event: message\ndata: ${JSON.stringify(response)}\n\n`;
        return new Response(body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-store",
            ...CORS,
          },
        });
      }
      return json(response);
    }

    return json({ error: "Not found", try: "/mcp" }, 404);
  },
};
