/**
 * OpenAPI 3.0 specification for the Widgetly public API.
 *
 * Hand-maintained so the spec stays readable, stable, and decoupled
 * from the route handlers' internals. The route handlers' Zod
 * schemas (`src/lib/api/schemas.ts`) are the *runtime* contract;
 * this file is the *documentation* contract. The two are kept in
 * sync by review, not by code generation, because:
 *  - The Zod schemas are stricter than the docs need to be
 *    (e.g. the "strict()" rule rejects unknown fields — that's
 *    an implementation detail, not a user-facing API guarantee).
 *  - The OpenAPI doc needs prose, examples, and ordering that
 *    don't translate cleanly from Zod.
 *
 * Served at /api/openapi.json and consumed by the Swagger UI at
 * /docs.
 *
 * Last reviewed against the Zod schemas on 2026-06-13.
 */
export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Widgetly API",
    version: "1.0.0",
    summary: "Public HTTP API for the Widgetly tools platform.",
    description:
      "Widgetly exposes a small set of public HTTP endpoints for the homepage forms: the launch waitlist, the tool-suggestion intake, and the contact form. All endpoints accept JSON, return JSON, run on the Cloudflare Workers edge runtime, and require no authentication.",
    contact: {
      name: "Widgetly Engineering",
      email: "engineering@widgetly.tech",
      url: "https://widgetly.tech/contact",
    },
    license: {
      name: "Proprietary",
    },
  },
  servers: [
    { url: "https://widgetly.tech", description: "Production" },
    { url: "https://staging.widgetly.tech", description: "Staging" },
    { url: "http://localhost:3000", description: "Local development" },
  ],
  tags: [
    { name: "Waitlist", description: "Launch-waitlist signup." },
    { name: "Suggest", description: "Tool-suggestion intake for the public board." },
    { name: "Contact", description: "Contact-form submissions." },
    { name: "Meta", description: "Service metadata and documentation." },
  ],
  paths: {
    "/api/waitlist": {
      post: {
        tags: ["Waitlist"],
        operationId: "joinWaitlist",
        summary: "Join the launch waitlist",
        description:
          "Adds an email to the launch waitlist. The endpoint is idempotent at the application level — re-submitting the same email returns success without creating a duplicate. The returned `position` is a synthetic estimate until the WAITLIST KV binding is configured; see `/docs/deployment` for the switchover.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WaitlistRequest" },
              examples: {
                minimal: {
                  summary: "Minimum payload",
                  value: { email: "founder@acme.com" },
                },
                withAttribution: {
                  summary: "With source attribution",
                  value: { email: "founder@acme.com", source: "home" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Email added to the waitlist.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WaitlistResponse" },
                example: { ok: true, position: 8421, message: "You're on the list!" },
              },
            },
          },
          "400": {
            description: "Invalid input (missing or malformed email).",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
                example: {
                  ok: false,
                  error: {
                    code: "validation_error",
                    message: "Some fields didn't pass validation.",
                    fields: [{ path: "email", message: "Please enter a valid email address." }],
                  },
                },
              },
            },
          },
          "405": { $ref: "#/components/responses/MethodNotAllowed" },
        },
      },
    },
    "/api/suggest": {
      post: {
        tags: ["Suggest"],
        operationId: "submitSuggestion",
        summary: "Submit a tool suggestion",
        description:
          "Submits a tool suggestion to the public board. The response includes a server-minted id and a URL slug for the eventual per-suggestion landing page at `/suggest/{slug}`. If the optional `idempotencyKey` is supplied, re-posting the same key returns the original response without creating a duplicate.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SuggestRequest" },
              examples: {
                minimal: {
                  summary: "Minimum payload",
                  value: {
                    name: "PDF Summarizer",
                    description:
                      "Drop in a PDF, get a 5-bullet summary. Useful for long reports and contracts.",
                  },
                },
                full: {
                  summary: "Full payload",
                  value: {
                    name: "Markdown → PDF",
                    description:
                      "Convert a markdown file (or paste) into a styled PDF. Should support custom fonts and a print-CSS option.",
                    category: "Writing",
                    email: "founder@acme.com",
                    source: "form",
                    idempotencyKey: "client-7f8a9b2c",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Suggestion accepted.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuggestResponse" },
                example: {
                  ok: true,
                  id: "sg_a1b2c3d4e5",
                  slug: "markdown-pdf",
                  status: "pending_review",
                  message:
                    "Got it — your idea is in the queue. We'll review it within one business day.",
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "405": { $ref: "#/components/responses/MethodNotAllowed" },
        },
      },
    },
    "/api/suggestions": {
      get: {
        tags: ["Suggest"],
        operationId: "listSuggestions",
        summary: "List public suggestions",
        description:
          "Returns the public suggestion board with category/status filters, sort options, and 20-item pagination.",
        parameters: [
          { name: "category", in: "query", schema: { type: "string" } },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["in_review", "building", "live", "rejected"] },
          },
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["most_voted", "newest", "recently_built"] },
          },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Paginated suggestion board.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuggestionListResponse" },
              },
            },
          },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
      post: {
        tags: ["Suggest"],
        operationId: "createSuggestion",
        summary: "Create a public suggestion",
        description:
          "Creates a public suggestion, applies the 3-per-email-per-day D1 rate limit, and queues the received email notification.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SuggestionCreateRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Suggestion created.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuggestionCreateResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
    "/api/suggestions/{id}": {
      get: {
        tags: ["Suggest"],
        operationId: "getSuggestion",
        summary: "Get one public suggestion",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Suggestion detail.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuggestionCreateResponse" },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
    "/api/suggestions/{id}/upvote": {
      post: {
        tags: ["Suggest"],
        operationId: "upvoteSuggestion",
        summary: "Upvote a suggestion",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Vote count updated." },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Suggest"],
        operationId: "removeSuggestionUpvote",
        summary: "Remove an upvote",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Vote count updated." },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/contact": {
      post: {
        tags: ["Contact"],
        operationId: "submitContact",
        summary: "Send a contact-form message",
        description:
          "Submits a contact-form message. Returns a ticket number the user can quote in follow-up email. The team is paged via the configured webhook.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ContactRequest" },
              examples: {
                evaluation: {
                  summary: "Pre-sales evaluation",
                  value: {
                    name: "Jane Doe",
                    email: "jane@acme.com",
                    message:
                      "Hi — evaluating Widgetly for a 12-person team. Can we schedule a 30-minute call this week?",
                    referrer: "https://widgetly.tech/about",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Message received.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ContactResponse" },
                example: {
                  ok: true,
                  id: "ct_z9y8x7w6v5",
                  ticket: "WID-1042",
                  message: "Thanks — your message is in. We'll reply within one business day.",
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "405": { $ref: "#/components/responses/MethodNotAllowed" },
        },
      },
    },
    "/api/openapi.json": {
      get: {
        tags: ["Meta"],
        operationId: "getOpenApiSpec",
        summary: "Get the OpenAPI 3.0 specification",
        description:
          "Returns the machine-readable OpenAPI 3.0 JSON for this API. Self-describing; the same document drives the Swagger UI at `/docs`.",
        responses: {
          "200": {
            description: "The OpenAPI spec.",
            content: { "application/json": { schema: { type: "object" } } },
          },
        },
      },
    },
    "/docs": {
      get: {
        tags: ["Meta"],
        operationId: "getDocsPage",
        summary: "Interactive API documentation",
        description:
          "HTML page rendering the Swagger UI for this API. Use the *Try it out* button on any endpoint to send a real request to a server of your choice.",
        responses: {
          "200": {
            description: "The Swagger UI page.",
            content: { "text/html": { schema: { type: "string" } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      WaitlistRequest: {
        type: "object",
        required: ["email"],
        additionalProperties: false,
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "The email address to add to the waitlist. Lowercased server-side.",
            example: "founder@acme.com",
            maxLength: 254,
          },
          source: {
            type: "string",
            enum: ["home", "footer", "blog", "tools", "other"],
            description: "Where the user came from. Used for attribution; defaults to `other`.",
            default: "other",
          },
        },
      },
      WaitlistResponse: {
        type: "object",
        required: ["ok", "position", "message"],
        properties: {
          ok: { type: "boolean", enum: [true] },
          position: {
            type: "integer",
            minimum: 0,
            description:
              "Approximate queue position. Synthetic until the WAITLIST KV binding is enabled in `wrangler.toml`; after that, the value is the real counter.",
          },
          message: { type: "string", example: "You're on the list!" },
        },
      },
      SuggestRequest: {
        type: "object",
        required: ["name", "description"],
        additionalProperties: false,
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 80,
            description: "Name of the tool the user wants built.",
            example: "PDF Summarizer",
          },
          description: {
            type: "string",
            minLength: 1,
            maxLength: 2000,
            description: "What the tool does and why it's useful.",
          },
          category: {
            type: "string",
            minLength: 1,
            maxLength: 40,
            description: "Free-form category label. Optional.",
            example: "Writing",
          },
          email: {
            type: "string",
            format: "email",
            description: "Follow-up email. Optional. We never share it.",
            maxLength: 254,
          },
          source: {
            type: "string",
            enum: ["form", "homepage_widget", "footer", "other"],
            default: "form",
          },
          idempotencyKey: {
            type: "string",
            pattern: "^[A-Za-z0-9_-]{8,64}$",
            description:
              "Client-generated key. Re-posting the same key returns the original response.",
          },
        },
      },
      SuggestResponse: {
        type: "object",
        required: ["ok", "id", "slug", "status", "message"],
        properties: {
          ok: { type: "boolean", enum: [true] },
          id: {
            type: "string",
            description: "Server-side submission id.",
            example: "sg_a1b2c3d4e5",
          },
          slug: {
            type: "string",
            pattern: "^[a-z0-9-]+$",
            description:
              "URL slug for the future per-suggestion page at `/suggest/{slug}`. Derived from `name` if possible, otherwise from the id.",
          },
          status: {
            type: "string",
            enum: ["pending_review", "in_queue", "duplicate"],
            description:
              "Server-assigned status. `duplicate` is returned when an `idempotencyKey` matches a prior submission.",
          },
          message: { type: "string" },
        },
      },
      SuggestionCreateRequest: {
        type: "object",
        required: ["toolName", "description", "useCase", "category", "urgency", "email"],
        additionalProperties: false,
        properties: {
          toolName: { type: "string", minLength: 3, maxLength: 50, example: "PDF Summarizer" },
          description: { type: "string", minLength: 50, maxLength: 500 },
          useCase: { type: "string", minLength: 20, maxLength: 300 },
          category: {
            type: "string",
            enum: [
              "PDF",
              "Image",
              "SEO",
              "Dev",
              "AI",
              "Video",
              "Calculators",
              "Converters",
              "Writing",
              "Business",
              "Education",
            ],
          },
          urgency: { type: "string", enum: ["low", "medium", "high"] },
          email: { type: "string", format: "email", maxLength: 254 },
        },
      },
      Suggestion: {
        type: "object",
        required: [
          "id",
          "slug",
          "toolName",
          "description",
          "useCase",
          "category",
          "urgency",
          "status",
          "upvotes",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          id: { type: "integer" },
          slug: { type: "string" },
          toolName: { type: "string" },
          description: { type: "string" },
          useCase: { type: "string" },
          category: { type: "string" },
          urgency: { type: "string", enum: ["low", "medium", "high"] },
          status: { type: "string", enum: ["in_review", "building", "live", "rejected"] },
          upvotes: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          builtAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      SuggestionCreateResponse: {
        type: "object",
        required: ["ok", "suggestion"],
        properties: {
          ok: { type: "boolean", enum: [true] },
          suggestion: { $ref: "#/components/schemas/Suggestion" },
        },
      },
      SuggestionListResponse: {
        type: "object",
        required: ["ok", "suggestions", "total", "page", "pageSize", "totalPages"],
        properties: {
          ok: { type: "boolean", enum: [true] },
          suggestions: {
            type: "array",
            items: { $ref: "#/components/schemas/Suggestion" },
          },
          total: { type: "integer" },
          page: { type: "integer" },
          pageSize: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
      ContactRequest: {
        type: "object",
        required: ["name", "email", "message"],
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 1, maxLength: 80 },
          email: { type: "string", format: "email", maxLength: 254 },
          message: { type: "string", minLength: 10, maxLength: 2000 },
          referrer: {
            type: "string",
            format: "uri",
            maxLength: 2048,
            description: "URL the user was on when they opened the form. Optional.",
          },
        },
      },
      ContactResponse: {
        type: "object",
        required: ["ok", "id", "ticket", "message"],
        properties: {
          ok: { type: "boolean", enum: [true] },
          id: { type: "string", description: "Server-side message id.", example: "ct_z9y8x7w6v5" },
          ticket: {
            type: "string",
            description: "Display-friendly ticket number the user can quote in follow-ups.",
            example: "WID-1042",
          },
          message: { type: "string" },
        },
      },
      ApiError: {
        type: "object",
        required: ["ok", "error"],
        properties: {
          ok: { type: "boolean", enum: [false] },
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: {
                type: "string",
                description:
                  "Stable machine-readable error code. `validation_error` for input problems, `internal_error` for server faults, `method_not_allowed` for the wrong HTTP verb.",
                enum: ["validation_error", "method_not_allowed", "internal_error"],
              },
              message: {
                type: "string",
                description: "Human-readable message safe to show to the end user.",
              },
              fields: {
                type: "array",
                description: "Per-field errors when `code` is `validation_error`.",
                items: {
                  type: "object",
                  required: ["path", "message"],
                  properties: {
                    path: { type: "string", description: "Field path, dot-notation for nested." },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    responses: {
      ValidationError: {
        description: "One or more fields failed validation.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
            example: {
              ok: false,
              error: {
                code: "validation_error",
                message: "Some fields didn't pass validation.",
                fields: [{ path: "email", message: "Please enter a valid email address." }],
              },
            },
          },
        },
      },
      MethodNotAllowed: {
        description: "The endpoint doesn't support this HTTP verb.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
            example: {
              ok: false,
              error: {
                code: "method_not_allowed",
                message: "GET is not allowed on this endpoint.",
              },
            },
          },
        },
      },
      NotFound: {
        description: "The requested resource was not found.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
            example: {
              ok: false,
              error: { code: "not_found", message: "Suggestion not found." },
            },
          },
        },
      },
      RateLimited: {
        description: "The client hit a rate limit.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
            example: {
              ok: false,
              error: {
                code: "rate_limited",
                message: "You can submit up to 3 suggestions per email each day.",
              },
            },
          },
        },
      },
      ServiceUnavailable: {
        description: "Backing storage or service is unavailable.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
            example: {
              ok: false,
              error: {
                code: "d1_not_configured",
                message: "Suggestion storage is not configured.",
              },
            },
          },
        },
      },
    },
    securitySchemes: {
      // No auth today; this is here so adding a bearer / api-key
      // scheme later doesn't require an OpenAPI overhaul.
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "opaque",
        description: "Reserved for future per-endpoint authentication. Not currently used.",
      },
    },
  },
} as const;

export type OpenApiSpec = typeof openapiSpec;
