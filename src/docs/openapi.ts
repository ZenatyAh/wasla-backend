export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Wasla Backend API",
    version: "1.0.0",
    description:
      "API documentation for Wasla backend including auth, posts, skills, chat, contract (exchange) lifecycle, notifications, and Socket.IO real-time events.",
  },
  servers: [
    {
      url: "https://wasla-backend.up.railway.app",
      description: "Production server",
    },
  ],
  tags: [
    {
      name: "System",
      description: "System status endpoints",
    },
    {
      name: "Auth",
      description:
        "Authentication and session endpoints. Refresh token cookie: production uses HttpOnly, SameSite=None, Secure; local development uses SameSite=Lax.",
    },
    {
      name: "User",
      description: "Authenticated user endpoints",
    },
    {
      name: "Posts",
      description: "Post management operations (create, read, update, delete, save)",
    },
    {
      name: "Chat",
      description:
        "1:1 post-linked conversations and messages. REST is the source of truth; Socket.IO delivers live updates.\n\n" +
        "**Message lifecycle:** `SENT` (on HTTP 201) → `DELIVERED` (recipient ack) → `READ` (recipient viewport ack). " +
        "Status transitions are batched server-side (500ms debounce).\n\n" +
        "**Idempotent sends:** `POST /conversations/{conversationId}/messages` requires `clientMessageId` (UUID). " +
        "Retrying the same UUID returns HTTP 200 with the existing message (no duplicate row).\n\n" +
        "**Socket.IO connection:** pass access JWT in `auth.token`. Engine heartbeat: ping every 10s, disconnect if no pong within 5s.\n\n" +
        "**Socket rooms (channels):**\n" +
        "- `user:{userId}` — auto-joined on connect; receives `notification:new` (all in-app notifications) and `chat:notification:new` (deprecated alias for chat only)\n" +
        "- `conversation:{conversationId}` — join via client event `chat:join`; receives chat message and presence events for that conversation\n\n" +
        "**Client → server events:** `chat:join`, `chat:leave`, `chat:messages:delivered`, `chat:messages:read` " +
        "(see `ChatMessagesDeliveredPayload`, `ChatMessagesReadPayload`).\n\n" +
        "**Server → client events:** `chat:message:new`, `chat:message:sent`, `chat:message:edited`, `chat:message:deleted`, " +
        "`chat:message:read`, `chat:messages:status`, `chat:presence:online`, `chat:presence:offline`, " +
        "`notification:new`, `chat:notification:new` (deprecated alias for `NEW_MESSAGE`), `chat:error` " +
        "(see corresponding `Chat*Event` schemas).",
    },
    {
      name: "Notifications",
      description:
        "In-app notifications for chat messages and contract lifecycle events. No email is sent for contract notifications.\n\n" +
        "**Real-time delivery:** server emits Socket.IO event `notification:new` on personal room `user:{userId}` (auto-joined on connect). " +
        "For `NEW_MESSAGE` only, a deprecated alias `chat:notification:new` is also emitted on the same room. " +
        "For contract lifecycle types, `contract:notification:new` is also emitted on the same room.\n\n" +
        "**REST inbox:** `GET /notifications` for history/pagination; `PATCH /notifications/:id/read` and `PATCH /notifications/read-all` for read state. " +
        "Call REST on app load and after reconnect to reconcile missed socket events.\n\n" +
        "**Contract notification types** (payload `data`: `{ contractId, contractEndDate, proposedEndDate, status }`):\n\n" +
        "| Operation | Type | Recipient |\n" +
        "|-----------|------|----------|\n" +
        "| `POST /exchanges/request` | `EXCHANGE_REQUESTED` | Provider |\n" +
        "| `PUT /exchanges/{id}/accept` | `EXCHANGE_ACCEPTED` | Requester |\n" +
        "| `PUT /exchanges/{id}/reject` | `EXCHANGE_REJECTED` | Requester |\n" +
        "| `PUT /exchanges/{id}/cancel` | `EXCHANGE_CANCELED` | Other party |\n" +
        "| `POST /exchanges/{id}/sessions` | `SESSION_RECORDED` | Requester |\n" +
        "| `PUT /exchanges/{id}/sessions/{sessionId}/confirm` | `SESSION_CONFIRMED` | Provider |\n" +
        "| `PUT /exchanges/{id}/sessions/{sessionId}/reject` | `SESSION_REJECTED` | Provider |\n" +
        "| `POST /exchanges/{id}/deadline` | `DEADLINE_PROPOSED` | Requester |\n" +
        "| `PUT /exchanges/{id}/deadline/approve` | `DEADLINE_APPROVED` | Provider |\n" +
        "| `PUT /exchanges/{id}/deadline/reject` | `DEADLINE_REJECTED` | Provider |\n" +
        "| Cron approaching deadline (hourly) | `DEADLINE_APPROACHING` | Both parties |\n" +
        "| Cron auto-resolve (every 15 min) | `CONTRACT_AUTO_RESOLVED` | Both parties |\n\n" +
        "**Chat notification types** (payload `data`: `{ conversationId, messageId, postId? }`):\n" +
        "`NEW_MESSAGE` (also `chat:notification:new`). `CONVERSATION_STARTED` is reserved for future use.\n\n" +
        "Notification persistence failures are logged but never block the triggering HTTP action.",
    },
    {
      name: "Profile",
      description: "User profile read and update endpoints",
    },
    {
      name: "Reviews",
      description: "Service exchange reviews and ratings",
    },
    {
      name: "Skills",
      description: "Platform skill catalog for registration and profile selection",
    },
    {
      name: "Exchanges",
      description:
        "Time-credit service exchange (contract) lifecycle with escrow: request, accept, reject, deliver, confirm, cancel, dispute, work sessions, and deadline extensions. " +
        "Most state transitions push an in-app notification via Socket.IO `notification:new` on room `user:{userId}` (see Notifications tag). " +
        "No notification is sent for deliver, whole-contract confirm, or dispute. Expired active contracts are auto-resolved every 15 minutes (cron) with `CONTRACT_AUTO_RESOLVED` sent to both parties. Approaching deadlines trigger `DEADLINE_APPROACHING` hourly when less than 24 hours remain.",
    },
    {
      name: "Wallet",
      description: "Authenticated wallet transaction history for the time-credit ledger",
    },
    {
      name: "Feed",
      description: "Personalized post feed proxied from the recommender service",
    },
    {
      name: "Internal",
      description:
        "Machine-to-machine endpoints protected by X-Internal-Token. Not for public clients.",
    },
  ],
  paths: {
    "/": {
      get: {
        tags: ["System"],
        summary: "API welcome endpoint",
        responses: {
          "200": {
            description: "Backend is running",
            content: {
              "application/json": {
                example: {
                  message: "Wasla backend is running , Ahmed Zenaty Here",
                },
              },
            },
          },
        },
      },
    },
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": {
                example: {
                  status: "ok",
                },
              },
            },
          },
        },
      },
    },
    "/docs": {
      get: {
        tags: ["System"],
        summary: "Swagger UI",
        description: "Serves the Swagger UI HTML page for browsing the API documentation.",
        responses: {
          "200": {
            description: "Swagger UI HTML",
            content: {
              "text/html": {
                schema: {
                  type: "string",
                },
                example: "<!doctype html><html>...</html>",
              },
            },
          },
        },
      },
    },
    "/docs/openapi.json": {
      get: {
        tags: ["System"],
        summary: "OpenAPI JSON",
        description: "Returns the OpenAPI specification used by the Swagger UI.",
        responses: {
          "200": {
            description: "OpenAPI specification",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                },
              },
            },
          },
        },
      },
    },
    "/docs/chat-frontend": {
      get: {
        tags: ["System"],
        summary: "Chat frontend integration guide (HTML)",
        description:
          "Serves the HTML chat integration guide for frontend developers (Socket.IO events, message lifecycle, idempotency).",
        responses: {
          "200": {
            description: "Chat frontend guide HTML",
            content: {
              "text/html": {
                schema: {
                  type: "string",
                },
                example: "<!doctype html><html>...</html>",
              },
            },
          },
        },
      },
    },
    "/me": {
      get: {
        tags: ["User"],
        summary: "Get authenticated user token payload",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Authenticated user payload",
            content: {
              "application/json": {
                example: {
                  message: "You are authenticated",
                  user: {
                    userId: "1",
                    iat: 1760000000,
                    exp: 1760000900,
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RegisterRequest",
              },
              example: {
                full_name: "Ahmed Zenaty",
                username: "ahmed_zenaty_test",
                email: "eng.ahmedzenaty@gmail.com",
                password: "OldPass@123",
                bio: "I am a test user for checking authentication and password reset flow in the Wasla backend application.",
                profile_image: "https://example.com/avatar.png",
                location: "Ramallah",
                offeredSkills: [
                  "Design",
                  "Writing",
                  "Cooking",
                  "Teaching",
                  "Translation",
                ],
                requiredSkills: [
                  "Coding",
                  "Marketing",
                  "Photography",
                  "Accounting",
                  "Gardening",
                ],
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "User registered. A httpOnly refreshToken cookie is also set.",
            headers: {
              "Set-Cookie": {
                schema: { type: "string" },
                example:
                  "refreshToken=eyJhbGciOiJIUzI1NiIs...; HttpOnly; SameSite=None; Secure",
              },
            },
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AuthResponse",
                },
                example: {
                  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                  user: {
                    id: 1,
                    email: "eng.ahmedzenaty@gmail.com",
                    username: "ahmed_zenaty_test",
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/BadRequest",
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login with email and password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginRequest",
              },
              example: {
                email: "eng.ahmedzenaty@gmail.com",
                password: "OldPass@123",
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Login successful. A httpOnly refreshToken cookie is also set.",
            headers: {
              "Set-Cookie": {
                schema: { type: "string" },
                example:
                  "refreshToken=eyJhbGciOiJIUzI1NiIs...; HttpOnly; SameSite=None; Secure",
              },
            },
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AuthResponse",
                },
                example: {
                  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                  user: {
                    id: 1,
                    email: "eng.ahmedzenaty@gmail.com",
                    username: "ahmed_zenaty_test",
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/BadRequest",
          },
          "429": {
            $ref: "#/components/responses/TooManyRequests",
          },
        },
      },
    },
    "/auth/forget-password": {
      post: {
        tags: ["Auth"],
        summary: "Request a password reset email",
        description:
          "Always returns the same success message so the API does not reveal whether an email exists.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ForgotPasswordRequest",
              },
              example: {
                email: "eng.ahmedzenaty@gmail.com",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Reset email request accepted",
            content: {
              "application/json": {
                example: {
                  message: "If the email exists, we sent a reset link",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/BadRequest",
          },
          "429": {
            $ref: "#/components/responses/TooManyRequests",
          },
        },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password using email token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ResetPasswordRequest",
              },
              example: {
                token:
                  "10f906d0b5ff842931c6f91567c43fef0c7afb85104539d06a27213061e84cf5",
                newPassword: "NewPass@123",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password reset successful",
            content: {
              "application/json": {
                example: {
                  message: "Password reset successfully",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/BadRequest",
          },
          "429": {
            $ref: "#/components/responses/TooManyRequests",
          },
        },
      },
    },
    "/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "Change password for authenticated user",
        description:
          "Requires the current password. Invalidates all refresh sessions after a successful change.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ChangePasswordRequest",
              },
              example: {
                currentPassword: "OldPass@123",
                newPassword: "NewPass@456",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password changed successfully",
            content: {
              "application/json": {
                example: {
                  message: "Password changed successfully",
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/Unauthorized",
          },
          "400": {
            $ref: "#/components/responses/BadRequest",
          },
          "429": {
            $ref: "#/components/responses/TooManyRequests",
          },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotate refresh token and issue a new access token",
        description:
          "Reads the refreshToken from the httpOnly cookie. For manual testing, send a Cookie header.",
        parameters: [
          {
            name: "Cookie",
            in: "header",
            required: false,
            schema: {
              type: "string",
            },
            example: "refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        ],
        responses: {
          "200": {
            description:
              "Refresh successful. A rotated httpOnly refreshToken cookie is also set.",
            headers: {
              "Set-Cookie": {
                schema: { type: "string" },
                example:
                  "refreshToken=eyJhbGciOiJIUzI1NiIs...; HttpOnly; SameSite=None; Secure",
              },
            },
            content: {
              "application/json": {
                example: {
                  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                },
              },
            },
          },
          "403": {
            description: "Refresh failed",
            content: {
              "application/json": {
                example: {
                  status: "fail",
                  message: "Invalid or expired refresh token",
                },
              },
            },
          },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout current refresh-token session",
        description:
          "Deletes the matching session from the database and clears refresh token cookies. Always returns 204.",
        parameters: [
          {
            name: "Cookie",
            in: "header",
            required: false,
            schema: {
              type: "string",
            },
            example: "refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        ],
        responses: {
          "204": {
            description: "Logged out or already logged out",
          },
        },
      },
    },
    "/posts": {
      post: {
        tags: ["Posts"],
        summary: "Create a new post",
        description: "Create a new post with title, description, category, and time credits. Requires authentication.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreatePostRequest",
              },
              example: {
                title: "Need help with web development",
                description: "I need someone to help me build a responsive React website. Looking for someone with 5+ years of experience in frontend development.",
                category: "REQUEST",
                serviceMode: "ONLINE",
                assignedTimeCredits: 50,
                status: "PUBLISHED",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Post created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PostResponse",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/BadRequest",
          },
          "401": {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },
      get: {
        tags: ["Posts"],
        summary: "List published posts",
        description:
          "Retrieve published posts with cursor-based pagination. No authentication required.",
        parameters: [
          { name: "cursor", in: "query", schema: { type: "integer" } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 50 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated list of published posts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PostListResponse" },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/BadRequest",
          },
        },
      },
    },
    "/posts/me": {
      get: {
        tags: ["Posts"],
        summary: "List my posts",
        description:
          "Retrieve posts created by the authenticated user with cursor-based pagination.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "cursor", in: "query", schema: { type: "integer" } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 50 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated list of user's posts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PostListResponse" },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/Unauthorized",
          },
          "400": {
            $ref: "#/components/responses/BadRequest",
          },
        },
      },
    },
    "/posts/saved": {
      get: {
        tags: ["Posts"],
        summary: "List saved posts",
        description:
          "Retrieve posts saved by the authenticated user with cursor-based pagination.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "cursor", in: "query", schema: { type: "integer" } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 50 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated list of saved posts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SavedPostListResponse" },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/Unauthorized",
          },
          "400": {
            $ref: "#/components/responses/BadRequest",
          },
        },
      },
    },
    "/posts/search": {
      post: {
        tags: ["Posts"],
        summary: "Search published posts",
        description:
          "Semantic search over published posts via the recommender when available. Falls back to database text search on title and description when the recommender is disabled or unavailable.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SearchPostsRequest" },
              example: {
                query: "سباك في القاهرة",
                topK: 10,
                threshold: 0.5,
                filters: {
                  category: "OFFER",
                  serviceMode: "ONLINE",
                  minCredits: 5,
                  maxCredits: 20,
                  location: "القاهرة",
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Search results",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PostSearchResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/posts/{postId}": {
      get: {
        tags: ["Posts"],
        summary: "Get post by ID",
        description: "Retrieve a specific post by its ID. Requires authentication.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "postId",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
            example: 1,
          },
        ],
        responses: {
          "200": {
            description: "Post details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    post: {
                      $ref: "#/components/schemas/Post",
                    },
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/Unauthorized",
          },
          "404": {
            description: "Post not found",
            content: {
              "application/json": {
                example: {
                  status: "fail",
                  message: "Post not found",
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Posts"],
        summary: "Update post",
        description: "Update specific fields of a post. Only the post owner can update. At least one field is required.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "postId",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
            example: 1,
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdatePostRequest",
              },
              example: {
                title: "Updated: Need help with web development",
                assignedTimeCredits: 75,
                status: "DRAFT",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Post updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    post: {
                      $ref: "#/components/schemas/Post",
                    },
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/BadRequest",
          },
          "401": {
            $ref: "#/components/responses/Unauthorized",
          },
          "404": {
            description: "Post not found",
            content: {
              "application/json": {
                example: {
                  status: "fail",
                  message: "Post not found",
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Posts"],
        summary: "Delete post",
        description: "Delete a post. Only the post owner can delete their posts.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "postId",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
            example: 1,
          },
        ],
        responses: {
          "204": {
            description: "Post deleted successfully",
          },
          "401": {
            $ref: "#/components/responses/Unauthorized",
          },
          "403": {
            description: "Not the post owner",
            content: {
              "application/json": {
                example: {
                  status: "fail",
                  message: "You can only delete your own posts",
                },
              },
            },
          },
          "404": {
            description: "Post not found",
            content: {
              "application/json": {
                example: {
                  status: "fail",
                  message: "Post not found",
                },
              },
            },
          },
        },
      },
    },
    "/posts/{postId}/save": {
      post: {
        tags: ["Posts"],
        summary: "Save a post",
        description: "Add a post to the authenticated user's saved posts.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "postId",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
            example: 1,
          },
        ],
        responses: {
          "201": {
            description: "Post saved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    savedPost: {
                      $ref: "#/components/schemas/SavedPost",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Failed to save post",
            content: {
              "application/json": {
                example: {
                  status: "fail",
                  message: "Save post failed",
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },
      delete: {
        tags: ["Posts"],
        summary: "Unsave a post",
        description: "Remove a post from the authenticated user's saved posts.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "postId",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
            example: 1,
          },
        ],
        responses: {
          "200": {
            description: "Post unsaved successfully",
            content: {
              "application/json": {
                example: {
                  message: "Post unsaved successfully",
                },
              },
            },
          },
          "400": {
            description: "Failed to unsave post",
            content: {
              "application/json": {
                example: {
                  status: "fail",
                  message: "Unsave post failed",
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },
    },
    "/conversations": {
      post: {
        tags: ["Chat"],
        summary: "Start or reuse a post-linked conversation",
        description:
          "Creates or reuses a 1:1 conversation tied to a post. For profile messaging without a post, use `POST /conversations/direct`.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateConversationRequest" },
              example: { postId: 1 },
            },
          },
        },
        responses: {
          "201": {
            description: "Conversation created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConversationResponse" },
              },
            },
          },
          "200": {
            description: "Existing conversation reused",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConversationResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { description: "Post or recipient not found" },
        },
      },
      get: {
        tags: ["Chat"],
        summary: "List conversations for current user",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": {
            description: "Paginated conversations",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConversationListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/conversations/direct": {
      post: {
        tags: ["Chat"],
        summary: "Start or reuse a direct conversation",
        description:
          "Creates or reuses a 1:1 conversation between the authenticated user and `recipientId` without linking to a post.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateDirectConversationRequest" },
              example: { recipientId: 2 },
            },
          },
        },
        responses: {
          "201": {
            description: "Direct conversation created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConversationResponse" },
              },
            },
          },
          "200": {
            description: "Existing direct conversation reused",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConversationResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { description: "Recipient not found" },
        },
      },
    },
    "/conversations/{conversationId}": {
      get: {
        tags: ["Chat"],
        summary: "Get conversation details",
        description:
          "Returns conversation metadata including participant presence (`is_online`, `last_seen`) and unread count.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "conversationId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Conversation details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConversationResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Conversation not found" },
        },
      },
    },
    "/conversations/{conversationId}/messages": {
      get: {
        tags: ["Chat"],
        summary: "List messages",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "conversationId", in: "path", required: true, schema: { type: "string" } },
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 30 } },
        ],
        responses: {
          "200": {
            description: "Paginated messages",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Chat"],
        summary: "Send a message",
        description:
          "Persists a message with status `SENT` and returns immediately. Side effects (socket broadcast, notifications, email) run asynchronously. " +
          "Supply a client-generated `clientMessageId` (UUID) before sending; retries with the same ID return HTTP 200 without creating a duplicate.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "conversationId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SendMessageRequest" },
              example: {
                body: "مرحباً، هل الخدمة متاحة؟",
                clientMessageId: "550e8400-e29b-41d4-a716-446655440000",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "New message created with status SENT",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          "200": {
            description: "Idempotent retry — existing message returned (same clientMessageId)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "409": {
            description: "clientMessageId already used for a different conversation or sender",
          },
          "429": { $ref: "#/components/responses/TooManyRequests" },
        },
      },
    },
    "/messages/{messageId}": {
      patch: {
        tags: ["Chat"],
        summary: "Edit own message",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "messageId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EditMessageRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Message updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      delete: {
        tags: ["Chat"],
        summary: "Soft-delete own message",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "messageId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Message soft-deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/messages/{messageId}/read": {
      post: {
        tags: ["Chat"],
        summary: "Mark message as read",
        description:
          "Records a read receipt and transitions message status to `READ`. Also emits `chat:message:read` and `chat:messages:status` via Socket.IO. " +
          "For bulk/read-on-viewport flows, prefer emitting `chat:messages:read` over the socket.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "messageId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Read receipt recorded and message status updated to READ",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReadReceiptResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Message not found" },
        },
      },
    },
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List notifications",
        description:
          "Paginated inbox history. For real-time delivery, listen for Socket.IO event `notification:new` on room `user:{userId}` " +
          "(auto-joined on connect). Call this endpoint on app load, pull-to-refresh, and after reconnect to reconcile missed events. " +
          "Contract notifications include `data.contractId`, `data.contractEndDate`, `data.proposedEndDate`, and `data.status`; chat notifications include `data.conversationId` and `data.messageId`.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "cursor", in: "query", schema: { type: "string" } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 50 },
          },
        ],
        responses: {
          "200": {
            description: "Notification list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/NotificationListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        description:
          "Also available at `PATCH /notifications/all/read` for clients that follow the same `/:id/read` path pattern.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "All notifications marked as read",
            content: {
              "application/json": {
                example: { message: "All notifications marked as read" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/notifications/all/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read (alias)",
        description: "Alias of `PATCH /notifications/read-all`.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "All notifications marked as read",
            content: {
              "application/json": {
                example: { message: "All notifications marked as read" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark one notification as read",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Notification marked as read",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/NotificationResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { description: "Notification not found" },
        },
      },
    },
    "/users/search": {
      post: {
        tags: ["Profile"],
        summary: "Search users",
        description:
          "Search active users by name, username, bio, location, or skill names. Results are matched in the database (the recommender does not expose user search).",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SearchUsersRequest" },
              example: {
                query: "مطور React",
                topK: 10,
                filters: {
                  skillType: "OFFER",
                  location: "الإسكندرية",
                  isOnline: true,
                  isVerified: true,
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User search results",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserSearchResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/users/account": {
      delete: {
        tags: ["Profile"],
        summary: "Delete current user account",
        description:
          "Soft-deletes the authenticated account after password confirmation. Anonymizes PII, invalidates all sessions, and clears the refresh token cookie. Blocked when credits are held in escrow or active service exchanges exist.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DeleteAccountRequest" },
              example: {
                password: "OldPass@123",
              },
            },
          },
        },
        responses: {
          "204": {
            description: "Account deleted. Refresh token cookie cleared.",
          },
          "400": {
            description: "Validation error or account already deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  status: "fail",
                  message: "Account already deleted",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized or invalid password",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  status: "fail",
                  message: "Invalid password",
                },
              },
            },
          },
          "409": {
            description: "Active exchanges or escrow balance",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  status: "fail",
                  message: "Cannot delete account with active service exchanges",
                },
              },
            },
          },
        },
      },
    },
    "/users/profile": {
      put: {
        tags: ["Profile"],
        summary: "Update current user profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProfileRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BasicProfileResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/users/{id}/profile": {
      get: {
        tags: ["Profile"],
        summary: "Get user profile with stats and recent exchanges",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "User profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FullProfileResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { description: "User not found" },
        },
      },
    },
    "/users/{id}/reviews": {
      get: {
        tags: ["Reviews"],
        summary: "List reviews received by a user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          { name: "cursor", in: "query", schema: { type: "integer" } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 50 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated review list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReviewListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { description: "User not found" },
        },
      },
    },
    "/reviews": {
      post: {
        tags: ["Reviews"],
        summary: "Submit a review for a completed service exchange",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateReviewRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Review created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReviewResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Service exchange not found" },
          "409": { description: "Duplicate review" },
        },
      },
    },
    "/skills": {
      get: {
        tags: ["Skills"],
        summary: "List approved skills",
        description:
          "Returns all approved skills ordered by name. Optionally filter by category.",
        parameters: [
          {
            name: "category",
            in: "query",
            required: false,
            schema: { $ref: "#/components/schemas/SkillCategory" },
            description: "Filter skills by category",
          },
        ],
        responses: {
          "200": {
            description: "Approved skill list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SkillListResponse" },
                example: {
                  skills: [
                    {
                      id: 1,
                      name: "Web Development",
                      category: "TECHNICAL",
                      isApproved: true,
                    },
                    {
                      id: 2,
                      name: "Translation",
                      category: "GENERAL",
                      isApproved: true,
                    },
                  ],
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
        },
      },
      post: {
        tags: ["Skills"],
        summary: "Create a new skill",
        description:
          "Adds a skill to the platform catalog. Duplicate names (case-insensitive) return 409.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateSkillRequest" },
              example: {
                name: "Data Analysis",
                category: "TECHNICAL",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Skill created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SkillResponse" },
                example: {
                  skill: {
                    id: 7,
                    name: "Data Analysis",
                    category: "TECHNICAL",
                    isApproved: true,
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "409": {
            description: "Skill already exists",
            content: {
              "application/json": {
                example: {
                  status: "fail",
                  message: "Skill already exists",
                },
              },
            },
          },
        },
      },
    },
    "/exchanges/request": {
      post: {
        tags: ["Exchanges"],
        summary: "Request a service exchange (create contract)",
        description:
          "Creates a PENDING contract. No time credits are deducted at this stage. The requester is the authenticated user; you cannot request a service from yourself, and you must currently hold at least `duration` available credits. " +
          "Pushes `EXCHANGE_REQUESTED` to the provider via Socket.IO `notification:new` on room `user:{userId}`.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateExchangeRequest" },
              example: {
                postId: 1,
                providerId: 2,
                duration: 3,
                contractEndDate: "2026-07-01T00:00:00.000Z",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Contract created in PENDING state",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    exchange: { $ref: "#/components/schemas/Exchange" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { description: "Post or provider not found" },
        },
      },
    },
    "/exchanges": {
      get: {
        tags: ["Exchanges"],
        summary: "List my contracts (as requester or provider)",
        description:
          "Returns the authenticated user's contracts with offset pagination. Filter by role and status.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "role",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["provider", "requester"] },
            description: "Restrict to contracts where the user is the provider or the requester. Omit for either.",
          },
          {
            name: "status",
            in: "query",
            required: false,
            schema: { $ref: "#/components/schemas/ExchangeStatus" },
          },
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated list of contracts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ExchangeListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/exchanges/{id}": {
      get: {
        tags: ["Exchanges"],
        summary: "Get a contract by ID",
        description: "Only a participant (requester or provider) may view the contract.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          "200": {
            description: "Contract details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    exchange: { $ref: "#/components/schemas/Exchange" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Exchange not found" },
        },
      },
    },
    "/exchanges/{id}/accept": {
      put: {
        tags: ["Exchanges"],
        summary: "Accept a contract (provider only)",
        description:
          "Provider-only. The contract must be PENDING. Runs in a serializable transaction: re-checks the requester's available credits, then deducts `duration` from available and moves it into escrow (HELD). Fails if the requester no longer has enough credits. " +
          "Pushes `EXCHANGE_ACCEPTED` to the requester via Socket.IO `notification:new` on room `user:{userId}`.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          "200": {
            description: "Contract moved to IN_PROGRESS with escrow HELD",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    exchange: { $ref: "#/components/schemas/Exchange" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Not pending, or requester has insufficient credits",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Exchange not found" },
          "409": { description: "Contract is no longer pending (concurrent change)" },
        },
      },
    },
    "/exchanges/{id}/reject": {
      put: {
        tags: ["Exchanges"],
        summary: "Reject a contract (provider only)",
        description:
          "Provider-only. The contract must be PENDING. No credit changes. " +
          "Pushes `EXCHANGE_REJECTED` to the requester via Socket.IO `notification:new` on room `user:{userId}`.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          "200": {
            description: "Contract moved to REJECTED",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    exchange: { $ref: "#/components/schemas/Exchange" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Exchange not found" },
        },
      },
    },
    "/exchanges/{id}/deliver": {
      put: {
        tags: ["Exchanges"],
        summary: "Mark a contract as delivered (provider only)",
        description:
          "Provider-only. The contract must be IN_PROGRESS. Moves it to WAITING_CONFIRMATION. Credits remain frozen in escrow. No notification is sent.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          "200": {
            description: "Contract moved to WAITING_CONFIRMATION",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    exchange: { $ref: "#/components/schemas/Exchange" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Exchange not found" },
        },
      },
    },
    "/exchanges/{id}/confirm": {
      put: {
        tags: ["Exchanges"],
        summary: "Confirm delivery (requester only)",
        description:
          "Requester-only. The contract must be WAITING_CONFIRMATION. Runs in a serializable transaction: releases escrow from the requester, credits the provider, increments both users' service stats, writes a TRANSFER ledger entry, and sets the contract to COMPLETED / escrow RELEASED. No notification is sent.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          "200": {
            description: "Contract COMPLETED, credits transferred to provider",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    exchange: { $ref: "#/components/schemas/Exchange" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Exchange not found" },
          "409": { description: "Contract is no longer awaiting confirmation" },
        },
      },
    },
    "/exchanges/{id}/cancel": {
      put: {
        tags: ["Exchanges"],
        summary: "Cancel a contract",
        description:
          "If PENDING: either participant may cancel (no credit changes), moving it to CANCELED. If IN_PROGRESS or WAITING_CONFIRMATION: a provider cancel refunds the escrow to the requester (CANCELED / REFUNDED), while a requester cancel cannot unilaterally close it and instead escalates to DISPUTED with credits left frozen. " +
          "When status becomes CANCELED, pushes `EXCHANGE_CANCELED` to the other party via Socket.IO `notification:new` on room `user:{userId}`.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          "200": {
            description: "Contract CANCELED (refunded if applicable) or DISPUTED",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    exchange: { $ref: "#/components/schemas/Exchange" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Contract cannot be canceled from its current status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Exchange not found" },
          "409": { description: "Contract state changed concurrently" },
        },
      },
    },
    "/exchanges/{id}/dispute": {
      post: {
        tags: ["Exchanges"],
        summary: "Open a dispute on a contract",
        description:
          "Participant-only. The contract must be IN_PROGRESS or WAITING_CONFIRMATION. Moves it to DISPUTED; credits remain frozen in escrow until an admin resolves it. No notification is sent.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          "200": {
            description: "Contract moved to DISPUTED, credits remain frozen",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    exchange: { $ref: "#/components/schemas/Exchange" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Exchange not found" },
        },
      },
    },
    "/exchanges/{id}/sessions": {
      get: {
        tags: ["Exchanges"],
        summary: "List all sessions for an exchange",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "List of sessions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sessions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Session" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Exchanges"],
        summary: "Log a new work session",
        description:
          "Provider only. Logs hours worked. Pushes `SESSION_RECORDED` to the requester via Socket.IO `notification:new` on room `user:{userId}`.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateSessionRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Session created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    session: { $ref: "#/components/schemas/Session" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/exchanges/{id}/sessions/{sessionId}/confirm": {
      put: {
        tags: ["Exchanges"],
        summary: "Confirm a work session",
        description:
          "Requester only. Approves logged hours. Pushes `SESSION_CONFIRMED` to the provider via Socket.IO `notification:new` on room `user:{userId}`.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "sessionId", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Session confirmed" } },
      },
    },
    "/exchanges/{id}/sessions/{sessionId}/reject": {
      put: {
        tags: ["Exchanges"],
        summary: "Reject a work session",
        description:
          "Requester only. Pushes `SESSION_REJECTED` to the provider via Socket.IO `notification:new` on room `user:{userId}`.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "sessionId", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Session rejected" } },
      },
    },
    "/exchanges/{id}/deadline": {
      post: {
        tags: ["Exchanges"],
        summary: "Propose a new deadline",
        description:
          "Provider only. Contract must be IN_PROGRESS or WAITING_CONFIRMATION. " +
          "Pushes `DEADLINE_PROPOSED` to the requester via Socket.IO `notification:new` on room `user:{userId}`.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ProposeDeadlineRequest" },
            },
          },
        },
        responses: { "200": { description: "Deadline proposed" } },
      },
    },
    "/exchanges/{id}/deadline/approve": {
      put: {
        tags: ["Exchanges"],
        summary: "Approve a proposed deadline",
        description:
          "Requester only. Requires a pending `proposedEndDate`. " +
          "Pushes `DEADLINE_APPROVED` to the provider via Socket.IO `notification:new` on room `user:{userId}`.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Deadline approved" } },
      },
    },
    "/exchanges/{id}/deadline/reject": {
      put: {
        tags: ["Exchanges"],
        summary: "Reject a proposed deadline",
        description:
          "Requester only. Requires a pending `proposedEndDate`. " +
          "Pushes `DEADLINE_REJECTED` to the provider via Socket.IO `notification:new` on room `user:{userId}`.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Deadline rejected" } },
      },
    },
    "/api/v1/wallet/history": {
      get: {
        tags: ["Wallet"],
        summary: "List wallet transaction history",
        description:
          "Returns the authenticated user's time-credit transaction history with offset pagination. Includes ledger entries (welcome bonus, transfers, refunds) and virtual escrow/cancelled exchange rows derived from contract state.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
          },
          {
            name: "type",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["earned", "spent", "credit", "debit"],
            },
            description:
              "Filter by direction from the authenticated user's perspective. `earned`/`credit` are incoming credits; `spent`/`debit` are outgoing credits.",
          },
          {
            name: "status",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["completed", "refunded", "held", "disputed", "cancelled"],
            },
            description:
              "Filter by row status. Escrow rows use `held` or `disputed`; ledger refunds use `refunded`.",
          },
          {
            name: "startDate",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
          },
          {
            name: "endDate",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          "200": {
            description: "Paginated wallet history",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WalletHistoryResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/feed/{userId}": {
      get: {
        tags: ["Feed"],
        summary: "Get personalized post feed",
        description:
          "Returns published posts ordered by the recommender when available. Falls back to chronological posts when the recommender is disabled or unavailable. Requires authentication but does not enforce that the path `userId` matches the JWT subject — any authenticated client may request any user's feed path.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
          { name: "cursor", in: "query", schema: { type: "integer" } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 50 },
          },
        ],
        responses: {
          "200": {
            description: "Feed posts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FeedResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/internal/recommender-export": {
      get: {
        tags: ["Internal"],
        summary: "Export recommender snapshot",
        description:
          "Full snapshot of users, posts, and interactions for recommender bootstrap. Requires X-Internal-Token header.",
        security: [{ internalTokenAuth: [] }],
        responses: {
          "200": {
            description: "Export payload (users, posts, interactions arrays)",
          },
          "401": { description: "Invalid internal token" },
          "503": { description: "Recommender integration disabled" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      internalTokenAuth: {
        type: "apiKey",
        in: "header",
        name: "X-Internal-Token",
      },
    },
    schemas: {
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "eng.ahmedzenaty@gmail.com",
          },
          password: {
            type: "string",
            minLength: 8,
            maxLength: 50,
            description:
              "Must include at least one uppercase letter, lowercase letter, digit, and special character.",
            example: "OldPass@123",
          },
        },
      },
      ForgotPasswordRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "eng.ahmedzenaty@gmail.com",
          },
        },
      },
      ResetPasswordRequest: {
        type: "object",
        required: ["token", "newPassword"],
        properties: {
          token: {
            type: "string",
            example:
              "10f906d0b5ff842931c6f91567c43fef0c7afb85104539d06a27213061e84cf5",
          },
          newPassword: {
            type: "string",
            minLength: 8,
            maxLength: 50,
            description:
              "Must include at least one uppercase letter, lowercase letter, digit, and special character.",
            example: "NewPass@123",
          },
        },
      },
      ChangePasswordRequest: {
        type: "object",
        required: ["currentPassword", "newPassword"],
        properties: {
          currentPassword: {
            type: "string",
            example: "OldPass@123",
          },
          newPassword: {
            type: "string",
            minLength: 8,
            maxLength: 50,
            description:
              "Must include at least one uppercase letter, lowercase letter, digit, and special character. Must be different from currentPassword.",
            example: "NewPass@456",
          },
        },
      },
      RegisterRequest: {
        type: "object",
        required: [
          "full_name",
          "username",
          "email",
          "password",
          "offeredSkills",
          "requiredSkills",
        ],
        properties: {
          full_name: {
            type: "string",
            minLength: 3,
            maxLength: 100,
            description:
              "Letters only (Latin or Arabic); no digits.",
            example: "Ahmed Zenaty",
          },
          username: {
            type: "string",
            minLength: 3,
            maxLength: 50,
            description:
              "At least 3 English letters; may include numbers and symbols.",
            example: "ahmed_zenaty_test",
          },
          email: {
            type: "string",
            format: "email",
            example: "eng.ahmedzenaty@gmail.com",
          },
          password: {
            type: "string",
            minLength: 8,
            maxLength: 50,
            description:
              "Must include at least one uppercase letter, lowercase letter, digit, and special character.",
            example: "OldPass@123",
          },
          bio: {
            type: "string",
            minLength: 50,
            maxLength: 200,
            description: "Optional. May be omitted or sent as an empty string.",
            example:
              "I am a test user for checking authentication and password reset flow in the Wasla backend application.",
          },
          profile_image: {
            type: "string",
            format: "uri",
            example: "https://example.com/avatar.png",
          },
          location: {
            type: "string",
            minLength: 3,
            example: "Ramallah",
          },
          offeredSkills: {
            type: "array",
            minItems: 1,
            maxItems: 10,
            uniqueItems: true,
            items: {
              type: "string",
              minLength: 2,
            },
            example: ["Design", "Writing", "Cooking", "Teaching", "Translation"],
          },
          requiredSkills: {
            type: "array",
            minItems: 1,
            maxItems: 10,
            uniqueItems: true,
            items: {
              type: "string",
              minLength: 2,
            },
            example: [
              "Coding",
              "Marketing",
              "Photography",
              "Accounting",
              "Gardening",
            ],
          },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          accessToken: {
            type: "string",
          },
          user: {
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              email: { type: "string", format: "email" },
              username: { type: "string", example: "ahmed_zenaty_test" },
            },
            required: ["id", "email", "username"],
          },
        },
        required: ["accessToken", "user"],
      },
      ErrorResponse: {
        type: "object",
        properties: {
          status: {
            type: "string",
            example: "fail",
          },
          message: {
            type: "string",
            example: "Invalid request data",
          },
        },
      },
      PostResponse: {
        type: "object",
        properties: {
          post: { $ref: "#/components/schemas/Post" },
        },
        required: ["post"],
      },
      PostListResponse: {
        type: "object",
        properties: {
          posts: {
            type: "array",
            items: { $ref: "#/components/schemas/Post" },
          },
          nextCursor: { type: "integer", nullable: true },
        },
        required: ["posts", "nextCursor"],
      },
      SavedPostListResponse: {
        type: "object",
        properties: {
          savedPosts: {
            type: "array",
            items: { $ref: "#/components/schemas/SavedPost" },
          },
          nextCursor: { type: "integer", nullable: true },
        },
        required: ["savedPosts", "nextCursor"],
      },
      FeedResponse: {
        type: "object",
        properties: {
          posts: {
            type: "array",
            items: { $ref: "#/components/schemas/Post" },
          },
          nextCursor: { type: "integer", nullable: true },
          source: {
            type: "string",
            enum: ["recommender", "fallback"],
            example: "recommender",
          },
        },
        required: ["posts", "nextCursor", "source"],
      },
      SearchPostsFilters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["OFFER", "REQUEST"],
            example: "OFFER",
          },
          serviceMode: {
            type: "string",
            enum: ["ONLINE", "OFFLINE"],
            example: "ONLINE",
          },
          minCredits: {
            type: "integer",
            minimum: 0,
            example: 5,
          },
          maxCredits: {
            type: "integer",
            minimum: 0,
            example: 20,
          },
          location: {
            type: "string",
            example: "القاهرة",
          },
        },
      },
      SearchPostsRequest: {
        type: "object",
        required: ["query"],
        properties: {
          query: {
            type: "string",
            minLength: 1,
            maxLength: 500,
            example: "سباك في القاهرة",
          },
          topK: {
            type: "integer",
            minimum: 1,
            description:
              "Optional max results. When omitted, all matching posts are returned.",
            example: 20,
          },
          threshold: {
            type: "number",
            minimum: 0,
            maximum: 1,
            example: 0.5,
            description:
              "Minimum similarity score (0–1). Only sent to the recommender when provided.",
          },
          filters: {
            $ref: "#/components/schemas/SearchPostsFilters",
          },
        },
      },
      PostSearchScores: {
        type: "object",
        properties: {
          similarityScore: { type: "number", example: 0.91 },
          freshness: { type: "number", example: 0.8 },
          trust: { type: "number", example: 0.7 },
          finalScore: { type: "number", example: 0.85 },
        },
        required: [
          "similarityScore",
          "freshness",
          "trust",
          "finalScore",
        ],
      },
      PostSearchResultItem: {
        type: "object",
        properties: {
          post: { $ref: "#/components/schemas/Post" },
          scores: {
            oneOf: [
              { $ref: "#/components/schemas/PostSearchScores" },
              { type: "null" },
            ],
            description:
              "Recommender scores when source is recommender; null for fallback results.",
          },
        },
        required: ["post", "scores"],
      },
      PostSearchResponse: {
        type: "object",
        properties: {
          query: { type: "string", example: "سباك في القاهرة" },
          count: { type: "integer", example: 3 },
          source: {
            type: "string",
            enum: ["recommender", "fallback"],
            example: "recommender",
          },
          results: {
            type: "array",
            items: { $ref: "#/components/schemas/PostSearchResultItem" },
          },
        },
        required: ["query", "count", "source", "results"],
      },
      SearchUsersFilters: {
        type: "object",
        properties: {
          skillType: {
            type: "string",
            enum: ["OFFER", "REQUEST"],
            example: "OFFER",
          },
          location: {
            type: "string",
            example: "الإسكندرية",
          },
          isOnline: {
            type: "boolean",
            example: true,
          },
          isVerified: {
            type: "boolean",
            example: true,
          },
        },
      },
      SearchUsersRequest: {
        type: "object",
        required: ["query"],
        properties: {
          query: {
            type: "string",
            minLength: 1,
            maxLength: 500,
            example: "مطور React",
          },
          topK: {
            type: "integer",
            minimum: 1,
            maximum: 50,
            default: 20,
            example: 20,
          },
          filters: {
            $ref: "#/components/schemas/SearchUsersFilters",
          },
        },
      },
      UserSearchCard: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          username: { type: "string", example: "ahmed_dev" },
          name: { type: "string", example: "Ahmed Zenaty" },
          bio: { type: "string", nullable: true },
          profilePicture: { type: "string", nullable: true },
          location: { type: "string", nullable: true, example: "القاهرة" },
          offeredSkills: {
            type: "array",
            items: { type: "string" },
          },
          requiredSkills: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "id",
          "username",
          "name",
          "bio",
          "profilePicture",
          "location",
          "offeredSkills",
          "requiredSkills",
        ],
      },
      UserSearchResultItem: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/UserSearchCard" },
        },
        required: ["user"],
      },
      UserSearchResponse: {
        type: "object",
        properties: {
          query: { type: "string", example: "مطور React" },
          count: { type: "integer", example: 2 },
          source: {
            type: "string",
            enum: ["database"],
            example: "database",
          },
          results: {
            type: "array",
            items: { $ref: "#/components/schemas/UserSearchResultItem" },
          },
        },
        required: ["query", "count", "source", "results"],
      },
      Session: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          exchangeId: { type: "integer", example: 1 },
          hours: { type: "integer", example: 2 },
          notes: { type: "string", nullable: true, example: "Worked on UI" },
          status: { type: "string", example: "PENDING_CONFIRMATION" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateSessionRequest: {
        type: "object",
        required: ["hours"],
        properties: {
          hours: { type: "integer", minimum: 1, example: 2 },
          notes: { type: "string", example: "Did some work" },
        },
      },
      ProposeDeadlineRequest: {
        type: "object",
        required: ["proposedEndDate"],
        properties: {
          proposedEndDate: { type: "string", format: "date-time" },
        },
      },
      CreatePostRequest: {
        type: "object",
        description:
          "When serviceMode is OFFLINE, city and area are required.",
        required: ["title", "description", "category", "serviceMode", "assignedTimeCredits"],
        properties: {
          title: {
            type: "string",
            minLength: 5,
            maxLength: 200,
            example: "Need help with web development",
          },
          description: {
            type: "string",
            minLength: 10,
            maxLength: 5000,
            example: "I need someone to help me build a responsive React website. Looking for someone with 5+ years of experience in frontend development.",
          },
          category: {
            type: "string",
            enum: ["OFFER", "REQUEST"],
            example: "REQUEST",
          },
          serviceMode: {
            type: "string",
            enum: ["ONLINE", "OFFLINE"],
            example: "ONLINE",
          },
          assignedTimeCredits: {
            type: "integer",
            minimum: 1,
            maximum: 100000,
            example: 50,
          },
          city: {
            type: "string",
            minLength: 2,
            description: "Required when serviceMode is OFFLINE.",
            example: "Cairo",
          },
          area: {
            type: "string",
            minLength: 2,
            description: "Required when serviceMode is OFFLINE.",
            example: "Maadi",
          },
          status: {
            type: "string",
            enum: ["PUBLISHED", "DRAFT", "ARCHIVED"],
            example: "PUBLISHED",
          },
        },
      },
      UpdatePostRequest: {
        type: "object",
        description:
          "At least one field is required. When serviceMode is OFFLINE, city and area are required.",
        minProperties: 1,
        properties: {
          title: {
            type: "string",
            minLength: 5,
            maxLength: 200,
          },
          description: {
            type: "string",
            minLength: 10,
            maxLength: 5000,
          },
          category: {
            type: "string",
            enum: ["OFFER", "REQUEST"],
          },
          serviceMode: {
            type: "string",
            enum: ["ONLINE", "OFFLINE"],
          },
          assignedTimeCredits: {
            type: "integer",
            minimum: 1,
            maximum: 100000,
          },
          city: {
            type: "string",
            minLength: 2,
          },
          area: {
            type: "string",
            minLength: 2,
          },
          status: {
            type: "string",
            enum: ["PUBLISHED", "DRAFT", "ARCHIVED"],
          },
        },
      },
      Post: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            example: 1,
          },
          title: {
            type: "string",
            example: "Need help with web development",
          },
          description: {
            type: "string",
            example: "I need someone to help me build a responsive React website.",
          },
          category: {
            type: "string",
            enum: ["OFFER", "REQUEST"],
            example: "REQUEST",
          },
          serviceMode: {
            type: "string",
            enum: ["ONLINE", "OFFLINE"],
            example: "ONLINE",
          },
          assignedTimeCredits: {
            type: "integer",
            example: 50,
          },
          city: {
            type: "string",
            nullable: true,
            example: "Cairo",
          },
          area: {
            type: "string",
            nullable: true,
            example: "Maadi",
          },
          status: {
            type: "string",
            enum: ["PUBLISHED", "DRAFT", "ARCHIVED"],
            example: "PUBLISHED",
          },
          userId: {
            type: "integer",
            example: 1,
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-05-07T10:30:00Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            example: "2026-05-07T10:30:00Z",
          },
          user: {
            type: "object",
            properties: {
              id: {
                type: "integer",
                example: 1,
              },
              username: {
                type: "string",
                example: "ahmed_zenaty_test",
              },
              full_name: {
                type: "string",
                example: "Ahmed Zenaty",
              },
              profile_image: {
                type: "string",
                nullable: true,
                example: "https://example.com/avatar.png",
              },
            },
          },
        },
      },
      SavedPost: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            example: 1,
          },
          userId: {
            type: "integer",
            example: 1,
          },
          postId: {
            type: "integer",
            example: 1,
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-05-07T10:30:00Z",
          },
          post: {
            $ref: "#/components/schemas/Post",
          },
        },
      },
      CreateConversationRequest: {
        type: "object",
        required: ["postId"],
        properties: {
          postId: { type: "integer", example: 1 },
          recipientId: { type: "integer", example: 2 },
        },
      },
      CreateDirectConversationRequest: {
        type: "object",
        required: ["recipientId"],
        properties: {
          recipientId: { type: "integer", example: 2 },
        },
      },
      SendMessageRequest: {
        type: "object",
        required: ["body", "clientMessageId"],
        properties: {
          body: { type: "string", minLength: 1, maxLength: 2000 },
          clientMessageId: {
            type: "string",
            format: "uuid",
            description:
              "Client-generated UUID assigned before the first send attempt. Reuse on retry after network failure to avoid duplicate messages.",
          },
        },
        example: {
          body: "مرحباً، هل الخدمة متاحة؟",
          clientMessageId: "550e8400-e29b-41d4-a716-446655440000",
        },
      },
      EditMessageRequest: {
        type: "object",
        required: ["body"],
        properties: {
          body: { type: "string", minLength: 1, maxLength: 2000 },
        },
      },
      Message: {
        type: "object",
        properties: {
          id: { type: "string" },
          clientMessageId: { type: "string", format: "uuid", nullable: true },
          conversationId: { type: "string" },
          senderId: { type: "integer" },
          sender: {
            type: "object",
            properties: {
              id: { type: "integer" },
              username: { type: "string" },
            },
          },
          body: { type: "string", nullable: true },
          status: { $ref: "#/components/schemas/MessageStatus" },
          createdAt: { type: "string", format: "date-time" },
          deliveredAt: { type: "string", format: "date-time", nullable: true },
          readAt: { type: "string", format: "date-time", nullable: true },
          editedAt: { type: "string", format: "date-time", nullable: true },
          deletedAt: { type: "string", format: "date-time", nullable: true },
          readBy: {
            type: "array",
            items: { $ref: "#/components/schemas/ReadReceipt" },
          },
        },
      },
      ReadReceipt: {
        type: "object",
        properties: {
          id: { type: "string" },
          messageId: { type: "string" },
          userId: { type: "integer" },
          readAt: { type: "string", format: "date-time" },
        },
      },
      MessageResponse: {
        type: "object",
        properties: {
          message: { $ref: "#/components/schemas/Message" },
        },
      },
      MessageListResponse: {
        type: "object",
        properties: {
          messages: {
            type: "array",
            items: { $ref: "#/components/schemas/Message" },
          },
          nextCursor: { type: "string", nullable: true },
        },
      },
      ReadReceiptResponse: {
        type: "object",
        properties: {
          readReceipt: { $ref: "#/components/schemas/ReadReceipt" },
        },
      },
      MessageStatus: {
        type: "string",
        enum: ["SENT", "DELIVERED", "READ"],
        description:
          "SENT: persisted by server. DELIVERED: recipient received payload. READ: recipient viewed message in UI.",
      },
      ChatSocketJoinPayload: {
        type: "object",
        required: ["conversationId"],
        properties: {
          conversationId: { type: "string" },
        },
        description: "Socket.IO client event `chat:join` — join room `conversation:{conversationId}`.",
      },
      ChatSocketLeavePayload: {
        type: "object",
        required: ["conversationId"],
        properties: {
          conversationId: { type: "string" },
        },
        description: "Socket.IO client event `chat:leave` — leave room `conversation:{conversationId}`.",
      },
      ChatMessagesDeliveredPayload: {
        type: "object",
        required: ["conversationId", "messageIds"],
        properties: {
          conversationId: { type: "string" },
          messageIds: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 100,
          },
        },
        description:
          "Socket.IO client event `chat:messages:delivered` — emit after receiving message payload to advance status to DELIVERED.",
      },
      ChatMessagesReadPayload: {
        type: "object",
        required: ["conversationId", "messageIds"],
        properties: {
          conversationId: { type: "string" },
          messageIds: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 100,
          },
        },
        description:
          "Socket.IO client event `chat:messages:read` — emit when messages enter the recipient viewport (e.g. IntersectionObserver).",
      },
      MessageStatusUpdateItem: {
        type: "object",
        properties: {
          messageId: { type: "string" },
          status: { $ref: "#/components/schemas/MessageStatus" },
          deliveredAt: { type: "string", format: "date-time", nullable: true },
          readAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      ChatMessagesStatusEvent: {
        type: "object",
        properties: {
          conversationId: { type: "string" },
          updates: {
            type: "array",
            items: { $ref: "#/components/schemas/MessageStatusUpdateItem" },
          },
        },
        description: "Socket.IO server event `chat:messages:status` — batched status transitions.",
      },
      ChatPresenceOnlineEvent: {
        type: "object",
        properties: {
          userId: { type: "integer" },
        },
        description:
          "Socket.IO server event `chat:presence:online` — sent to conversation partners when user connects.",
      },
      ChatPresenceOfflineEvent: {
        type: "object",
        properties: {
          userId: { type: "integer" },
          lastSeen: { type: "string", format: "date-time" },
        },
        description:
          "Socket.IO server event `chat:presence:offline` — sent after debounced disconnect (default 7s).",
      },
      ChatErrorEvent: {
        type: "object",
        properties: {
          code: {
            type: "string",
            enum: ["INVALID_PAYLOAD", "FORBIDDEN", "JOIN_FAILED"],
          },
          message: { type: "string" },
        },
        description: "Socket.IO server event `chat:error`.",
      },
      ChatParticipantUser: {
        type: "object",
        properties: {
          id: { type: "integer" },
          username: { type: "string" },
          full_name: { type: "string" },
          profile_image: { type: "string", nullable: true },
          is_online: { type: "boolean" },
          last_seen: { type: "string", format: "date-time", nullable: true },
        },
      },
      ConversationParticipant: {
        type: "object",
        properties: {
          userId: { type: "integer" },
          joinedAt: { type: "string", format: "date-time" },
          user: { $ref: "#/components/schemas/ChatParticipantUser" },
        },
      },
      Conversation: {
        type: "object",
        properties: {
          id: { type: "string" },
          postId: { type: "integer", nullable: true },
          post: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "integer" },
              title: { type: "string" },
            },
          },
          participants: {
            type: "array",
            items: { $ref: "#/components/schemas/ConversationParticipant" },
          },
          lastMessage: {
            allOf: [{ $ref: "#/components/schemas/Message" }],
            nullable: true,
          },
          unreadCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ConversationResponse: {
        type: "object",
        properties: {
          conversation: { $ref: "#/components/schemas/Conversation" },
        },
      },
      ConversationListResponse: {
        type: "object",
        properties: {
          conversations: {
            type: "array",
            items: { $ref: "#/components/schemas/Conversation" },
          },
          nextCursor: { type: "string", nullable: true },
        },
      },
      NotificationType: {
        type: "string",
        enum: [
          "NEW_MESSAGE",
          "CONVERSATION_STARTED",
          "EXCHANGE_REQUESTED",
          "EXCHANGE_ACCEPTED",
          "EXCHANGE_REJECTED",
          "EXCHANGE_CANCELED",
          "SESSION_RECORDED",
          "SESSION_CONFIRMED",
          "SESSION_REJECTED",
          "DEADLINE_PROPOSED",
          "DEADLINE_APPROVED",
          "DEADLINE_REJECTED",
          "DEADLINE_APPROACHING",
          "CONTRACT_AUTO_RESOLVED",
        ],
        description: "In-app notification category aligned with the Prisma `NotificationType` enum.",
      },
      NotificationContractData: {
        type: "object",
        required: ["contractId"],
        properties: {
          contractId: { type: "integer", description: "Service exchange (contract) ID" },
          contractEndDate: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Agreed contract deadline (`maximum_end_date`)",
          },
          proposedEndDate: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Pending deadline extension proposed by the provider",
          },
          status: {
            type: "string",
            nullable: true,
            description: "Current contract status at notification time",
          },
        },
      },
      NotificationMessageData: {
        type: "object",
        required: ["conversationId", "messageId"],
        properties: {
          conversationId: { type: "string" },
          messageId: { type: "string" },
          postId: { type: "integer", nullable: true },
        },
      },
      NotificationNewEvent: {
        allOf: [{ $ref: "#/components/schemas/Notification" }],
        description:
          "Socket.IO server event `notification:new` — emitted on personal room `user:{userId}` for every persisted notification.",
      },
      ChatNotificationNewEvent: {
        allOf: [{ $ref: "#/components/schemas/Notification" }],
        description:
          "Deprecated Socket.IO alias emitted on room `user:{userId}` when `type` is `NEW_MESSAGE` only. Prefer `notification:new`.",
      },
      ContractNotificationNewEvent: {
        allOf: [{ $ref: "#/components/schemas/Notification" }],
        description:
          "Socket.IO alias emitted on room `user:{userId}` for contract lifecycle notification types. Also emitted as `notification:new`.",
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "string" },
          userId: { type: "integer" },
          type: { $ref: "#/components/schemas/NotificationType" },
          title: { type: "string" },
          body: { type: "string" },
          data: {
            oneOf: [
              { $ref: "#/components/schemas/NotificationMessageData" },
              { $ref: "#/components/schemas/NotificationContractData" },
            ],
            nullable: true,
          },
          isRead: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      NotificationResponse: {
        type: "object",
        properties: {
          notification: { $ref: "#/components/schemas/Notification" },
        },
      },
      NotificationListResponse: {
        type: "object",
        properties: {
          notifications: {
            type: "array",
            items: { $ref: "#/components/schemas/Notification" },
          },
          nextCursor: { type: "string", nullable: true },
        },
      },
      DeleteAccountRequest: {
        type: "object",
        required: ["password"],
        properties: {
          password: {
            type: "string",
            minLength: 1,
            example: "OldPass@123",
          },
        },
      },
      UpdateProfileRequest: {
        type: "object",
        description: "At least one field is required.",
        minProperties: 1,
        properties: {
          name: {
            type: "string",
            minLength: 3,
            maxLength: 100,
            description: "Letters only (Latin or Arabic); no digits.",
          },
          bio: { type: "string", maxLength: 500, nullable: true },
          profilePicture: { type: "string", format: "uri", nullable: true },
          offeredSkills: {
            type: "array",
            minItems: 1,
            maxItems: 10,
            uniqueItems: true,
            items: { type: "string", minLength: 2 },
            description:
              "Full list of skills the user offers; replaces existing offered skills when provided. Duplicate skill names are rejected.",
          },
          requiredSkills: {
            type: "array",
            minItems: 1,
            maxItems: 10,
            uniqueItems: true,
            items: { type: "string", minLength: 2 },
            description:
              "Full list of skills the user needs; replaces existing required skills when provided. Duplicate skill names are rejected.",
          },
        },
      },
      BasicProfileResponse: {
        type: "object",
        properties: {
          profile: {
            type: "object",
            properties: {
              name: { type: "string" },
              username: { type: "string" },
              bio: { type: "string", nullable: true },
              profilePicture: { type: "string", nullable: true },
              offeredSkills: {
                type: "array",
                items: { type: "string" },
              },
              requiredSkills: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
      },
      FullProfileResponse: {
        type: "object",
        properties: {
          profile: {
            type: "object",
            properties: {
              name: { type: "string" },
              username: { type: "string" },
              bio: { type: "string", nullable: true },
              profilePicture: { type: "string", nullable: true },
              offeredSkills: {
                type: "array",
                items: { type: "string" },
              },
              requiredSkills: {
                type: "array",
                items: { type: "string" },
              },
              stats: {
                type: "object",
                properties: {
                  availableTimeCredits: { type: "integer" },
                  servicesProvided: { type: "integer" },
                  servicesReceived: { type: "integer" },
                },
              },
              trustRating: {
                type: "object",
                properties: {
                  average: { type: "number", nullable: true },
                  count: { type: "integer" },
                },
              },
              recentExchanges: {
                type: "array",
                items: { $ref: "#/components/schemas/RecentExchange" },
              },
            },
          },
        },
      },
      RecentExchange: {
        type: "object",
        properties: {
          id: { type: "integer" },
          role: { type: "string", enum: ["PROVIDER", "CONSUMER"] },
          timeCredits: { type: "integer" },
          completedAt: { type: "string", format: "date-time", nullable: true },
          post: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "integer" },
              title: { type: "string" },
            },
          },
          counterparty: { $ref: "#/components/schemas/UserSummary" },
        },
      },
      UserSummary: {
        type: "object",
        properties: {
          id: { type: "integer" },
          username: { type: "string" },
          name: { type: "string" },
          profilePicture: { type: "string", nullable: true },
        },
      },
      CreateReviewRequest: {
        type: "object",
        required: ["serviceExchangeId", "rating", "comment"],
        properties: {
          serviceExchangeId: { type: "integer" },
          rating: { type: "integer", minimum: 1, maximum: 5 },
          comment: { type: "string", minLength: 1, maxLength: 1000 },
        },
      },
      ReviewResponse: {
        type: "object",
        properties: {
          review: { $ref: "#/components/schemas/Review" },
        },
      },
      ReviewListResponse: {
        type: "object",
        properties: {
          reviews: {
            type: "array",
            items: { $ref: "#/components/schemas/Review" },
          },
          nextCursor: { type: "integer", nullable: true },
        },
      },
      SkillCategory: {
        type: "string",
        enum: ["TECHNICAL", "GENERAL"],
        example: "TECHNICAL",
      },
      Skill: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          name: { type: "string", example: "Web Development" },
          category: { $ref: "#/components/schemas/SkillCategory" },
          isApproved: { type: "boolean", example: true },
        },
      },
      SkillListResponse: {
        type: "object",
        properties: {
          skills: {
            type: "array",
            items: { $ref: "#/components/schemas/Skill" },
          },
        },
      },
      CreateSkillRequest: {
        type: "object",
        required: ["name", "category"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100, example: "Data Analysis" },
          category: { $ref: "#/components/schemas/SkillCategory" },
        },
      },
      SkillResponse: {
        type: "object",
        properties: {
          skill: { $ref: "#/components/schemas/Skill" },
        },
      },
      Review: {
        type: "object",
        properties: {
          id: { type: "integer" },
          rating: { type: "integer" },
          comment: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          reviewer: { $ref: "#/components/schemas/UserSummary" },
        },
      },
      ExchangeStatus: {
        type: "string",
        description:
          "PUT /exchanges/{id}/accept sets IN_PROGRESS (not ACCEPTED). ACCEPTED is a legacy DB enum value and is not returned by the accept endpoint.",
        enum: [
          "PENDING",
          "ACCEPTED",
          "IN_PROGRESS",
          "WAITING_CONFIRMATION",
          "COMPLETED",
          "CANCELED",
          "REJECTED",
          "DISPUTED",
        ],
        example: "PENDING",
      },
      EscrowStatus: {
        type: "string",
        enum: ["NONE", "HELD", "RELEASED", "REFUNDED"],
        example: "NONE",
      },
      CreateExchangeRequest: {
        type: "object",
        required: ["postId", "providerId", "duration", "contractEndDate"],
        properties: {
          postId: { type: "integer", example: 1 },
          providerId: { type: "integer", example: 2 },
          duration: {
            type: "integer",
            minimum: 1,
            maximum: 100000,
            description: "Number of time credits the service costs",
            example: 3,
          },
          contractEndDate: {
            type: "string",
            format: "date-time",
            description:
              "Agreed contract deadline. Must be strictly in the future. Legacy alias: maximumEndDate",
            example: "2026-07-01T00:00:00.000Z",
          },
        },
      },
      Exchange: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          postId: { type: "integer", nullable: true, example: 1 },
          requesterId: { type: "integer", example: 1 },
          providerId: { type: "integer", example: 2 },
          duration: { type: "integer", example: 3 },
          contractEndDate: {
            type: "string",
            format: "date-time",
            description: "Agreed contract deadline",
          },
          proposedEndDate: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Pending deadline extension proposed by the provider",
          },
          status: { $ref: "#/components/schemas/ExchangeStatus" },
          escrowStatus: { $ref: "#/components/schemas/EscrowStatus" },
          acceptedAt: { type: "string", format: "date-time", nullable: true },
          deliveredAt: { type: "string", format: "date-time", nullable: true },
          completedAt: { type: "string", format: "date-time", nullable: true },
          canceledAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          requester: { $ref: "#/components/schemas/ExchangeParticipant" },
          provider: { $ref: "#/components/schemas/ExchangeParticipant" },
          post: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "integer" },
              title: { type: "string" },
              category: {
                type: "string",
                description:
                  "Skill name derived from the post author's offered or needed skills",
                example: "برمجة",
              },
              service_mode: { type: "string", enum: ["ONLINE", "OFFLINE"] },
            },
          },
        },
      },
      ExchangeParticipant: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          username: { type: "string", example: "ahmed_zenaty_test" },
          full_name: { type: "string", example: "Ahmed Zenaty" },
          profile_image: {
            type: "string",
            nullable: true,
            example: "https://example.com/avatar.png",
          },
        },
      },
      ExchangeListResponse: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Exchange" },
          },
          meta: {
            type: "object",
            properties: {
              page: { type: "integer", example: 1 },
              limit: { type: "integer", example: 20 },
              total: { type: "integer", example: 1 },
              totalPages: { type: "integer", example: 1 },
            },
          },
        },
      },
      WalletCounterparty: {
        type: "object",
        properties: {
          id: { type: "string", example: "12" },
          name: { type: "string", example: "Ahmed Zenaty" },
        },
      },
      WalletRelatedService: {
        type: "object",
        nullable: true,
        properties: {
          id: { type: "string", example: "42" },
          title: { type: "string", example: "Welcome bonus" },
        },
      },
      WalletTransaction: {
        type: "object",
        properties: {
          transactionId: { type: "string", example: "15" },
          amount: { type: "integer", example: 5 },
          type: { type: "string", enum: ["credit", "debit"] },
          counterparty: { $ref: "#/components/schemas/WalletCounterparty" },
          relatedServiceOrRequest: {
            $ref: "#/components/schemas/WalletRelatedService",
          },
          status: {
            type: "string",
            enum: ["completed", "refunded", "held", "disputed", "cancelled"],
            description:
              "Ledger rows use completed or refunded. Active escrow rows use held or disputed. Cancelled contracts use cancelled.",
          },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      WalletHistoryResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          metadata: {
            type: "object",
            properties: {
              totalItems: { type: "integer", example: 12 },
              totalPages: { type: "integer", example: 2 },
              currentPage: { type: "integer", example: 1 },
              limit: { type: "integer", example: 10 },
            },
          },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/WalletTransaction" },
          },
        },
      },
    },
    responses: {
      BadRequest: {
        description: "Invalid request",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            examples: {
              validationError: {
                value: {
                  status: "fail",
                  errors: [
                    {
                      path: "email",
                      message: "Invalid email format",
                    },
                  ],
                },
              },
              businessError: {
                value: {
                  status: "fail",
                  message: "Invalid credentials",
                },
              },
            },
          },
        },
      },
      Unauthorized: {
        description: "Missing, invalid, or expired access token",
        content: {
          "application/json": {
            example: {
              message: "Invalid or expired token",
            },
          },
        },
      },
      TooManyRequests: {
        description: "Rate limit exceeded",
        content: {
          "application/json": {
            example: "Too many login attempts. Please try again after 1 minute.",
          },
        },
      },
      Forbidden: {
        description: "Authenticated but not allowed to access this resource",
        content: {
          "application/json": {
            example: {
              status: "fail",
              message: "You do not have access to this resource",
            },
          },
        },
      },
    },
  },
} as const;
