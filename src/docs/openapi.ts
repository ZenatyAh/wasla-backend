export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Wasla Backend API",
    version: "1.0.0",
    description:
      "API documentation for Wasla backend including auth, posts, chat, notifications, and real-time messaging.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development server",
    },
  ],
  tags: [
    {
      name: "System",
      description: "System status endpoints",
    },
    {
      name: "Auth",
      description: "Authentication and session endpoints",
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
      description: "1:1 post-linked conversations, messages, and Socket.IO events",
    },
    {
      name: "Notifications",
      description: "In-app notifications for chat and platform events",
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
                  "refreshToken=eyJhbGciOiJIUzI1NiIs...; HttpOnly; SameSite=Strict",
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
                  "refreshToken=eyJhbGciOiJIUzI1NiIs...; HttpOnly; SameSite=Strict",
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
                    Username: "ahmed_zenaty_test",
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
                  "refreshToken=eyJhbGciOiJIUzI1NiIs...; HttpOnly; SameSite=Strict",
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
        summary: "List all published posts",
        description: "Retrieve all published posts from the system. No authentication required.",
        responses: {
          "200": {
            description: "List of published posts",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    posts: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Post",
                      },
                    },
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
    "/posts/me": {
      get: {
        tags: ["Posts"],
        summary: "List my posts",
        description: "Retrieve all posts created by the authenticated user.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of user's posts",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    posts: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Post",
                      },
                    },
                  },
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
        },
      },
    },
    "/posts/saved": {
      get: {
        tags: ["Posts"],
        summary: "List saved posts",
        description: "Retrieve all posts saved by the authenticated user.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of saved posts",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    savedPosts: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/SavedPost",
                      },
                    },
                  },
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
        summary: "Start or reuse a conversation",
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
          "201": { description: "Conversation created" },
          "200": { description: "Existing conversation reused" },
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
          "200": { description: "Paginated conversations" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/conversations/{conversationId}": {
      get: {
        tags: ["Chat"],
        summary: "Get conversation details",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "conversationId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Conversation details" },
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
          "200": { description: "Paginated messages" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Chat"],
        summary: "Send a message",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "conversationId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SendMessageRequest" },
              example: { body: "مرحباً، هل الخدمة متاحة؟" },
            },
          },
        },
        responses: {
          "201": { description: "Message sent" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "403": { $ref: "#/components/responses/Forbidden" },
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
          "200": { description: "Message updated" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      delete: {
        tags: ["Chat"],
        summary: "Soft-delete own message",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "messageId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Message soft-deleted" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/messages/{messageId}/read": {
      post: {
        tags: ["Chat"],
        summary: "Mark message as read",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "messageId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Read receipt recorded" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List notifications",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Notification list" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "All notifications marked as read" },
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
          "200": { description: "Notification marked as read" },
          "404": { description: "Notification not found" },
        },
      },
    },
    "/realtime/chat": {
      get: {
        tags: ["Chat"],
        summary: "Socket.IO events reference (documentation only)",
        description:
          "Connect via Socket.IO using JWT in auth.token. Client events: chat:join, chat:leave. Server events: chat:message:new, chat:message:edited, chat:message:deleted, chat:message:read, chat:notification:new, chat:error.",
        responses: {
          "200": { description: "Documentation reference only" },
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
            example: "NewPass@123",
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
            maxLength: 40,
            example: "Ahmed Zenaty",
          },
          username: {
            type: "string",
            minLength: 3,
            maxLength: 50,
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
            example: "OldPass@123",
          },
          bio: {
            type: "string",
            minLength: 50,
            maxLength: 200,
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
            example: "Ramallah",
          },
          offeredSkills: {
            type: "array",
            minItems: 5,
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
            minItems: 5,
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
          },
        },
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
      CreatePostRequest: {
        type: "object",
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
          status: {
            type: "string",
            enum: ["PUBLISHED", "DRAFT", "ARCHIVED"],
            example: "PUBLISHED",
          },
        },
      },
      UpdatePostRequest: {
        type: "object",
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
      SendMessageRequest: {
        type: "object",
        required: ["body"],
        properties: {
          body: { type: "string", minLength: 1, maxLength: 2000 },
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
          conversationId: { type: "string" },
          senderId: { type: "integer" },
          body: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          editedAt: { type: "string", format: "date-time", nullable: true },
          deletedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      Conversation: {
        type: "object",
        properties: {
          id: { type: "string" },
          postId: { type: "integer" },
          unreadCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "string" },
          userId: { type: "integer" },
          type: { type: "string", enum: ["NEW_MESSAGE", "CONVERSATION_STARTED"] },
          title: { type: "string" },
          body: { type: "string" },
          isRead: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
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
