export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Wasla Backend API",
    version: "1.0.0",
    description:
      "توثيق الواجهات البرمجية الكاملة لمنصة وصلة لتبادل الخدمات والمهارات المعتمدة على الوقت كعملة أساسية.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development server",
    },
    {
      url: "https://wasla-backend.up.railway.app",
      description: "Production server on Railway",
    },
  ],
  tags: [
    {
      name: "System",
      description: "System status and framework check endpoints",
    },
    {
      name: "Auth",
      description: "Authentication, session rotation, and password reset workflows",
    },
    {
      name: "User",
      description: "Authenticated profile actions, wallets, transaction histories, and public user profiles",
    },
    {
      name: "Skills",
      description: "Skill catalog used during registration and profile updates",
    },
    {
      name: "Posts",
      description: "Post management operations (create, read, update, delete, save)",
    },
    {
      name: "Requests",
      description: "Operations handling service requests, status workflows, and time-credit updates",
    },
    {
      name: "Reviews",
      description: "Operations related to rating and reviewing users post service completion",
    },
    {
      name: "Chat",
      description:
        "1:1 conversations linked to posts. REST endpoints handle persistence; live updates use Socket.IO (see /realtime/chat). Only conversation participants can read or send messages.",
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
                offeredSkills: ["Design", "Writing", "Cooking", "Teaching", "Translation"],
                requiredSkills: ["Coding", "Marketing", "Photography", "Accounting", "Gardening"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User registered. A httpOnly refreshToken cookie is also set.",
            headers: {
              "Set-Cookie": {
                schema: { type: "string" },
                example: "refreshToken=eyJhbGciOiJIUzI1NiIs...; HttpOnly; SameSite=Strict",
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
            description: "Login successful. A httpOnly refreshToken cookie is also set.",
            headers: {
              "Set-Cookie": {
                schema: { type: "string" },
                example: "refreshToken=eyJhbGciOiJIUzI1NiIs...; HttpOnly; SameSite=Strict",
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
        description: "Always returns the same success message so the API does not reveal whether an email exists.",
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
                token: "10f906d0b5ff842931c6f91567c43fef0c7afb85104539d06a27213061e84cf5",
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
        description: "Reads the refreshToken from the httpOnly cookie.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Refresh successful. A rotated httpOnly refreshToken cookie is also set.",
            headers: {
              "Set-Cookie": {
                schema: { type: "string" },
                example: "refreshToken=eyJhbGciOiJIUzI1NiIs...; HttpOnly; SameSite=Strict",
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
        description: "Deletes the matching session from the database and clears refresh token cookies.",
        security: [{ cookieAuth: [] }],
        responses: {
          "204": {
            description: "Logged out or already logged out",
          },
        },
      },
    },
    "/profile": {
      get: {
        tags: ["User"],
        summary: "Get authenticated user's full profile",
        description: "Returns the current user's profile including skills, balances, and verification status.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Profile retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    profile: { $ref: "#/components/schemas/UserProfileFull" },
                  },
                },
                example: {
                  profile: {
                    id: 1,
                    full_name: "Ahmed Zenaty",
                    username: "ahmed_zenaty_test",
                    email: "eng.ahmedzenaty@gmail.com",
                    bio: "I am a test user for checking authentication and password reset flow.",
                    profile_image: "https://example.com/avatar.png",
                    location: "Ramallah",
                    available_balance: 5,
                    escrow_balance: 0,
                    is_verified: false,
                    offeredSkills: ["Design", "Writing"],
                    requiredSkills: ["Coding", "Marketing"],
                    created_at: "2026-01-15T10:00:00Z",
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      patch: {
        tags: ["User"],
        summary: "Update authenticated user's profile",
        description: "Update bio, profile image, location, and display name. Email and username cannot be changed here.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProfileRequest" },
              example: {
                full_name: "Ahmed Zenaty",
                bio: "Updated bio with at least fifty characters to pass validation rules in the backend.",
                profile_image: "https://example.com/new-avatar.png",
                location: "Nablus",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Profile updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    profile: { $ref: "#/components/schemas/UserProfileFull" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/profile/transactions": {
      get: {
        tags: ["User"],
        summary: "Get authenticated user's transaction history",
        description: "Retrieve all time-credit transactions where the user is either the sender or receiver.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of transactions retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    transactions: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Transaction",
                      },
                    },
                  },
                },
                example: {
                  transactions: [
                    {
                      id: 101,
                      senderId: 1,
                      receiverId: 2,
                      amountOfHours: 3,
                      transaction_type: "TRANSFER",
                      reference_contract_id: null,
                      createdAt: "2026-06-06T13:30:00Z",
                    },
                  ],
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
    "/skills": {
      get: {
        tags: ["Skills"],
        summary: "List available skills",
        description: "Returns the skill catalog for autocomplete and profile editing.",
        parameters: [
          { name: "search", in: "query", required: false, schema: { type: "string" }, example: "design" },
        ],
        responses: {
          "200": {
            description: "Skill list retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    skills: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Skill" },
                    },
                  },
                },
                example: {
                  skills: [
                    { id: 1, skill_name: "Design" },
                    { id: 2, skill_name: "Coding" },
                  ],
                },
              },
            },
          },
        },
      },
    },
    "/users/{id}": {
      get: {
        tags: ["User"],
        summary: "Get user profile by ID",
        description: "Retrieve public profile information and time wallet balance of a specific user.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
                },
            example: 2,
          },
        ],
        responses: {
          "200": {
            description: "User profile details retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      $ref: "#/components/schemas/UserProfile",
                    },
                  },
                },
                example: {
                  user: {
                    id: 2,
                    username: "saja_ai_test",
                    full_name: "Saja",
                    bio: "Software Engineering student specializing in AI.",
                    profile_image: "https://example.com/avatar2.png",
                    location: "Gaza",
                    timeWalletBalance: 15,
                  },
                },
              },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                example: {
                  status: "fail",
                  message: "User not found",
                },
              },
            },
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
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
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
          "400": { $ref: "#/components/responses/BadRequest" },
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
          "401": { $ref: "#/components/responses/Unauthorized" },
          "400": { $ref: "#/components/responses/BadRequest" },
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
          "401": { $ref: "#/components/responses/Unauthorized" },
          "400": { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/posts/{postId}": {
      get: {
        tags: ["Posts"],
        summary: "Get post by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "postId",
            in: "path",
            required: true,
            schema: { type: "integer" },
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
                    post: { $ref: "#/components/schemas/Post" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": {
            description: "Post not found",
            content: { "application/json": { example: { status: "fail", message: "Post not found" } } },
          },
        },
      },
      patch: {
        tags: ["Posts"],
        summary: "Update post",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "postId",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdatePostRequest" },
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
                  properties: { post: { $ref: "#/components/schemas/Post" } },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { description: "Post not found" },
        },
      },
      delete: {
        tags: ["Posts"],
        summary: "Delete post",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "postId",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          "204": { description: "Post deleted successfully" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { description: "Post not found" },
        },
      },
    },
    "/posts/{postId}/save": {
      post: {
        tags: ["Posts"],
        summary: "Save a post",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "postId", in: "path", required: true, schema: { type: "integer" }, example: 1 }],
        responses: {
          "201": {
            description: "Post saved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { savedPost: { $ref: "#/components/schemas/SavedPost" } },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      delete: {
        tags: ["Posts"],
        summary: "Unsave a post",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "postId", in: "path", required: true, schema: { type: "integer" }, example: 1 }],
        responses: {
          "200": { description: "Post unsaved successfully" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/requests": {
      post: {
        tags: ["Requests"],
        summary: "Create a new service request",
        description: "Allows a user to request a service from a specific post. Status defaults to PENDING.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateRequestInput" },
              example: {
                postId: 5,
                hoursRequested: 3,
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Request created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    request: { $ref: "#/components/schemas/ServiceRequest" },
                  },
                },
                example: {
                  request: {
                    id: 501,
                    postId: 5,
                    requesterId: 1,
                    postOwnerId: 2,
                    hoursRequested: 3,
                    status: "PENDING",
                    createdAt: "2026-06-06T12:00:00Z",
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      get: {
        tags: ["Requests"],
        summary: "Get all user requests",
        description: "Retrieve all service requests where the user is either the requester or the post owner.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of requests retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    requests: { type: "array", items: { $ref: "#/components/schemas/ServiceRequest" } },
                  },
                },
                example: {
                  requests: [
                    {
                      id: 501,
                      postId: 5,
                      requesterId: 1,
                      postOwnerId: 2,
                      hoursRequested: 3,
                      status: "PENDING",
                      createdAt: "2026-06-06T12:00:00Z",
                    },
                  ],
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/requests/{id}": {
      get: {
        tags: ["Requests"],
        summary: "Get service request by ID",
        description: "Returns a single request if the authenticated user is the requester or the post owner.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, example: 501 }],
        responses: {
          "200": {
            description: "Request retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    request: { $ref: "#/components/schemas/ServiceRequest" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Request not found" },
        },
      },
    },
    "/requests/{id}/status": {
      patch: {
        tags: ["Requests"],
        summary: "Update service request status",
        description: "Update status (ACCEPTED, COMPLETED). Setting status to COMPLETED automates wallet transfers.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, example: 501 }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateStatusInput" },
              example: { status: "ACCEPTED" },
            },
          },
        },
        responses: {
          "200": {
            description: "Request status updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    request: { $ref: "#/components/schemas/ServiceRequest" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Request not found" },
        },
      },
    },
    "/reviews": {
      post: {
        tags: ["Reviews"],
        summary: "Create a new review for a completed service",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateReviewInput" },
              example: {
                requestId: 501,
                rating: 5,
                comment: "ممتاز وأنصح بالتعامل معه.",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Review created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    review: { $ref: "#/components/schemas/Review" },
                  },
                },
              },
            },
          },
          "400": { description: "Bad Request - Incomplete transaction or duplicate review" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/users/{id}/reviews": {
      get: {
        tags: ["Reviews"],
        summary: "Get all reviews for a specific user",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, example: 2 }],
        responses: {
          "200": {
            description: "List of user reviews retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    reviews: { type: "array", items: { $ref: "#/components/schemas/Review" } },
                  },
                },
              },
            },
          },
          "404": { description: "User not found" },
        },
      },
    },
    "/conversations": {
      post: {
        tags: ["Chat"],
        summary: "Start or reuse a 1:1 conversation about a post",
        description:
          "Creates a new conversation or returns an existing one for the same post and participant pair. Any authenticated user can message a post owner from the post page. If the caller is the post owner, `recipientId` is required.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateConversationRequest" },
              example: { postId: 5 },
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
        summary: "List conversations for the authenticated user",
        description: "Returns conversations sorted by most recent activity, with last message preview and unread count.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "cursor", in: "query", required: false, schema: { type: "string" }, description: "Opaque cursor from previous page" },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
        ],
        responses: {
          "200": {
            description: "Paginated conversation list",
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
    "/conversations/{conversationId}": {
      get: {
        tags: ["Chat"],
        summary: "Get conversation details",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "conversationId", in: "path", required: true, schema: { type: "string" }, example: "clx9f2k3m0000qz8h1a2b3c4d" },
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
        summary: "Get paginated message history",
        description: "Returns messages in chronological order. Soft-deleted messages keep metadata but `body` is null.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "conversationId", in: "path", required: true, schema: { type: "string" }, example: "clx9f2k3m0000qz8h1a2b3c4d" },
          { name: "cursor", in: "query", required: false, schema: { type: "string" }, description: "Message ID cursor for older messages" },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50, default: 30 } },
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
          "404": { description: "Conversation not found" },
        },
      },
      post: {
        tags: ["Chat"],
        summary: "Send a text message",
        description: "Stores the message and emits a Socket.IO `chat:message:new` event to other participants.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "conversationId", in: "path", required: true, schema: { type: "string" }, example: "clx9f2k3m0000qz8h1a2b3c4d" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SendMessageRequest" },
              example: { body: "مرحباً، هل الخدمة متاحة هذا الأسبوع؟" },
            },
          },
        },
        responses: {
          "201": {
            description: "Message sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { $ref: "#/components/schemas/Message" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Conversation not found" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
        },
      },
    },
    "/messages/{messageId}": {
      patch: {
        tags: ["Chat"],
        summary: "Edit own message",
        description: "Only the original sender can edit. Deleted messages cannot be edited.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "messageId", in: "path", required: true, schema: { type: "string" }, example: "clx9f2k3m0001qz8h1a2b3c4d" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EditMessageRequest" },
              example: { body: "مرحباً، هل يمكننا التنسيق يوم الخميس؟" },
            },
          },
        },
        responses: {
          "200": {
            description: "Message updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { $ref: "#/components/schemas/Message" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Message not found" },
        },
      },
      delete: {
        tags: ["Chat"],
        summary: "Soft-delete own message",
        description: "Sets `deletedAt` and emits `chat:message:deleted`. Message history remains for participants.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "messageId", in: "path", required: true, schema: { type: "string" }, example: "clx9f2k3m0001qz8h1a2b3c4d" },
        ],
        responses: {
          "200": {
            description: "Message soft-deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { $ref: "#/components/schemas/Message" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Message not found" },
        },
      },
    },
    "/messages/{messageId}/read": {
      post: {
        tags: ["Chat"],
        summary: "Mark a message as read",
        description: "Creates a read receipt for the authenticated user. Emits `chat:message:read` to other participants.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "messageId", in: "path", required: true, schema: { type: "string" }, example: "clx9f2k3m0001qz8h1a2b3c4d" },
        ],
        responses: {
          "200": {
            description: "Read receipt recorded (idempotent if already read)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    readReceipt: { $ref: "#/components/schemas/MessageReadReceipt" },
                  },
                },
                example: {
                  readReceipt: {
                    id: "clx9f2k3m0002qz8h1a2b3c4d",
                    messageId: "clx9f2k3m0001qz8h1a2b3c4d",
                    userId: 2,
                    readAt: "2026-06-06T14:05:00Z",
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Message not found" },
        },
      },
    },
    "/realtime/chat": {
      get: {
        tags: ["Chat"],
        summary: "Socket.IO real-time events (documentation only)",
        description: `This is **not** a REST endpoint. It documents the Socket.IO contract for live chat.

**Connection**
- URL: same host as API (e.g. \`http://localhost:3000\`)
- Path: \`/socket.io\`
- Auth: pass JWT access token on connect via \`auth: { token: "<accessToken>" }\`

**Client → Server events**
| Event | Payload | Purpose |
|-------|---------|---------|
| \`chat:join\` | \`{ conversationId: string }\` | Join a conversation room after opening a chat |
| \`chat:leave\` | \`{ conversationId: string }\` | Leave a conversation room |

**Server → Client events**
| Event | Payload | Purpose |
|-------|---------|---------|
| \`chat:message:new\` | \`Message\` | New message in a joined conversation |
| \`chat:message:edited\` | \`Message\` | Message body updated |
| \`chat:message:deleted\` | \`{ id, conversationId, deletedAt }\` | Message soft-deleted |
| \`chat:message:read\` | \`MessageReadReceipt\` | Another participant read a message |
| \`chat:error\` | \`{ code, message }\` | Authorization or validation failure |

**Notes**
- REST remains the source of truth; Socket.IO is for live UI updates.
- Reconnect and re-join rooms; fetch missed messages via \`GET /conversations/{id}/messages\`.
- Sender ID always comes from the authenticated socket, never from client payload.`,
        responses: {
          "200": {
            description: "Documentation reference only",
            content: {
              "application/json": {
                example: {
                  note: "Connect with Socket.IO client instead of calling this REST path.",
                },
              },
            },
          },
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
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "refreshToken",
        description: "Manual cookie assignment layout for JWT refresh token rotation",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          email: { type: "string", format: "email", example: "eng.ahmedzenaty@gmail.com" },
          username: { type: "string", example: "ahmed_zenaty_test" },
        },
      },
      Skill: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          skill_name: { type: "string", example: "Design" },
        },
      },
      UserProfile: {
        type: "object",
        properties: {
          id: { type: "integer", example: 2 },
          username: { type: "string", example: "saja_ai_test" },
          full_name: { type: "string", example: "Saja" },
          bio: { type: "string", example: "Software Engineering student specializing in AI." },
          profile_image: { type: "string", format: "uri", nullable: true, example: "https://example.com/avatar2.png" },
          location: { type: "string", example: "Gaza" },
          timeWalletBalance: { type: "integer", description: "رصيد المحفظة الزمنية بالساعات", example: 15 },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "eng.ahmedzenaty@gmail.com" },
          password: { type: "string", minLength: 8, maxLength: 50, example: "OldPass@123" },
        },
      },
      ForgotPasswordRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email", example: "eng.ahmedzenaty@gmail.com" },
        },
      },
      ResetPasswordRequest: {
        type: "object",
        required: ["token", "newPassword"],
        properties: {
          token: { type: "string", example: "10f906d0b5ff842931c6f91567c43fef0c7afb85104539d06a27213061e84cf5" },
          newPassword: { type: "string", minLength: 8, maxLength: 50, example: "NewPass@123" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["full_name", "username", "email", "password", "offeredSkills", "requiredSkills"],
        properties: {
          full_name: { type: "string", minLength: 3, maxLength: 40, example: "Ahmed Zenaty" },
          username: { type: "string", minLength: 3, maxLength: 50, example: "ahmed_zenaty_test" },
          email: { type: "string", format: "email", example: "eng.ahmedzenaty@gmail.com" },
          password: { type: "string", minLength: 8, maxLength: 50, example: "OldPass@123" },
          bio: { type: "string", minLength: 50, maxLength: 200, example: "I am a test user for checking authentication..." },
          profile_image: { type: "string", format: "uri", example: "https://example.com/avatar.png" },
          location: { type: "string", example: "Ramallah" },
          offeredSkills: { type: "array", items: { type: "string" }, example: ["Design", "Writing"] },
          requiredSkills: { type: "array", items: { type: "string" }, example: ["Coding", "Marketing"] },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          user: { $ref: "#/components/schemas/User" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "fail" },
          message: { type: "string", example: "Invalid request data" },
        },
      },
      UserProfileFull: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          full_name: { type: "string", example: "Ahmed Zenaty" },
          username: { type: "string", example: "ahmed_zenaty_test" },
          email: { type: "string", format: "email", example: "eng.ahmedzenaty@gmail.com" },
          bio: { type: "string", nullable: true, example: "I am a test user..." },
          profile_image: { type: "string", format: "uri", nullable: true, example: "https://example.com/avatar.png" },
          location: { type: "string", nullable: true, example: "Ramallah" },
          available_balance: { type: "integer", example: 5 },
          escrow_balance: { type: "integer", example: 0 },
          is_verified: { type: "boolean", example: false },
          offeredSkills: { type: "array", items: { type: "string" }, example: ["Design", "Writing"] },
          requiredSkills: { type: "array", items: { type: "string" }, example: ["Coding", "Marketing"] },
          created_at: { type: "string", format: "date-time" },
        },
      },
      UpdateProfileRequest: {
        type: "object",
        properties: {
          full_name: { type: "string", minLength: 3, maxLength: 40 },
          bio: { type: "string", minLength: 50, maxLength: 200 },
          profile_image: { type: "string", format: "uri" },
          location: { type: "string" },
        },
      },
      Transaction: {
        type: "object",
        properties: {
          id: { type: "integer", example: 101 },
          senderId: { type: "integer", nullable: true, example: 1 },
          receiverId: { type: "integer", example: 2 },
          amountOfHours: { type: "integer", example: 3 },
          transaction_type: { type: "string", enum: ["TRANSFER", "REFUND", "WELCOME_BONUS"], example: "TRANSFER" },
          reference_contract_id: { type: "integer", nullable: true, example: null },
          createdAt: { type: "string", format: "date-time", example: "2026-06-06T13:30:00Z" },
        },
      },
      CreatePostRequest: {
        type: "object",
        required: ["title", "description", "category", "serviceMode", "assignedTimeCredits"],
        properties: {
          title: { type: "string", minLength: 5, maxLength: 200, example: "Need help with web development" },
          description: { type: "string", minLength: 10, maxLength: 5000, example: "I need someone to help me build..." },
          category: { type: "string", enum: ["OFFER", "REQUEST"], example: "REQUEST" },
          serviceMode: { type: "string", enum: ["ONLINE", "OFFLINE"], example: "ONLINE" },
          assignedTimeCredits: { type: "integer", minimum: 1, example: 50 },
          status: { type: "string", enum: ["PUBLISHED", "DRAFT", "ARCHIVED"], example: "PUBLISHED" },
        },
      },
      UpdatePostRequest: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 5, maxLength: 200 },
          description: { type: "string", minLength: 10, maxLength: 5000 },
          category: { type: "string", enum: ["OFFER", "REQUEST"] },
          serviceMode: { type: "string", enum: ["ONLINE", "OFFLINE"] },
          assignedTimeCredits: { type: "integer", minimum: 1 },
          status: { type: "string", enum: ["PUBLISHED", "DRAFT", "ARCHIVED"] },
        },
      },
      Post: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          title: { type: "string", example: "Need help with web development" },
          description: { type: "string", example: "I need someone to help me build a responsive React website." },
          category: { type: "string", enum: ["OFFER", "REQUEST"], example: "REQUEST" },
          serviceMode: { type: "string", enum: ["ONLINE", "OFFLINE"], example: "ONLINE" },
          assignedTimeCredits: { type: "integer", example: 50 },
          status: { type: "string", enum: ["PUBLISHED", "DRAFT", "ARCHIVED"], example: "PUBLISHED" },
          userId: { type: "integer", example: 1 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          user: { $ref: "#/components/schemas/User" },
        },
      },
      SavedPost: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          userId: { type: "integer", example: 1 },
          postId: { type: "integer", example: 1 },
          createdAt: { type: "string", format: "date-time" },
          post: { $ref: "#/components/schemas/Post" },
        },
      },
      ServiceRequest: {
        type: "object",
        properties: {
          id: { type: "integer", example: 501 },
          postId: { type: "integer", example: 5 },
          requesterId: { type: "integer", example: 1 },
          postOwnerId: { type: "integer", example: 2 },
          hoursRequested: { type: "integer", example: 3 },
          status: { type: "string", enum: ["PENDING", "ACCEPTED", "REJECTED", "COMPLETED", "CANCELED"], example: "PENDING" },
          createdAt: { type: "string", format: "date-time", example: "2026-06-06T12:00:00Z" },
        },
      },
      CreateRequestInput: {
        type: "object",
        required: ["postId", "hoursRequested"],
        properties: {
          postId: { type: "integer", example: 5 },
          hoursRequested: { type: "integer", minimum: 1, example: 3 },
        },
      },
      UpdateStatusInput: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["ACCEPTED", "REJECTED", "COMPLETED", "CANCELED"], example: "ACCEPTED" },
        },
      },
      Review: {
        type: "object",
        properties: {
          id: { type: "integer", example: 801 },
          requestId: { type: "integer", example: 501 },
          reviewerId: { type: "integer", example: 1 },
          revieweeId: { type: "integer", example: 2 },
          rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
          comment: { type: "string", example: "شخص ملتزم جداً بالوقت وقدم الخدمة بأعلى كفاءة." },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CreateReviewInput: {
        type: "object",
        required: ["requestId", "rating"],
        properties: {
          requestId: { type: "integer", example: 501 },
          rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
          comment: { type: "string", example: "ممتاز وأنصح بالتعامل معه." },
        },
      },
      ConversationParticipant: {
        type: "object",
        properties: {
          userId: { type: "integer", example: 2 },
          user: { $ref: "#/components/schemas/UserProfile" },
          joinedAt: { type: "string", format: "date-time", example: "2026-06-06T13:00:00Z" },
        },
      },
      Conversation: {
        type: "object",
        properties: {
          id: { type: "string", example: "clx9f2k3m0000qz8h1a2b3c4d" },
          postId: { type: "integer", example: 5 },
          post: { $ref: "#/components/schemas/Post" },
          participants: {
            type: "array",
            items: { $ref: "#/components/schemas/ConversationParticipant" },
          },
          lastMessage: { $ref: "#/components/schemas/Message" },
          unreadCount: { type: "integer", example: 2, description: "Unread messages for the authenticated user" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ConversationResponse: {
        type: "object",
        properties: {
          conversation: { $ref: "#/components/schemas/Conversation" },
        },
        example: {
          conversation: {
            id: "clx9f2k3m0000qz8h1a2b3c4d",
            postId: 5,
            participants: [
              { userId: 1, user: { id: 1, username: "ahmed_zenaty_test", full_name: "Ahmed Zenaty" } },
              { userId: 2, user: { id: 2, username: "saja_ai_test", full_name: "Saja" } },
            ],
            unreadCount: 0,
            createdAt: "2026-06-06T13:00:00Z",
            updatedAt: "2026-06-06T14:00:00Z",
          },
        },
      },
      ConversationListResponse: {
        type: "object",
        properties: {
          conversations: {
            type: "array",
            items: { $ref: "#/components/schemas/Conversation" },
          },
          nextCursor: { type: "string", nullable: true, example: "clx9f2k3m0000qz8h1a2b3c4d" },
        },
      },
      Message: {
        type: "object",
        properties: {
          id: { type: "string", example: "clx9f2k3m0001qz8h1a2b3c4d" },
          conversationId: { type: "string", example: "clx9f2k3m0000qz8h1a2b3c4d" },
          senderId: { type: "integer", example: 1 },
          sender: { $ref: "#/components/schemas/User" },
          body: { type: "string", nullable: true, example: "مرحباً، هل الخدمة متاحة هذا الأسبوع؟" },
          createdAt: { type: "string", format: "date-time", example: "2026-06-06T14:00:00Z" },
          editedAt: { type: "string", format: "date-time", nullable: true, example: null },
          deletedAt: { type: "string", format: "date-time", nullable: true, example: null },
          readBy: {
            type: "array",
            description: "Read receipts from other participants",
            items: { $ref: "#/components/schemas/MessageReadReceipt" },
          },
        },
      },
      MessageListResponse: {
        type: "object",
        properties: {
          messages: {
            type: "array",
            items: { $ref: "#/components/schemas/Message" },
          },
          nextCursor: { type: "string", nullable: true, example: "clx9f2k3m0001qz8h1a2b3c4d" },
        },
      },
      MessageReadReceipt: {
        type: "object",
        properties: {
          id: { type: "string", example: "clx9f2k3m0002qz8h1a2b3c4d" },
          messageId: { type: "string", example: "clx9f2k3m0001qz8h1a2b3c4d" },
          userId: { type: "integer", example: 2 },
          readAt: { type: "string", format: "date-time", example: "2026-06-06T14:05:00Z" },
        },
      },
      CreateConversationRequest: {
        type: "object",
        required: ["postId"],
        properties: {
          postId: { type: "integer", example: 5, description: "Post that started the conversation" },
          recipientId: {
            type: "integer",
            example: 1,
            description: "Required when the caller is the post owner; omitted when messaging the post owner",
          },
        },
      },
      SendMessageRequest: {
        type: "object",
        required: ["body"],
        properties: {
          body: {
            type: "string",
            minLength: 1,
            maxLength: 2000,
            example: "مرحباً، هل الخدمة متاحة هذا الأسبوع؟",
          },
        },
      },
      EditMessageRequest: {
        type: "object",
        required: ["body"],
        properties: {
          body: {
            type: "string",
            minLength: 1,
            maxLength: 2000,
            example: "مرحباً، هل يمكننا التنسيق يوم الخميس؟",
          },
        },
      },
    },
    responses: {
      BadRequest: {
        description: "Invalid request",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      Unauthorized: {
        description: "Missing, invalid, or expired access token",
        content: { "application/json": { example: { message: "Invalid or expired token" } } },
      },
      TooManyRequests: {
        description: "Rate limit exceeded",
        content: { "application/json": { example: "Too many attempts. Please try again later." } },
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