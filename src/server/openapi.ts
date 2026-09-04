import { API_CATALOG, type ApiId } from "@/server/catalog"

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
      summary: `List the ${API_CATALOG.length} Burgertown APIs and which APIs they depend on`,
      responses: { "200": { description: "API catalog" } },
    },
  }
  paths["/v1/sandbox"] = {
    post: {
      operationId: "resetSandbox",
      tags: ["Sandbox"],
      summary: "Reset in-memory store to the seeded Oak Street location",
      responses: { "200": { description: "Reset" } },
    },
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Burgertown",
      version: "1.0.0",
      description:
        "Restaurant APIs for Burgertown on Oak Street. Thirty-five resources covering the floor, menu, fulfillment, kitchen, delivery, rewards, payments, and back-office. Resource references (check_id, fulfillment_id, payment_id, and so on) are how these APIs connect.",
      contact: { name: "Burgertown", email: "hello@burgertown.dev" },
    },
    servers: [{ url: origin, description: "Burgertown Oak Street" }],
    tags: [
      ...API_CATALOG.map((api) => ({
        name: api.name,
        description: api.description,
        "x-api-id": api.id,
        "x-depends-on": api.dependsOn,
      })),
      { name: "Meta", description: "API index" },
      { name: "Sandbox", description: "Reset seeded store data" },
    ],
    "x-burgertown": {
      company: "Burgertown",
      kind: "restaurant",
      api_count: API_CATALOG.length,
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
          description: "Optional. Any string is accepted.",
        },
      },
    },
    security: [{ SandboxKey: [] }],
  }
}

export function isApiId(value: string): value is ApiId {
  return API_CATALOG.some((api) => api.id === value)
}
