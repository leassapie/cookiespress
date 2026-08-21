import * as pkg from "../../package.json";

interface RouteParam {
  name: string;
  in: "query" | "path";
  required: boolean;
  type?: string;
}

interface RouteDef {
  path: string;
  method: "get" | "post";
  summary: string;
  operationId: string;
  params?: RouteParam[];
  requestBody?: boolean;
}

const ROUTES: RouteDef[] = [
  // Health
  { path: "/", method: "get", summary: "Service health", operationId: "health" },
  { path: "/health", method: "get", summary: "Health check (no external calls)", operationId: "healthCheck" },

  // Aggregate
  { path: "/search/all", method: "get", summary: "Search all sources in parallel", operationId: "searchAll", params: [{ name: "key", in: "query", required: true }, { name: "page", in: "query", required: false, type: "integer" }] },

  // nhentai
  { path: "/nhentai/get", method: "get", summary: "Get nhentai gallery", operationId: "nhentaiGet", params: [{ name: "book", in: "query", required: true }] },
  { path: "/nhentai/search", method: "get", summary: "Search nhentai galleries", operationId: "nhentaiSearch", params: [{ name: "key", in: "query", required: true }, { name: "page", in: "query", required: false }, { name: "sort", in: "query", required: false }] },
  { path: "/nhentai/related", method: "get", summary: "Get nhentai related galleries", operationId: "nhentaiRelated", params: [{ name: "book", in: "query", required: true }] },
  { path: "/nhentai/random", method: "get", summary: "Get random nhentai gallery", operationId: "nhentaiRandom" },

  // hentaifox
  { path: "/hentaifox/get", method: "get", summary: "Get hentaifox gallery", operationId: "hentaifoxGet", params: [{ name: "book", in: "query", required: true }] },
  { path: "/hentaifox/search", method: "get", summary: "Search hentaifox galleries", operationId: "hentaifoxSearch", params: [{ name: "key", in: "query", required: true }, { name: "page", in: "query", required: false }] },
  { path: "/hentaifox/random", method: "get", summary: "Get random hentaifox gallery", operationId: "hentaifoxRandom" },

  // asmhentai
  { path: "/asmhentai/get", method: "get", summary: "Get asmhentai gallery", operationId: "asmhentaiGet", params: [{ name: "book", in: "query", required: true }] },
  { path: "/asmhentai/search", method: "get", summary: "Search asmhentai galleries", operationId: "asmhentaiSearch", params: [{ name: "key", in: "query", required: true }, { name: "page", in: "query", required: false }] },
  { path: "/asmhentai/random", method: "get", summary: "Get random asmhentai gallery", operationId: "asmhentaiRandom" },

  // hentai2read
  { path: "/hentai2read/get", method: "get", summary: "Get hentai2read gallery", operationId: "hentai2readGet", params: [{ name: "book", in: "query", required: true }] },
  { path: "/hentai2read/search", method: "get", summary: "Search hentai2read galleries", operationId: "hentai2readSearch", params: [{ name: "key", in: "query", required: true }] },

  // 3hentai
  { path: "/3hentai/get", method: "get", summary: "Get 3hentai gallery", operationId: "threeHentaiGet", params: [{ name: "book", in: "query", required: true }] },
  { path: "/3hentai/search", method: "get", summary: "Search 3hentai galleries", operationId: "threeHentaiSearch", params: [{ name: "key", in: "query", required: true }, { name: "page", in: "query", required: false }] },
  { path: "/3hentai/random", method: "get", summary: "Get random 3hentai gallery", operationId: "threeHentaiRandom" },

  // Redirect shortcuts
  { path: "/g/{id}", method: "get", summary: "Redirect to nhentai gallery", operationId: "redirectNhentai", params: [{ name: "id", in: "path", required: true }] },
  { path: "/h/{id}", method: "get", summary: "Redirect to hentaifox gallery", operationId: "redirectHentaifox", params: [{ name: "id", in: "path", required: true }] },
  { path: "/a/{id}", method: "get", summary: "Redirect to asmhentai gallery", operationId: "redirectAsmhentai", params: [{ name: "id", in: "path", required: true }] },

  // GraphQL
  { path: "/graphql", method: "post", summary: "GraphQL endpoint", operationId: "graphqlQuery", requestBody: true },
  { path: "/graphql", method: "get", summary: "GraphQL GET query", operationId: "graphqlPlayground", params: [{ name: "query", in: "query", required: false }] },

  // Docs
  { path: "/docs", method: "get", summary: "OpenAPI specification", operationId: "openapiDocument" },
  { path: "/playground", method: "get", summary: "Swagger UI playground", operationId: "swaggerPlayground" },
];

function routeToPathItem(route: RouteDef) {
  const item: Record<string, unknown> = {
    summary: route.summary,
    operationId: route.operationId,
    responses: { "200": { description: "Success" } },
  };

  if (route.params?.length) {
    item.parameters = route.params.map((p) => ({
      name: p.name,
      in: p.in,
      required: p.required,
      schema: { type: p.type || "string" },
    }));
  }

  if (route.requestBody) {
    item.requestBody = {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              query: { type: "string" },
              variables: { type: "object" },
            },
            required: ["query"],
          },
        },
      },
    };
  }

  return { [route.method]: item };
}

export const openAPISpec = {
  openapi: "3.0.0",
  info: {
    title: "JandaPress API",
    version: `${pkg.version}`,
    description: `${pkg.description}`,
    contact: {
      name: "sinkaroid",
      url: "https://github.com/sinkaroid/jandapress",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  paths: Object.fromEntries(
    ROUTES.map((route) => [route.path, routeToPathItem(route)])
  ),
} as const;