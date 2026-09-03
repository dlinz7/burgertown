import {
  API_CATALOG,
  DEMO_FLOWS,
  apiGraph,
  blastRadius,
  type ApiId,
} from "@/server/catalog"

function opPathToOpenApi(path: string) {
  return path.replace(/{([^}]+)}/g, "{$1}")
}

export function buildOpenApi(origin = "http://127.0.0.1:43123") {
  const paths: Record<string, Record<string, unknown>> = {}

  for (const api of API_CATALOG) {
    for (const op of api.operations) {
      const path = opPathToOpenApi(op.path)
      paths[path] ??= {}
      const responses: Record<string, unknown> = {
        [String(op.successStatus)]: {
          description: "Success",
          content: {
            "application/json": {
              schema: { type: "object", additionalProperties: true },
            },
          },
        },
      }
      for (const failure of op.failures) {
        responses[String(failure.status)] = {
          description: `${failure.code}: ${failure.when}`,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        }
      }
      const params = [...path.matchAll(/{([^}]+)}/g)].map((match) => ({
        name: match[1],
        in: "path",
        required: true,
        schema: { type: "string" },
      }))
      paths[path][op.method.toLowerCase()] = {
        operationId: op.id,
        tags: [api.name],
        summary: op.summary,
        description: op.description,
        parameters: params,
        ...(op.method === "GET"
          ? {}
          : {
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: { type: "object", additionalProperties: true },
                  },
                },
              },
            }),
        responses,
        "x-burgertown-api": api.id,
        "x-depends-on": api.dependsOn,
      }
    }
  }

  paths["/v1/meta/apis"] = {
    get: {
      operationId: "listApis",
      tags: ["Meta"],
      summary: "List the 25 POS APIs",
      responses: { "200": { description: "API catalog" } },
    },
  }
  paths["/v1/meta/graph"] = {
    get: {
      operationId: "getGraph",
      tags: ["Meta"],
      summary: "Nodes and edges for blast-radius visualization",
      responses: { "200": { description: "Graph" } },
    },
  }
  paths["/v1/meta/flows"] = {
    get: {
      operationId: "listFlows",
      tags: ["Meta"],
      summary: "Demo workflows Atlas can generate against",
      responses: { "200": { description: "Flows" } },
    },
  }
  paths["/v1/meta/blast-radius/{api_id}"] = {
    get: {
      operationId: "getBlastRadius",
      tags: ["Meta"],
      summary: "APIs that break if this contract changes",
      parameters: [
        {
          name: "api_id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: { "200": { description: "Blast radius" } },
    },
  }
  paths["/v1/sandbox"] = {
    get: {
      operationId: "getSandbox",
      tags: ["Sandbox"],
      summary: "Sandbox flags including contract_drift",
      responses: { "200": { description: "Sandbox state" } },
    },
    post: {
      operationId: "updateSandbox",
      tags: ["Sandbox"],
      summary: "Toggle contract drift or reset fixtures",
      responses: { "200": { description: "Updated sandbox" } },
    },
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Burgertown POS",
      version: "1.0.0",
      description:
        "Fake POS company sandbox for Atlas. 25 interconnected APIs with success and failure fixtures. Import this contract into the Atlas marketplace.",
      contact: { name: "Burgertown Sandbox", email: "pos@burgertown.dev" },
    },
    servers: [{ url: origin, description: "Local sandbox" }],
    tags: [
      ...API_CATALOG.map((api) => ({
        name: api.name,
        description: api.description,
        "x-api-id": api.id,
        "x-depends-on": api.dependsOn,
        "x-blast-radius": blastRadius(api.id).dependents,
      })),
      { name: "Meta", description: "Catalog, graph, and demo flows" },
      { name: "Sandbox", description: "Reset fixtures and toggle contract drift" },
    ],
    "x-burgertown": {
      company: "Burgertown",
      kind: "pos",
      api_count: API_CATALOG.length,
      graph: apiGraph(),
      flows: DEMO_FLOWS,
    },
    paths,
    components: {
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                details: { type: "object", additionalProperties: true },
              },
            },
          },
        },
      },
      securitySchemes: {
        SandboxKey: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "Optional. Any string is accepted in the sandbox.",
        },
      },
    },
    security: [{ SandboxKey: [] }],
  }
}

export function isApiId(value: string): value is ApiId {
  return API_CATALOG.some((api) => api.id === value)
}
