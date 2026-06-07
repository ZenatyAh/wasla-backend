# Chat System Backend Plan

This document reflects the implemented chat system in the Wasla backend.

## Product Rules (confirmed)

- Any authenticated user can message a post owner from the post page.
- Conversations are 1:1 and linked to a `postId`.
- Messages are text-only with edit, soft-delete, and per-message read receipts.
- REST is the source of truth; Socket.IO delivers live updates.
- New messages create in-app notifications and optional email alerts.

## Implemented Database Models

- `Conversation`
- `ConversationParticipant`
- `Message`
- `MessageReadReceipt`
- `Notification`

## Implemented REST APIs

| Method | Endpoint | Status |
|--------|----------|--------|
| `POST` | `/conversations` | Implemented |
| `GET` | `/conversations` | Implemented |
| `GET` | `/conversations/:id` | Implemented |
| `GET` | `/conversations/:id/messages` | Implemented |
| `POST` | `/conversations/:id/messages` | Implemented |
| `PATCH` | `/messages/:id` | Implemented |
| `DELETE` | `/messages/:id` | Implemented |
| `POST` | `/messages/:id/read` | Implemented |
| `GET` | `/notifications` | Implemented |
| `PATCH` | `/notifications/:id/read` | Implemented |
| `PATCH` | `/notifications/read-all` | Implemented |

## Real-Time (Socket.IO)

- Connection auth: `auth.token` JWT access token
- Client events: `chat:join`, `chat:leave`
- Server events: `chat:message:new`, `chat:message:edited`, `chat:message:deleted`, `chat:message:read`, `chat:notification:new`, `chat:error`
- Room format: `conversation:{conversationId}`

## Security

- `authMiddleware` for authentication (401)
- `assertConversationParticipant` for authorization (403)
- Message rate limit: 30 messages / minute / user
- Sender-only edit/delete
- Recipient-only read receipts

## Module Layout

```
src/modules/chat/
src/modules/notifications/
src/realtime/socket.ts
```

## Testing

Run chat integration tests:

```bash
npm test
```

Tests live in `src/modules/chat/chat.test.ts` and require a configured `DATABASE_URL`.
