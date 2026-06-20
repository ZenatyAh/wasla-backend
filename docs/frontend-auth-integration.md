# Frontend integration guide — Auth, Clerk, Chat

Backend base URL examples:

```
Development: http://localhost:3000
Production:  https://YOUR_API_DOMAIN
```

Swagger (always up to date with routes):

```
GET /docs
GET /openapi.json
```

---

## 1. Shared rules (all auth flows)

### HTTP client

Every authenticated request:

```
Authorization: Bearer <accessToken>
credentials: include
```

`credentials: include` is required so the browser sends the httpOnly `refreshToken` cookie on:

```
POST /auth/refresh
POST /auth/logout
```

### Token storage

| Item | Where |
|------|-------|
| `accessToken` | memory or secure client storage (Redux, Zustand, etc.) |
| `refreshToken` | httpOnly cookie only — never read from JS |

### Access token lifetime

About 15 minutes. Refresh before expiry:

```
POST /auth/refresh
```

Response:

```json
{ "accessToken": "..." }
```

A new `refreshToken` cookie is rotated automatically.

### Production cookies

When `NODE_ENV=production` on the backend:

```
SameSite=None
Secure=true
```

Frontend and API must use HTTPS and compatible domains.

---

## 2. Legacy email/password auth (still supported)

Use for users **not** linked to Clerk.

### Register

```
POST /auth/register
Content-Type: application/json
credentials: include
```

Body:

```json
{
  "full_name": "Ahmed Ali",
  "username": "ahmed_ali",
  "email": "user@example.com",
  "password": "Pass@1234",
  "bio": "At least fifty characters for validation in the register schema...",
  "offeredSkills": ["JavaScript"],
  "requiredSkills": ["Design"]
}
```

Response `200`:

```json
{
  "accessToken": "...",
  "user": { "id": 1, "email": "...", "username": "..." }
}
```

Also sets `refreshToken` cookie.

### Login

```
POST /auth/login
credentials: include
```

Body:

```json
{ "email": "user@example.com", "password": "Pass@1234" }
```

### Logout

```
POST /auth/logout
credentials: include
```

Response: `204`

### Forgot password (legacy users only)

```
POST /auth/forget-password
```

Body:

```json
{ "email": "user@example.com" }
```

Always returns:

```json
{ "message": "If the email exists, we sent a reset link" }
```

Email contains a link to:

```
{FRONTEND_URL}/reset-password?token=...
```

Frontend page must call:

```
POST /auth/reset-password
```

Body:

```json
{
  "token": "<from query string>",
  "newPassword": "NewPass@1234"
}
```

### Blocked for Clerk-linked users

If the account has `clerk_user_id`, these return `400`:

```
POST /auth/login        → "Please sign in with Clerk"
POST /auth/reset-password
```

---

## 3. Clerk auth (recommended for new users)

### Frontend env

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Use the same Clerk application as the backend.

### Sign-up metadata (required for new Clerk users)

Before the first session exchange, write this to Clerk `unsafeMetadata` (during sign-up or onboarding step):

```json
{
  "username": "ahmed_ali",
  "full_name": "Ahmed Ali",
  "offeredSkills": ["JavaScript"],
  "requiredSkills": ["Design"]
}
```

Without `username` and `full_name`, `POST /auth/clerk/session` returns `400`.

### Session exchange flow

After Clerk sign-in:

```typescript
const token = await clerk.session.getToken();

await fetch(`${API_URL}/auth/clerk/session`, {
  method: "POST",
  credentials: "include",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

Response `200`:

```json
{
  "accessToken": "...",
  "user": { "id": 1, "email": "...", "username": "..." }
}
```

Also sets Wasla `refreshToken` cookie. From this point, use Wasla `accessToken` for all API calls (same as legacy auth).

### Linking existing legacy account

If the user already exists locally with the same email and no `clerk_user_id`, the backend links accounts automatically on first session exchange.

### Forgot password (Clerk users)

```
POST /auth/clerk/forgot-password
```

Body:

```json
{ "email": "user@example.com" }
```

Response `200`:

```json
{
  "message": "If the email exists, we sent a reset link",
  "resetUrl": "https://stunning-cow-73.accounts.dev/reset-password"
}
```

When `resetUrl` is present, redirect the user there instead of the legacy reset page.

### Sign out (full logout)

1. `POST /auth/logout` with `credentials: include`
2. `clerk.signOut()` on the frontend

---

## 4. Current user

```
GET /me
Authorization: Bearer <accessToken>
```

---

## 5. Chat changes in this release

### Direct conversation (no post)

Use when opening chat from a user profile:

```
POST /conversations/direct
Authorization: Bearer <accessToken>
```

Body:

```json
{ "recipientId": 42 }
```

- `201` — new conversation
- `200` — existing conversation reused

Post-linked conversations still use:

```
POST /conversations
{ "postId": 123, "recipientId": 42 }
```

### Notifications — mark all as read

Use this exact path (order matters):

```
PATCH /notifications/all/read
Authorization: Bearer <accessToken>
```

Do **not** call `PATCH /notifications/all/read` as `/:id/read` with `id=all`.

---

## 6. Suggested frontend migration plan

1. Add `@clerk/nextjs` (or Clerk SDK for your stack).
2. Keep legacy login/register screens for existing users during transition.
3. After Clerk sign-in, always call `POST /auth/clerk/session`.
4. Store Wasla `accessToken`; attach it to axios/fetch interceptors.
5. Implement refresh via `POST /auth/refresh` on `401`.
6. Route forgot-password by account type:
   - try legacy flow only for non-Clerk users
   - use `POST /auth/clerk/forgot-password` when user signed up via Clerk
7. Replace profile-message entry with `POST /conversations/direct`.
8. Fix notification “mark all read” to `PATCH /notifications/all/read`.

---

## 7. Backend production env (for DevOps)

Required:

```
DATABASE_URL=
JWT_SECRET=
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
CLERK_WEBHOOK_SECRET=
CLERK_ACCOUNT_PORTAL_URL=https://your-instance.accounts.dev
RESEND_API_KEY=
RESEND_FROM=Wasla <noreply@yourdomain.com>
```

After deploy:

```
npx prisma migrate deploy
```

Clerk Dashboard webhook:

```
POST https://YOUR_API_DOMAIN/webhooks/clerk
```

Events: `user.created`, `user.updated`, `user.deleted`
