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
    {
      name: "Profile",
      description: "User profile read and update endpoints",
    },
    {
      name: "Reviews",
      description: "Service exchange reviews and ratings",
    },
    {
      name: "Exchanges",
      description:
        "Time-credit service exchange (contract) lifecycle with escrow: request, accept, reject, deliver, confirm, cancel, and dispute",
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
    "/api/users/account": {
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
    "/api/users/profile": {
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
    "/api/users/{id}/profile": {
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
    "/api/users/{id}/reviews": {
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
    "/api/reviews": {
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
    "/exchanges/request": {
      post: {
        tags: ["Exchanges"],
        summary: "Request a service exchange (create contract)",
        description:
          "Creates a PENDING contract. No time credits are deducted at this stage. The requester is the authenticated user; you cannot request a service from yourself, and you must currently hold at least `duration` available credits.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateExchangeRequest" },
              example: { postId: 1, providerId: 2, duration: 3 },
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
          "Provider-only. The contract must be PENDING. Runs in a serializable transaction: re-checks the requester's available credits, then deducts `duration` from available and moves it into escrow (HELD). Fails if the requester no longer has enough credits.",
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
        description: "Provider-only. The contract must be PENDING. No credit changes.",
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
          "Provider-only. The contract must be IN_PROGRESS. Moves it to WAITING_CONFIRMATION. Credits remain frozen in escrow.",
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
          "Requester-only. The contract must be WAITING_CONFIRMATION. Runs in a serializable transaction: releases escrow from the requester, credits the provider, increments both users' service stats, writes a TRANSFER ledger entry, and sets the contract to COMPLETED / escrow RELEASED.",
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
          "If PENDING: either participant may cancel (no credit changes), moving it to CANCELED. If IN_PROGRESS or WAITING_CONFIRMATION: a provider cancel refunds the escrow to the requester (CANCELED / REFUNDED), while a requester cancel cannot unilaterally close it and instead escalates to DISPUTED with credits left frozen.",
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
          "Participant-only. The contract must be IN_PROGRESS or WAITING_CONFIRMATION. Moves it to DISPUTED; credits remain frozen in escrow until an admin resolves it.",
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
            maxLength: 100,
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
        properties: {
          name: { type: "string", minLength: 3, maxLength: 100 },
          bio: { type: "string", maxLength: 500, nullable: true },
          profilePicture: { type: "string", format: "uri", nullable: true },
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
        required: ["postId", "providerId", "duration"],
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
              category: { type: "string", enum: ["OFFER", "REQUEST"] },
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
