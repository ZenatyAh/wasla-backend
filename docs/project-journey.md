# Wasla Backend Project Journey

This document is based on the current repository state. It focuses on the backend implementation, architecture, database, authentication, authorization, validation, security, and deployment preparation. Any detail that cannot be confirmed from the current codebase is marked as **Needs confirmation**.

## Project Overview

Wasla is a graduation project backend for a service and skill exchange platform. From the current database schema, the system is designed around users who can offer skills, request skills, create posts, and exchange value through a time-credit style balance.

The backend is implemented with TypeScript, Express, Prisma, and PostgreSQL. It currently provides core authentication and session management features, exposes API documentation through OpenAPI/Swagger, and defines database models for users, skills, posts, categories, sessions, password reset tokens, and transactions.

## Main Goal

The main goal appears to be building a backend that supports a platform where users can exchange services or skills using a controlled credit system instead of direct payment. The schema includes `available_balance`, `escrow_balance`, `Transaction`, skill offers, skill requests, and posts, which suggests a marketplace or service-exchange flow.

The exact final product vision and frontend workflow are **Needs confirmation**.

## Problem The Project Solves

The project appears to solve the problem of connecting people who need services with people who can provide them, while keeping user identity, skills, posts, and exchange records organized in one backend system.

The current backend supports the foundation for:

- User registration and login.
- Skill classification as offered or requested.
- Post modeling for available service requests or offers.
- Session-based refresh-token management.
- Password reset by email.
- Future transaction and contract flows.

## Current System Architecture

The backend follows a modular Express architecture:

- `src/index.ts` starts the HTTP server.
- `src/server.ts` creates and configures the Express application.
- `src/modules/auth` contains authentication routes, controllers, services, and schemas.
- `src/common` contains shared middleware and utility functions.
- `src/lib/prisma.ts` creates the Prisma client using the PostgreSQL adapter.
- `src/docs` contains the OpenAPI spec and Swagger HTML.
- `prisma/schema.prisma` defines the database schema.
- `prisma/migrations` contains database migration history.

The current request flow is:

1. Express receives the request.
2. JSON body middleware parses the request body.
3. Route-specific middleware validates or rate-limits requests.
4. Controller extracts request data and calls a service.
5. Service performs database operations through Prisma.
6. Controller returns a JSON response or a standardized error response.

## Backend Responsibilities

The backend currently handles:

- API routing.
- Authentication and session lifecycle.
- Password hashing.
- Refresh-token rotation.
- Password reset token generation and validation.
- Email delivery for reset-password links.
- Request validation with Zod.
- Rate limiting for sensitive authentication routes.
- Database persistence with Prisma and PostgreSQL.
- OpenAPI documentation for implemented endpoints.
- Basic health and protected-user endpoints.

Backend responsibilities that are planned or implied but not fully implemented:

- Posts API.
- Skills and categories API.
- Profile management API.
- Transaction and contract workflows.
- Role-based authorization.
- Chat system backend.
- Notification system.
- Automated test coverage.
- Production deployment hardening.

## Main Modules And Features Implemented So Far

### Authentication

The authentication module currently supports:

- Register: `POST /auth/register`
- Login: `POST /auth/login`
- Refresh access token: `POST /auth/refresh`
- Logout: `POST /auth/logout`
- Forgot password: `POST /auth/forget-password`
- Reset password: `POST /auth/reset-password`
- Protected token payload check: `GET /me`

Registration creates a user, hashes the password with bcrypt, creates offered and requested skills, creates a session, returns an access token, and stores the refresh token in an httpOnly cookie.

Login verifies the email and password, creates a session, returns an access token, and stores a refresh token cookie.

Refresh verifies the refresh token, checks the stored session, rotates the refresh token, updates the session, and returns a new access token.

Logout deletes the matching refresh-token session and clears refresh-token cookies.

### Password Reset

Password reset is implemented using:

- Random token generation.
- HMAC hashing of the token before storing it.
- Token expiration.
- Single-use token behavior through `usedAt`.
- Session invalidation after password reset.
- Email delivery through Nodemailer and Gmail configuration.

### Database Models

The current Prisma schema includes:

- `User`
- `Skill`
- `UserSkill`
- `Transaction`
- `Session`
- `PasswordResetToken`
- `POST`
- `PostSkills`
- `Category`

These models show that the backend is preparing for a wider platform beyond authentication.

## APIs And Backend Services Implemented

Confirmed APIs from the current routes and OpenAPI documentation:

| Area | Endpoint | Purpose | Status |
|------|----------|---------|--------|
| System | `GET /` | Backend welcome endpoint | Implemented |
| System | `GET /health` | Health check | Implemented |
| Docs | `GET /docs` | Swagger UI | Implemented |
| Docs | `GET /docs/openapi.json` | OpenAPI JSON | Implemented |
| User | `GET /me` | Protected token payload check | Implemented |
| Auth | `POST /auth/register` | Register user and create session | Implemented |
| Auth | `POST /auth/login` | Login and create session | Implemented |
| Auth | `POST /auth/refresh` | Rotate refresh token | Implemented |
| Auth | `POST /auth/logout` | Logout current refresh-token session | Implemented |
| Auth | `POST /auth/forget-password` | Request password reset email | Implemented |
| Auth | `POST /auth/reset-password` | Reset password using token | Implemented |

APIs not found in the current code:

- Posts CRUD APIs.
- Categories APIs.
- Skills search/list APIs.
- Profile update APIs.
- Transactions APIs.
- Contract APIs.
- Chat APIs.
- Admin APIs.

## Database Design Decisions

The project uses PostgreSQL through Prisma. The database design separates core concepts:

- Users are stored in `users`.
- Skills are normalized into a shared `skills` table.
- User skills are linked through `user_skills` with a `skill_type` enum: `OFFER` or `REQUEST`.
- Posts support service mode, post status, location, category, and multiple skills.
- Sessions are stored in a dedicated `session` table, enabling refresh-token tracking and invalidation.
- Password reset tokens are stored separately from users and only store token hashes.
- Transactions are modeled with sender, receiver, amount, type, and an optional future contract reference.

The `Transaction.reference_contract_id` comment indicates that a contract table is planned later. This is **Needs confirmation**.

## Authentication And Authorization Decisions

Authentication currently uses JWT:

- Short-lived access token: 15 minutes.
- Long-lived refresh token: 7 days.
- Refresh token stored in a database session record.
- Refresh token sent to the client as an httpOnly cookie.
- Access token expected in the `Authorization: Bearer <token>` header.

Authorization is currently minimal:

- `authMiddleware` verifies the access token and attaches the payload to the request.
- No role model or permission table exists in the current schema.
- No admin/user separation is currently implemented.

Role-based authorization and admin controls are **Needs confirmation** and should be treated as remaining work.

## Security Considerations

Security mechanisms already present:

- Passwords are hashed with bcrypt.
- Access tokens expire after 15 minutes.
- Refresh tokens expire after 7 days.
- Refresh tokens are stored in httpOnly cookies.
- Refresh-token rotation is implemented.
- Password reset tokens are hashed with HMAC before database storage.
- Reset tokens expire after 15 minutes.
- Reset password invalidates existing sessions.
- Rate limiting is applied to login and password-reset routes.
- Environment variables are required for `DATABASE_URL` and `JWT_SECRET`.
- JSON body size is limited through `JSON_BODY_LIMIT` or the default `1mb`.
- Password policy requires uppercase, lowercase, number, and special character.

Security areas still requiring work:

- CSRF strategy for cookie-based refresh flow: **Needs confirmation**.
- Production CORS allowlist.
- Centralized error handling.
- Role-based authorization.
- Input validation for future modules.
- Audit logging for sensitive operations.
- Secure secret management in deployment.
- Email verification flow. The `is_verified` field exists, but the login check is commented out.

## Validation And Error Handling Approach

Validation currently uses Zod schemas in `auth.schema.ts`. The `validateResource` middleware parses request bodies and returns structured validation errors with status `400`.

Business errors are returned through `sendError`, which produces:

```json
{
  "status": "fail",
  "message": "..."
}
```

Invalid JSON request bodies are handled by a custom JSON middleware that supports normal JSON parsing and a lenient double-stringified JSON case.

The current error handling is useful for the authentication module, but a global application-level error strategy is not fully implemented.

## File And Folder Structure Explanation

| Path | Purpose |
|------|---------|
| `src/index.ts` | Starts the server and reads the port from environment variables |
| `src/server.ts` | Configures Express, routes, docs, health checks, and middleware |
| `src/modules/auth` | Authentication controllers, services, schemas, and routes |
| `src/common/middleware` | Shared middleware for auth, validation, rate limiting, and JSON parsing |
| `src/common/utils` | Shared helpers for JWT, cookies, env, email, errors, metadata, and reset tokens |
| `src/lib/prisma.ts` | Prisma client setup |
| `src/docs` | OpenAPI spec and Swagger HTML |
| `prisma/schema.prisma` | Database models and relations |
| `prisma/migrations` | Migration history |
| `docker-compose.yml` | Local PostgreSQL and Redis containers |

## Important Technical Decisions

- Express was chosen for a direct REST API backend.
- TypeScript was chosen to improve maintainability and type safety.
- Prisma was chosen as ORM and migration tool.
- PostgreSQL was chosen as the relational database.
- Authentication uses access tokens plus refresh-token sessions.
- Refresh tokens are stored in httpOnly cookies instead of local storage.
- Password reset tokens are stored as HMAC hashes, not raw tokens.
- Skills are normalized and linked through a many-to-many relation with an offer/request type.
- OpenAPI documentation is included in the backend.
- Docker Compose prepares local PostgreSQL and Redis services.

Redis is defined in Docker Compose but not currently used in the code. Its intended purpose is **Needs confirmation**.

## Challenges Faced During Development

Based on the code and migrations, likely technical challenges include:

- Designing a flexible schema for offered and requested skills.
- Managing secure session lifecycle with token rotation.
- Handling password reset securely without storing raw reset tokens.
- Keeping registration atomic while creating users and skills.
- Preparing future post, transaction, and contract features before full API implementation.
- Dealing with enum naming changes in migrations from `ServiceType` to `skill_type`.
- Balancing frontend integration needs with backend security for cookies and reset links.

## Completed So Far

- Express app setup.
- PostgreSQL and Prisma setup.
- Prisma schema and migrations.
- User registration.
- Login.
- JWT access tokens.
- Refresh-token session storage.
- Refresh-token rotation.
- Logout.
- Password reset request.
- Password reset execution.
- Auth validation with Zod.
- Password hashing with bcrypt.
- Rate limiting on sensitive routes.
- Swagger/OpenAPI documentation for current APIs.
- Docker Compose for local PostgreSQL and Redis.

## Still Needs Implementation

- User profile APIs.
- Posts APIs.
- Skills and categories APIs.
- Transaction APIs.
- Contract or service agreement model and APIs.
- Authorization roles and admin separation.
- Chat backend.
- Notification system.
- Email verification flow.
- Automated tests.
- CI/CD pipeline.
- Production CORS and deployment configuration.
- More complete OpenAPI coverage as new modules are added.

## Lessons Learned

- Authentication should be designed around both user experience and security.
- Storing refresh tokens in a database gives the backend control over logout and token rotation.
- Password reset flows should store token hashes rather than raw tokens.
- A normalized skill model supports future search, filtering, and matching.
- Prisma migrations make schema evolution visible and reviewable.
- API documentation should be maintained while features are built, not only at the end.
- Early database design decisions affect future modules such as posts, contracts, transactions, and chat.
