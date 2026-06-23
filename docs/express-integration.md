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
