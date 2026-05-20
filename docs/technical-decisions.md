# Technical Decisions

This document is based on the current repository state. Decisions that cannot be fully confirmed from the code are marked as **Needs confirmation**.

# Technical Decision: Use Express For The Backend API

## Context

The project needs an HTTP API server for authentication, user operations, and future marketplace features.

## Decision

Use Express as the backend framework.

## Reasoning

Express gives the project a direct and flexible way to define REST endpoints, middleware, and modular routes. The current code uses Express routes, controllers, and middleware in a simple structure that fits a graduation project backend.

## Alternatives Considered

Possible alternatives include NestJS, Fastify, or Hono. These are not present in the current implementation.

## Impact

The backend remains lightweight and easy to understand, but architectural discipline must be maintained manually through folder structure, validation, and service separation.

# Technical Decision: Use TypeScript

## Context

The backend handles authentication, database models, and API contracts where type mistakes can create runtime bugs.

## Decision

Use TypeScript with ES modules.

## Reasoning

TypeScript improves maintainability by allowing typed schemas, request data, utilities, and service return values. It also supports safer future growth as more backend modules are added.

## Alternatives Considered

Plain JavaScript could be used, but it would provide less compile-time safety.

## Impact

The project gains better structure and maintainability, with the cost of requiring a build step and TypeScript configuration.

# Technical Decision: Use Prisma With PostgreSQL

## Context

The project requires relational data: users, skills, sessions, posts, categories, transactions, and future contracts or chat records.

## Decision

Use Prisma as the ORM and PostgreSQL as the database.

## Reasoning

PostgreSQL is well suited for relational data and constraints. Prisma provides a clear schema file, generated client, migrations, and type-safe database access.

## Alternatives Considered

Possible alternatives include raw SQL with `pg`, TypeORM, Sequelize, MySQL, or MongoDB. The current schema is relational, so PostgreSQL fits the data model better than a document database.

## Impact

Database design is centralized in `prisma/schema.prisma`, and migrations document schema changes over time.

# Technical Decision: REST API Architecture

## Context

The frontend needs predictable endpoints for authentication and future platform features.

## Decision

Use REST endpoints grouped by feature, currently under `/auth` plus system and docs endpoints.

## Reasoning

REST is easy to document with OpenAPI, easy to test with Postman or Swagger, and appropriate for standard CRUD and authentication workflows.

## Alternatives Considered

GraphQL or RPC-style APIs could be used, but no evidence of those approaches exists in the repository.

## Impact

Future modules should continue using clear resource-based endpoints and maintain OpenAPI documentation.

# Technical Decision: Separate Routes, Controllers, Services, And Schemas

## Context

Authentication includes validation, HTTP response handling, business logic, and database access.

## Decision

Separate responsibilities across route files, controllers, services, and Zod schemas.

## Reasoning

This keeps route registration, HTTP handling, validation, and business logic easier to maintain. The authentication module already follows this pattern.

## Alternatives Considered

All logic could be placed directly inside route handlers, but that would become difficult to test and maintain.

## Impact

Future backend modules should follow the same pattern to keep the codebase consistent.

# Technical Decision: Use JWT Access Tokens And Refresh Sessions

## Context

The backend needs secure authentication while keeping users logged in across requests.

## Decision

Use short-lived JWT access tokens and long-lived refresh tokens stored in the `Session` table.

## Reasoning

Access tokens allow stateless authorization checks for protected endpoints. Refresh sessions allow the backend to rotate tokens, delete sessions on logout, and invalidate sessions after password reset.

## Alternatives Considered

Alternatives include server-only sessions, long-lived access tokens, or opaque tokens only. The chosen approach balances stateless API access with server-side refresh control.

## Impact

The backend can manage session lifecycle, but must protect refresh-token cookies and handle token rotation correctly.

# Technical Decision: Store Refresh Token In HttpOnly Cookie

## Context

Refresh tokens are sensitive and should not be easily accessible to frontend JavaScript.

## Decision

Set the refresh token in an httpOnly cookie named `refreshToken`.

## Reasoning

HttpOnly cookies reduce exposure to token theft through client-side script access. The cookie is also configured as `sameSite: "strict"` and `secure` in production.

## Alternatives Considered

Local storage or returning the refresh token in the response body could be simpler, but both increase exposure if frontend JavaScript is compromised.

## Impact

The frontend must support cookie-based refresh requests. CSRF strategy for production is **Needs confirmation**.

# Technical Decision: Rotate Refresh Tokens

## Context

Refresh tokens can be stolen or reused if they remain valid for a long time.

## Decision

When `/auth/refresh` is called, issue a new access token and a new refresh token, then update the existing session record.

## Reasoning

Rotation reduces the lifetime of any single refresh token and supports stronger session control.

## Alternatives Considered

The same refresh token could be reused until expiration, but this would be weaker.

## Impact

The backend must keep the session table consistent and the frontend must rely on the latest cookie.

# Technical Decision: Hash Passwords With Bcrypt

## Context

User passwords must never be stored as plain text.

## Decision

Hash passwords with bcrypt before storing them in the database.

## Reasoning

Bcrypt is a mature password-hashing library designed to slow down brute-force attacks.

## Alternatives Considered

Argon2 or scrypt could also be used. The current implementation uses bcrypt.

## Impact

User password verification requires bcrypt comparison during login. Password reset also rehashes the new password.

# Technical Decision: Use Zod For Request Validation

## Context

Authentication endpoints require strict validation for email, password, names, and skill arrays.

## Decision

Use Zod schemas and a validation middleware.

## Reasoning

Zod keeps validation rules close to TypeScript types and provides structured error messages.

## Alternatives Considered

Joi, Yup, express-validator, or manual validation could be used. Zod is already present and integrated.

## Impact

Future modules should define schemas before controllers process request data.

# Technical Decision: Model Skills As Offer Or Request

## Context

Users can provide some skills and need other skills.

## Decision

Use a shared `Skill` table and a join table `UserSkill` with `skill_type` enum values `OFFER` and `REQUEST`.

## Reasoning

This avoids duplicating skill names and supports querying users by skill and intent.

## Alternatives Considered

Skills could be stored as arrays on the user record, but that would make searching, uniqueness, and filtering harder.

## Impact

The schema supports future matching and discovery features.

# Technical Decision: Store Password Reset Tokens As HMAC Hashes

## Context

Password reset tokens are sensitive because they can allow account takeover.

## Decision

Generate a random token for the email link, store only its HMAC hash in the database, and validate by hashing the submitted token.

## Reasoning

If the database is exposed, raw reset tokens are not directly available.

## Alternatives Considered

Storing raw reset tokens would be simpler but less secure.

## Impact

The reset flow is safer and supports expiration and single-use behavior.

# Technical Decision: Use Environment Variables For Configuration

## Context

Database URLs, JWT secrets, token secrets, and email credentials differ between local and production environments.

## Decision

Load configuration from environment variables and require critical values.

## Reasoning

This keeps secrets out of source code and allows deployment environments to provide their own values.

## Alternatives Considered

Hardcoded configuration would be unsafe. Config files could be used, but secrets should still come from environment or secret stores.

## Impact

Deployment must provide `DATABASE_URL`, `JWT_SECRET`, and email credentials when password reset is enabled.

# Technical Decision: Include OpenAPI And Swagger Documentation

## Context

The backend needs clear API documentation for teammates, supervisors, and frontend integration.

## Decision

Expose OpenAPI JSON at `/docs/openapi.json` and Swagger HTML at `/docs`.

## Reasoning

OpenAPI makes implemented endpoints easier to test and understand.

## Alternatives Considered

Documentation could live only in Markdown or Postman collections, but runtime API docs are more accessible.

## Impact

The OpenAPI spec should be updated whenever endpoints are added or changed.

# Technical Decision: Prepare Local Services With Docker Compose

## Context

Developers need a repeatable local database setup.

## Decision

Use Docker Compose for PostgreSQL and Redis.

## Reasoning

Docker Compose makes local infrastructure easier to start consistently.

## Alternatives Considered

Developers could install PostgreSQL and Redis manually.

## Impact

PostgreSQL is clearly used by Prisma. Redis is present in Docker Compose but not used in current code, so its intended purpose is **Needs confirmation**.

# Technical Decision: Future Chat System Is Not Implemented Yet

## Context

The project request mentions a chat system, but the current codebase does not contain chat, message, socket, or conversation modules.

## Decision

Document the chat system as a future backend plan.

## Reasoning

Planning the chat backend now helps align database schema, permissions, and API design with the existing architecture.

## Alternatives Considered

Chat could be postponed entirely, or implemented only as REST without real-time communication. The best option depends on product requirements.

## Impact

Chat schema, APIs, permissions, and real-time transport need confirmation before implementation.
