# Wasla Backend

Wasla Backend is the server-side part of a graduation project for a skill and service exchange platform. The backend is responsible for authentication, session management, database modeling, validation, security foundations, API documentation, and preparation for future modules such as posts, transactions, contracts, chat, and notifications.

This README is based on the current repository state.

## Backend Focus

This repository currently focuses on backend development only:

- API architecture with Express and TypeScript.
- Database design with Prisma and PostgreSQL.
- Authentication and session lifecycle.
- Password reset flow by email.
- Request validation and error handling.
- Backend documentation and OpenAPI preparation.
- Deployment preparation through scripts, environment variables, and Docker Compose.

## Project Goal

Wasla appears to be designed as a platform where users can offer and request skills or services. The database includes users, skills, posts, balances, and transactions, which suggests a time-credit or service-exchange model.

The exact final business workflow is **Needs confirmation**.

## Current Tech Stack

| Area | Technology |
|------|------------|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT + refresh-token sessions |
| Password hashing | bcrypt |
| Validation | Zod |
| Email | Nodemailer |
| API docs | OpenAPI / Swagger |
| Local services | Docker Compose |

## Current Backend Features

Implemented:

- User registration.
- User login.
- JWT access-token generation.
- Refresh-token sessions.
- Refresh-token rotation.
- Logout by deleting the current session.
- Password reset request.
- Password reset with hashed reset tokens.
- Password hashing with bcrypt.
- Zod validation for authentication requests.
- Rate limiting on sensitive authentication endpoints.
- Protected `/me` endpoint.
- Health check endpoint.
- OpenAPI JSON and Swagger UI.
- Prisma schema and migrations.
- Local PostgreSQL setup with Docker Compose.

Partially implemented or database-ready:

- User profiles.
- Skills and user skills.
- Posts.
- Categories.
- Transactions.
- Email verification.

Not implemented yet:

- Posts APIs.
- Profile APIs.
- Skills and categories APIs.
- Contracts.
- Transaction workflows.
- Role-based authorization.
- Chat system backend.
- Notification system.
- Automated tests.
- CI/CD pipeline.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Backend welcome endpoint |
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Swagger UI |
| `GET` | `/docs/openapi.json` | OpenAPI JSON |
| `GET` | `/me` | Protected authenticated user payload |
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login user |
| `POST` | `/auth/refresh` | Rotate refresh token and issue a new access token |
| `POST` | `/auth/logout` | Logout current session |
| `POST` | `/auth/forget-password` | Request password reset email |
| `POST` | `/auth/reset-password` | Reset password using email token |

## Repository Structure

```text
.
├── docs/
│   ├── project-journey.md
│   ├── technical-decisions.md
│   ├── remaining-work-plan.md
│   └── chat-system-plan.md
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── common/
│   │   ├── middleware/
│   │   └── utils/
│   ├── docs/
│   ├── lib/
│   ├── modules/
│   │   └── auth/
│   ├── index.ts
│   └── server.ts
├── docker-compose.yml
├── package.json
├── prisma.config.ts
└── tsconfig.json
```

## Environment Variables

Create a `.env` file from `.env.example` and provide the required values.

Required:

```env
DATABASE_URL=
JWT_SECRET=
EMAIL_USER=
EMAIL_PASSWORD=
```

Optional:

```env
TOKEN_SECRET=
PORT=3000
NODE_ENV=production
FRONTEND_URL=http://localhost:3000
JSON_BODY_LIMIT=1mb
RESEND_API_KEY=
```

Notes:

- `TOKEN_SECRET` is used for password-reset HMAC hashing.
- If `TOKEN_SECRET` is missing, the code falls back to `JWT_SECRET`.
- `EMAIL_USER` and `EMAIL_PASSWORD` are required for sending password reset emails.
- Gmail requires an app password, not the normal account password.

## Local Development

Install dependencies:

```bash
npm install
```

Start local services:

```bash
docker compose up -d
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Run migrations in development:

```bash
npm run prisma:migrate
```

Start the development server:

```bash
npm run dev
```

Default local server:

```text
http://localhost:3000
```

Swagger docs:

```text
http://localhost:3000/docs
```

## Build And Production Start

Build:

```bash
npm run build
```

Start:

```bash
npm start
```

The production start script runs:

```bash
prisma migrate deploy && node dist/index.js
```

## Database Overview

Current Prisma models:

- `User`
- `Skill`
- `UserSkill`
- `Transaction`
- `Session`
- `PasswordResetToken`
- `POST`
- `PostSkills`
- `Category`

Important design points:

- Users have `available_balance` and `escrow_balance`.
- Skills are normalized in a separate table.
- User skills are classified as `OFFER` or `REQUEST`.
- Sessions store refresh tokens.
- Password reset tokens store hashes, not raw tokens.
- Posts are linked to users, skills, and optional categories.
- Transactions support transfer, refund, and welcome bonus types.

## Authentication Design

The current authentication system uses:

- Short-lived access tokens.
- Long-lived refresh tokens.
- Refresh-token storage in the database.
- Refresh-token rotation.
- httpOnly refresh-token cookies.
- Bearer access tokens for protected endpoints.

Current token durations:

| Token | Duration |
|-------|----------|
| Access token | 15 minutes |
| Refresh token | 7 days |
| Password reset token | 15 minutes |

## Security Notes

Current security measures:

- bcrypt password hashing.
- JWT access-token expiration.
- Refresh-token session storage.
- Refresh-token rotation.
- httpOnly cookie for refresh token.
- HMAC hashing for password-reset tokens.
- Rate limiting for login and reset routes.
- Zod validation.
- Required environment variables for secrets.
- JSON body size limit.

Needs future review:

- Production CORS allowlist.
- CSRF protection strategy for cookie-based refresh flow.
- Role-based authorization.
- Admin/moderator permissions.
- Structured logging and monitoring.
- Audit logs for sensitive actions.
- Production secret management.

## Documentation

Additional backend documentation is available in:

- [Project Journey](docs/project-journey.md)
- [Technical Decisions](docs/technical-decisions.md)
- [Remaining Work Plan](docs/remaining-work-plan.md)
- [Chat System Plan](docs/chat-system-plan.md)

These files are written for supervisors, teammates, and future developers.

## Chat System Status

No chat-related backend code was found in the current repository state.

The planned chat system is documented as future work in:

- [Chat System Plan](docs/chat-system-plan.md)

The implementation should confirm:

- When users are allowed to start conversations.
- Whether chat is linked to posts, contracts, or both.
- Whether real-time communication is required.
- Whether notifications are required.

## Deployment Preparation Checklist

Before production deployment:

- Configure production `DATABASE_URL`.
- Configure strong `JWT_SECRET` and `TOKEN_SECRET`.
- Configure email credentials.
- Configure `FRONTEND_URL`.
- Review CORS settings.
- Review cookie settings for HTTPS and domain.
- Run Prisma migrations with `prisma migrate deploy`.
- Run `npm run build`.
- Add production logging.
- Add database backups.
- Add CI/CD checks.

## Known Gaps

- No automated test suite is currently configured.
- Redis exists in `docker-compose.yml` but is not used in the current code.
- Admin/user role separation is not implemented.
- Posts and transactions have database models but no API modules yet.
- Contract workflow is implied by `reference_contract_id` but not implemented.
- Email verification field exists, but the active login flow does not enforce it.

## Academic Note

This repository shows the backend journey of building a real graduation project incrementally: starting with authentication and database foundations, then preparing the architecture for marketplace features, secure transactions, and future real-time communication.
