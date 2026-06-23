# Express ↔ Recommender Integration Contract

This document matches the FastAPI recommender's `docs/express-integration.md` and
`src/api/schemas.py`. Field names are **snake_case** on both sides.

## Field mapping (Prisma → export JSON)

### User

| Export field | Source |
|--------------|--------|
| `user_id` | `User.id` as string |
| `skills` | `UserSkill` where `skill_type = OFFER` → skill names |
| `needs` | `UserSkill` where `skill_type = REQUEST` → skill names |
| `location` | `User.location` |
| `time_balance` | `User.available_balance` |
| `trust_score` | average received review rating (0–5) |

### Post

| Export field | Source |
|--------------|--------|
| `post_id` | `Post.id` as string |
| `user_id` | `Post.user_id` as string |
| `post_type` | `OFFER` → `عرض`, `REQUEST` → `طلب` |
| `category` | author's first skill matching post type |
| `title` | `Post.title` |
| `description` | `Post.description` |
| `service_mode` | `ONLINE` → `الكتروني`, `OFFLINE` → `وجاهي` |
| `location` | author's `User.location` |
| `time_credits` | `Post.assigned_time_credits` |
| `timestamp` | `Post.created_at` ISO string |

### Interaction

| Export field | Source |
|--------------|--------|
| `user_id` | actor id as string |
| `post_id` | target post id as string |
| `action` | `save` or `apply` |
| `timestamp` | ISO string |

## Export endpoint

```
GET /internal/recommender-export
Header: X-Internal-Token: <RECOMMENDER_API_KEY>
```

Response:

```json
{
  "users": [],
  "posts": [],
  "interactions": []
}
```

## Environment variables

### Express (Railway)

```env
RECOMMENDER_URL=https://your-space.hf.space
RECOMMENDER_API_KEY=<shared-secret>
RECOMMENDER_TIMEOUT_MS=5000
```

### Recommender (Hugging Face Space)

```env
RECOMMENDER_API_KEY=<same-shared-secret>
EXPRESS_INTERNAL_URL=https://wasla-backend.up.railway.app
EXPRESS_TIMEOUT_MS=30000
```

**Important:** the recommender reads `EXPRESS_INTERNAL_URL`, not `EXPRESS_URL`.

## Bootstrap strategies

1. **Inline (preferred):** Express POSTs the full export to `/sync/bootstrap`.
   Implemented in `syncBootstrapRebuild()`.
2. **Pull:** Recommender calls `GET {EXPRESS_INTERNAL_URL}/internal/recommender-export`
   when `/sync/bootstrap` is called with an empty body.

Both require the same `X-Internal-Token` value.

## Search proxy

Express exposes authenticated semantic search at `POST /posts/search`. When the
recommender is configured, Express forwards the query to the AI service:

```
POST {RECOMMENDER_URL}/search
Header: X-Internal-Token: <RECOMMENDER_API_KEY>
```

Request body (snake_case on the AI side):

| Express field | AI field | Notes |
|---------------|----------|-------|
| `query` | `query` | Required search text |
| `topK` | `top_k` | Max results (default 20, max 50) |
| `threshold` | `threshold` | Optional similarity cutoff 0–1 |

AI response fields used by Express:

| AI field | Express usage |
|----------|---------------|
| `query` | Echoed in response |
| `count` | Not used directly; Express returns hydrated `count` |
| `results[].post_id` | Hydrate full post from PostgreSQL |
| `results[].similarity_score` | Mapped to `scores.similarityScore` |
| `results[].freshness` | Mapped to `scores.freshness` |
| `results[].trust` | Mapped to `scores.trust` |
| `results[].final_score` | Mapped to `scores.finalScore` |

When the recommender is disabled, times out, or returns an error, Express falls
back to case-insensitive `contains` search on `Post.title` and
`Post.description` for `status = PUBLISHED`, ordered by `created_at` desc.
Fallback results omit recommender scores (`scores: null`) and set
`source: "fallback"`.

Search is not part of the export/bootstrap contract; the AI index must already
contain posts via `/sync/bootstrap`, `/sync/post`, or a pull bootstrap.

## User search

Express exposes authenticated user search at `POST /users/search`. The
recommender has no user-search endpoint, so matching runs in PostgreSQL only.

Request body:

| Field | Notes |
|-------|-------|
| `query` | Required; matched against name, username, bio, location, and skill names |
| `topK` | Max results (default 20, max 50) |

Response sets `source: "database"`. Deleted users (`deleted_at` set) are
excluded. Email and other private fields are not returned.
