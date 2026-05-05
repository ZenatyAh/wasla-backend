# Remaining Backend Work Plan

This document is based on the current repository state. It focuses on backend work only. Items that cannot be confirmed from the code are marked as **Needs confirmation**.

## Features Already Completed

- Express server setup.
- TypeScript project setup.
- Prisma and PostgreSQL integration.
- Database schema and migrations.
- User registration.
- Login.
- JWT access token generation.
- Refresh-token sessions.
- Refresh-token rotation.
- Logout by deleting the current refresh-token session.
- Password reset request.
- Password reset execution.
- Reset-token hashing with HMAC.
- Password hashing with bcrypt.
- Zod validation for authentication inputs.
- Rate limiting for sensitive authentication endpoints.
- OpenAPI and Swagger docs for current auth/system endpoints.
- Docker Compose for PostgreSQL and Redis.

## Features Partially Completed

- User profile: database fields exist, but profile APIs are not implemented.
- Skills: database schema and registration integration exist, but public skill APIs are not implemented.
- Posts: Prisma models exist, but routes/controllers/services are not implemented.
- Categories: Prisma model exists, but APIs are not implemented.
- Transactions: Prisma model exists, but transaction workflows are not implemented.
- Email verification: `is_verified` exists, but the login verification check is commented out.
- Deployment preparation: build/start scripts and Docker Compose exist, but production deployment configuration is incomplete.
- OpenAPI: current authentication endpoints are documented, but future modules are not.

## Features Not Started Yet

- Chat backend.
- Notification backend.
- Admin/user role separation.
- Authorization policies beyond token verification.
- Contracts or service agreements.
- Automated tests.
- CI/CD pipeline.
- Production logging and monitoring.
- Audit logs for security-sensitive events.

## Suggested Implementation Order

1. Stabilize authentication and environment configuration.
2. Add automated tests for existing auth flows.
3. Implement profile, skills, and categories APIs.
4. Implement posts APIs.
5. Implement contract and transaction workflows.
6. Add authorization roles and permissions if required.
7. Implement chat backend.
8. Add notification support.
9. Complete OpenAPI coverage.
10. Prepare production deployment and CI/CD.

## Jira-Ready Backend Tasks

| Epic | Task | Description | Priority | Complexity | Dependencies | Acceptance Criteria |
|------|------|-------------|----------|------------|--------------|---------------------|
| Authentication | Add auth integration tests | Test register, login, refresh, logout, forgot password, and reset password flows | High | Medium | Existing auth module | Tests cover success and failure cases and can run with a test database |
| Authentication | Review email verification flow | Decide whether `is_verified` should block login and implement verification if required | Medium | Medium | Product decision | Verification behavior is documented and implemented or explicitly removed |
| Authentication | Harden refresh-token cookie configuration | Review SameSite, Secure, domain, path, and CSRF strategy for production | High | Medium | Deployment domain decision | Cookie settings are production-ready and documented |
| Authentication | Normalize auth response shape | Review differences such as `username` vs `Username` in auth responses | Medium | Easy | Frontend contract | Auth responses use a consistent documented shape |
| Users | Implement profile read endpoint | Add authenticated API for retrieving the current user's profile | High | Easy | Auth middleware | Authenticated user can retrieve profile fields safely |
| Users | Implement profile update endpoint | Allow updating bio, profile image, location, and allowed profile fields | High | Medium | Profile validation schema | Updates are validated and protected by authentication |
| Skills | Implement skill list/search API | Provide API to list and search available skill names | Medium | Medium | Skill model | API supports frontend skill selection and avoids duplicates |
| Skills | Implement user skills update API | Allow users to update offered and requested skills | Medium | Medium | Auth, Skill model | User skills can be replaced or updated without duplicate records |
| Categories | Implement category API | Add list/create/update/delete or seed strategy for categories | Medium | Medium | Product decision | Category behavior is implemented and documented |
| Posts | Implement create post API | Create posts linked to user, skills, category, service mode, and type | High | Medium | Auth, skills, categories | Authenticated user can create valid posts |
| Posts | Implement post listing and filtering | Support listing available posts by type, skills, category, location, and status | High | Hard | Create post API | Frontend can display searchable marketplace content |
| Posts | Implement post detail API | Return a single post with owner, skills, and category details | High | Medium | Post listing | Post detail is accessible with complete related data |
| Posts | Implement post update/archive API | Allow owners to update or archive their own posts | High | Medium | Authorization rules | Only post owners can modify their posts |
| Transactions | Define contract model | Add a proper contract or agreement model instead of only `reference_contract_id` | High | Hard | Product workflow decision | Contract lifecycle is represented in Prisma schema |
| Transactions | Implement transaction service | Support transfer, refund, welcome bonus, and escrow-related operations | High | Hard | Contract model | Balance changes are atomic and recorded in transactions |
| Transactions | Add balance integrity checks | Prevent negative balances and inconsistent escrow updates | High | Hard | Transaction service | Invalid balance operations fail safely |
| Authorization | Define role model | Decide whether roles such as user/admin/moderator are required | Medium | Medium | Product decision | Role strategy is documented and represented in schema if needed |
| Authorization | Add ownership guards | Protect user-owned resources such as posts, conversations, and profile data | High | Medium | Resource APIs | Users cannot modify resources they do not own |
| Chat | Design chat schema | Add conversation, participant, message, and read-receipt models | Medium | Hard | Chat requirements | Schema supports direct service-related conversations |
| Chat | Implement chat REST APIs | Add conversation creation, message listing, and message sending APIs | Medium | Hard | Chat schema, auth | Users can only access conversations they participate in |
| Chat | Decide real-time transport | Choose Socket.IO, WebSocket, or REST-only polling | Medium | Medium | Frontend requirements | Decision is documented and implementation path is clear |
| Notifications | Define notification requirements | Decide events that should notify users | Low | Medium | Chat and transaction decisions | Notification scope is documented |
| Documentation | Expand OpenAPI coverage | Add docs for profile, posts, skills, categories, transactions, and chat as implemented | Medium | Medium | New APIs | Swagger reflects current backend behavior |
| Testing | Add database test setup | Create isolated test database configuration and migration strategy | High | Medium | Test framework decision | Tests can run without affecting development data |
| Testing | Add validation and error tests | Test invalid inputs and consistent error responses | Medium | Medium | API implementations | Invalid requests return expected status and error shape |
| Deployment | Prepare production environment checklist | Document required variables, migration commands, secrets, and deployment steps | High | Easy | Hosting decision | Deployment checklist is complete and usable |
| Deployment | Add CI pipeline | Run build and tests on pull requests | Medium | Medium | Test scripts | CI fails on broken build or failing tests |
| Deployment | Add production logging strategy | Decide structured logging and error reporting approach | Medium | Medium | Hosting decision | Runtime errors can be monitored in production |

## Testing Tasks

- Add a test framework such as Jest, Vitest, or another selected tool. Decision is **Needs confirmation**.
- Create a test database strategy.
- Test registration with valid and invalid inputs.
- Test duplicate email and username behavior.
- Test login success and invalid credentials.
- Test refresh-token rotation.
- Test logout idempotency.
- Test forgot-password behavior without leaking whether an email exists.
- Test reset-password token expiration and reuse prevention.
- Add future tests for posts, skills, transactions, and chat.

## Documentation Tasks

- Keep `src/docs/openapi.ts` synchronized with implemented APIs.
- Add examples for each new endpoint.
- Document environment variables.
- Document database migration workflow.
- Document production deployment steps.
- Document security decisions and known limitations.

## Deployment Preparation Tasks

- Confirm hosting platform: **Needs confirmation**.
- Configure production `DATABASE_URL`, `JWT_SECRET`, `TOKEN_SECRET`, email credentials, and `FRONTEND_URL`.
- Review CORS allowlist for frontend domains.
- Review cookie settings for production domain and HTTPS.
- Run `prisma migrate deploy` during deployment.
- Ensure `npm run build` generates deployable output.
- Add health-check monitoring for `/health`.
- Add logging and error reporting.
- Add backup strategy for PostgreSQL.
