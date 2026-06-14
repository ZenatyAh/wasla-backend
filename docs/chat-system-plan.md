# Chat System Backend Plan

This document reflects the implemented chat system in the Wasla backend.

## Product Rules (confirmed)

- Any authenticated user can message a post owner from the post page.
- Conversations are 1:1 and linked to a `postId`.
- Messages are text-only with edit, soft-delete, and per-message read receipts.
- REST is the source of truth; Socket.IO delivers live updates.
- New messages create in-app notifications and optional email alerts.
- Sends require a client-generated `clientMessageId` (UUID) for idempotency.
- Message lifecycle: `SENT` → `DELIVERED` → `READ`.
- User presence is tracked in-memory (single-node) with lazy DB sync.

## Implemented Database Models

- `Conversation`
- `ConversationParticipant`
- `Message` (includes `clientMessageId`, `status`, `deliveredAt`, `readAt`)
- `MessageReadReceipt`
- `Notification`
- `User.is_online`, `User.last_seen`

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
- Heartbeat: engine ping every 10s, drop if no pong within 5s
- Personal room: `user:{userId}` (auto-joined on connect)
- Conversation room: `conversation:{conversationId}` (joined via `chat:join`)

### Client → Server events

| Event | Payload |
|-------|---------|
| `chat:join` | `{ conversationId }` |
| `chat:leave` | `{ conversationId }` |
| `chat:messages:delivered` | `{ conversationId, messageIds: string[] }` |
| `chat:messages:read` | `{ conversationId, messageIds: string[] }` |

### Server → Client events

| Event | Payload |
|-------|---------|
| `chat:message:new` | Full message object |
| `chat:message:sent` | Full message object (to sender only) |
| `chat:message:edited` | Full message object |
| `chat:message:deleted` | `{ id, conversationId, deletedAt }` |
| `chat:message:read` | Read receipt object |
| `chat:messages:status` | `{ conversationId, updates: [{ messageId, status, deliveredAt?, readAt? }] }` |
| `chat:presence:online` | `{ userId }` |
| `chat:presence:offline` | `{ userId, lastSeen }` |
| `chat:notification:new` | Notification object |
| `chat:error` | `{ code, message }` |

## Presence (In-Memory, Single Node)

- State: `Map<userId, Set<socketId>>` in `src/realtime/presence.ts`
- Multi-tab: user stays online until the **last** socket disconnects
- Debounce: 7s offline delay (`PRESENCE_OFFLINE_DEBOUNCE_MS` env override)
- Lazy DB sync: `is_online` / `last_seen` updated only on confirmed offline or new session
- **Not horizontally scalable** without Redis (intentionally excluded)

## Message Status Lifecycle

| Status | Trigger |
|--------|---------|
| `SENT` | Server after DB insert (HTTP 201) |
| `DELIVERED` | Recipient emits `chat:messages:delivered` after receiving payload |
| `READ` | Recipient emits `chat:messages:read` (typically via IntersectionObserver on frontend) |

Batch updates are debounced (500ms, `STATUS_BATCH_DEBOUNCE_MS`) to avoid DB bottlenecks.

## Security

- `authMiddleware` for authentication (401)
- `assertConversationParticipant` for authorization (403)
- Message rate limit: 30 messages / minute / user
- Sender-only edit/delete
- Recipient-only read receipts and status acks

## Module Layout

```
src/modules/chat/
src/modules/notifications/
src/realtime/socket.ts
src/realtime/presence.ts
src/realtime/message-status.batch.ts
src/realtime/emit.ts
```

## Frontend Integration Guide (Reference)

The frontend is a separate project. Use these patterns when building the chat client.

### Idempotent send with UUID

```ts
const clientMessageId = crypto.randomUUID();
const res = await api.post(`/conversations/${conversationId}/messages`, {
  body: text,
  clientMessageId,
});
// 201 = new message, 200 = duplicate (safe retry)
```

### Offline queue

```ts
// On send failure or disconnect: queue { clientMessageId, body, conversationId, status: 'pending' }
// On reconnect: flush sequentially, await 201/200, then remove from local storage
// UI: show clock icon when status === 'pending'
```

### Delivered ack on receive

```ts
socket.on('chat:message:new', (msg) => {
  appendMessage(msg);
  if (msg.senderId !== currentUserId) {
    socket.emit('chat:messages:delivered', {
      conversationId: msg.conversationId,
      messageIds: [msg.id],
    });
  }
});
```

### Read receipts via IntersectionObserver

```ts
const observer = new IntersectionObserver((entries) => {
  const visibleIds = entries
    .filter((e) => e.isIntersecting)
    .map((e) => e.target.dataset.messageId)
    .filter(Boolean);
  if (visibleIds.length) {
    socket.emit('chat:messages:read', { conversationId, messageIds: visibleIds });
  }
}, { threshold: 0.5 });
```

### Status updates for sender UI

```ts
socket.on('chat:messages:status', ({ updates }) => {
  updates.forEach(({ messageId, status, deliveredAt, readAt }) => {
    updateMessageStatus(messageId, status, { deliveredAt, readAt });
  });
});
```

## Testing

Run chat integration tests:

```bash
npm test
```

Tests live in `src/modules/chat/` and `src/realtime/` and require a configured `DATABASE_URL`.
