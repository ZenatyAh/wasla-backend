# Chat System Backend Plan

This document is based on the current repository state. No chat-related code was found in the current backend, so this is a future implementation plan designed to fit the existing Express, TypeScript, Prisma, and PostgreSQL architecture.

## Chat System Goal

The chat system should allow users to communicate safely inside Wasla after discovering a service post, request, or possible skill exchange. The backend should ensure that only authorized users can access a conversation and that messages are stored reliably for later retrieval.

The exact product rule for when a conversation can start is **Needs confirmation**. Possible rules include:

- Any authenticated user can message a post owner.
- Users can chat only after a contract/request is created.
- Users can chat only when both sides agree to start an exchange.

## Required Entities And Tables

Recommended Prisma entities:

- `Conversation`: represents a chat thread.
- `ConversationParticipant`: links users to conversations.
- `Message`: stores sent messages.
- `MessageReadReceipt`: tracks read status per user.
- `MessageAttachment`: optional file/image attachment table.
- `Notification`: optional table for message notifications.

## Suggested Database Schema

The exact schema should be added through Prisma migrations after confirmation. Suggested structure:

```prisma
model Conversation {
  id          String   @id @default(cuid())
  postId      String?
  contractId  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  participants ConversationParticipant[]
  messages     Message[]
}

model ConversationParticipant {
  id             String   @id @default(cuid())
  conversationId String
  userId         Int
  joinedAt       DateTime @default(now())
  leftAt         DateTime?

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([conversationId, userId])
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  senderId       Int
  body           String
  createdAt      DateTime @default(now())
  editedAt        DateTime?
  deletedAt       DateTime?

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender       User         @relation(fields: [senderId], references: [id], onDelete: Cascade)
  readReceipts MessageReadReceipt[]
}

model MessageReadReceipt {
  id        String   @id @default(cuid())
  messageId String
  userId    Int
  readAt    DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId])
}
```

Notes:

- `contractId` depends on a future contract model and is **Needs confirmation**.
- If chat is linked directly to posts, `postId` can reference the current `POST` model.
- Attachments and notifications should be added only if required by product scope.

## REST APIs Needed

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| `POST` | `/conversations` | Start or reuse a conversation | Yes |
| `GET` | `/conversations` | List conversations for current user | Yes |
| `GET` | `/conversations/:id` | Get conversation details | Yes |
| `GET` | `/conversations/:id/messages` | Paginated message history | Yes |
| `POST` | `/conversations/:id/messages` | Send a message | Yes |
| `PATCH` | `/messages/:id` | Edit own message if allowed | Yes |
| `DELETE` | `/messages/:id` | Soft-delete own message if allowed | Yes |
| `POST` | `/messages/:id/read` | Mark message as read | Yes |

All APIs must verify that the authenticated user is a participant in the conversation.

## Real-Time Communication Option

Real-time chat is likely needed for a good user experience, but the transport choice is **Needs confirmation**.

Recommended options:

- Socket.IO: easier room management, reconnect support, and browser compatibility.
- Native WebSocket: lighter dependency, but more manual protocol handling.
- REST-only polling: simpler but less real-time and less efficient.

For this project, Socket.IO is a practical default if the frontend needs live chat updates.

## Message Flow

1. User opens a post or contract context.
2. Frontend requests `POST /conversations` with the target user and optional post/contract reference.
3. Backend checks authorization and creates or reuses a conversation.
4. User sends a message through REST or real-time event.
5. Backend verifies participant access.
6. Backend stores the message in PostgreSQL.
7. Backend emits a real-time event to other conversation participants if real-time is enabled.
8. Receiver reads the message.
9. Backend records read receipt.

## User Roles And Permissions

Current schema has no role model. Minimum chat permissions should be:

- Only authenticated users can use chat.
- Only conversation participants can read messages.
- Only conversation participants can send messages.
- Users can edit or delete only their own messages.
- Admin or moderation access is **Needs confirmation**.
- Block/report behavior is **Needs confirmation**.

## Security Considerations

- Validate message body length with Zod.
- Escape or sanitize message content on the frontend before rendering.
- Rate-limit message sending to reduce spam.
- Enforce participant checks on every chat endpoint.
- Use soft delete for messages if audit/history is required.
- Avoid exposing conversations through predictable IDs.
- Do not trust frontend-provided sender IDs; use the authenticated user ID.
- Consider audit logs for reported or deleted messages.
- If attachments are added, validate file type, size, storage provider, and access control.

## Notification Considerations

Notification behavior is **Needs confirmation**. Possible events:

- New message received.
- Conversation started.
- Message read.
- User mentioned.
- Contract-related message received.

Possible delivery channels:

- In-app notifications.
- Email notifications.
- Push notifications.

Redis could be useful for real-time scaling, pub/sub, or queues, but Redis is not currently used in the codebase.

## Edge Cases

- User tries to access a conversation they do not belong to.
- User sends an empty message.
- User sends a message that exceeds length limits.
- User sends many messages quickly.
- Receiver account is deleted.
- Post or contract linked to conversation is deleted or archived.
- User tries to create duplicate conversations for the same context.
- Message delivery succeeds in database but real-time event fails.
- User reconnects after missing messages.
- Read receipt is submitted multiple times.

## Suggested Jira Tasks

| Epic | Task | Description | Priority | Complexity | Dependencies | Acceptance Criteria |
|------|------|-------------|----------|------------|--------------|---------------------|
| Chat | Confirm chat start rules | Decide when users are allowed to start conversations | High | Medium | Product decision | Rules are documented and accepted |
| Chat | Add chat Prisma models | Add conversation, participant, message, and read receipt models | High | Medium | Confirmed rules | Migration runs successfully |
| Chat | Implement conversation creation | Create or reuse conversation between authorized users | High | Medium | Chat schema | Duplicate conversations are avoided |
| Chat | Implement conversation list | Return conversations for the authenticated user | High | Medium | Chat schema | User sees only their own conversations |
| Chat | Implement message history | Return paginated messages for a conversation | High | Medium | Conversation access guard | Only participants can read messages |
| Chat | Implement send message API | Store new messages from participants | High | Medium | Message validation | Message is stored with authenticated sender |
| Chat | Add read receipts | Mark messages as read per participant | Medium | Medium | Message model | Read status is tracked without duplicates |
| Chat | Decide real-time transport | Choose Socket.IO, WebSocket, or polling | Medium | Medium | Frontend needs | Decision is documented |
| Chat | Implement real-time events | Emit new-message and read events | Medium | Hard | Transport decision | Connected users receive live updates |
| Chat | Add chat rate limiting | Prevent message spam | Medium | Medium | Chat APIs | Excessive requests are rejected |
| Chat | Add chat tests | Test access control, sending, listing, and edge cases | High | Hard | Chat APIs | Tests cover core chat behavior |
| Docs | Document chat APIs | Add chat endpoints to OpenAPI | Medium | Easy | Chat APIs | Swagger includes chat examples |

## Estimated Implementation Time

Estimated time depends on scope:

- REST-only chat: 3 to 5 backend workdays.
- Chat with read receipts and strong tests: 5 to 8 backend workdays.
- Real-time chat with Socket.IO, scaling considerations, and notifications: 8 to 12 backend workdays.

These estimates assume the existing authentication system remains stable.

## Testing Scenarios

- Authenticated user can create a valid conversation.
- Unauthenticated user cannot create or access conversations.
- User cannot access a conversation they do not participate in.
- User can send a valid message.
- User cannot send an empty message.
- User cannot send a message over the maximum length.
- Message history is paginated correctly.
- Read receipts are created once per user/message.
- Deleted users or archived posts do not break conversation listing.
- Real-time event is emitted after message creation if real-time is implemented.
