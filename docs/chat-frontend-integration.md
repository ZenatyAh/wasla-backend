# دليل تكامل الشات للفرونت إند

> **الجمهور:** مطور الفرونت إند  
> **الفرع:** `chat-aystem-features`  
> **آخر تحديث:** يونيو 2026

---

## ملخص سريع

تم ترقية نظام الشات على الباك إند لدعم:

1. **إرسال أسرع** — الرد HTTP يعود مباشرة بعد حفظ الرسالة في قاعدة البيانات.
2. **حالة الاتصال (Presence)** — online / offline للمستخدمين.
3. **دورة حياة الرسالة** — `SENT` → `DELIVERED` → `READ`.
4. **المرونة عند انقطاع الشبكة** — idempotency عبر `clientMessageId`.

> **مهم:** لم يُضف أي REST endpoint جديد. التغييرات على endpoints موجودة + أحداث Socket.IO جديدة.

---

## 1. REST API — ما الذي تغيّر؟

### Endpoints بدون تغيير في المسار

| Method | Endpoint | ملاحظة |
|--------|----------|--------|
| `POST` | `/conversations` | بدون تغيير |
| `GET` | `/conversations` | يرجع حقول presence جديدة |
| `GET` | `/conversations/:id` | يرجع حقول presence جديدة |
| `GET` | `/conversations/:id/messages` | يرجع حقول status جديدة |
| `PATCH` | `/messages/:id` | بدون تغيير |
| `DELETE` | `/messages/:id` | بدون تغيير |
| `POST` | `/messages/:id/read` | يحدّث status إلى READ أيضاً |

---

### ⚠️ Breaking Change — إرسال رسالة

**Endpoint:**

```
POST /conversations/:conversationId/messages
```

**Request Body (جديد — إلزامي):**

```json
{
  "body": "نص الرسالة",
  "clientMessageId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| الحقل | النوع | إلزامي | الوصف |
|-------|-------|--------|-------|
| `body` | `string` | ✅ | 1–2000 حرف |
| `clientMessageId` | `UUID v4` | ✅ | يُولَّد على الفرونت **قبل** أول محاولة إرسال |

**Responses:**

| Status | المعنى |
|--------|--------|
| `201` | رسالة جديدة — status = `SENT` |
| `200` | إعادة إرسال بنفس `clientMessageId` — نفس الرسالة بدون تكرار |
| `409` | `clientMessageId` مستخدم لمحادثة أو مرسل مختلف |
| `400` | body فارغ أو `clientMessageId` غير صالح |
| `429` | تجاوز حد 30 رسالة/دقيقة |

**مثال TypeScript:**

```typescript
const clientMessageId = crypto.randomUUID();

const response = await api.post(
  `/conversations/${conversationId}/messages`,
  { body: text, clientMessageId },
);

// 201 = جديدة | 200 = duplicate آمن
const message = response.data.message;
```

---

## 2. شكل الردود — حقول جديدة

### Message Object

```typescript
type MessageStatus = "SENT" | "DELIVERED" | "READ";

interface Message {
  id: string;
  clientMessageId: string | null;   // جديد
  conversationId: string;
  senderId: number;
  sender: { id: number; username: string };
  body: string | null;
  status: MessageStatus;            // جديد
  createdAt: string;                // ISO 8601
  deliveredAt: string | null;       // جديد
  readAt: string | null;            // جديد
  editedAt: string | null;
  deletedAt: string | null;
  readBy: ReadReceipt[];
}

interface ReadReceipt {
  id: string;
  messageId: string;
  userId: number;
  readAt: string;
}
```

### Participant User (في قائمة المحادثات)

```typescript
interface ChatParticipantUser {
  id: number;
  username: string;
  full_name: string;
  profile_image: string | null;
  is_online: boolean;    // جديد
  last_seen: string | null; // جديد — ISO 8601
}
```

---

## 3. دورة حياة الرسالة (Message Status)

```
SENT ──► DELIVERED ──► READ
```

| Status | متى | من يفعّله |
|--------|-----|-----------|
| `SENT` | بعد حفظ الرسالة في DB | الباك إند — فور `POST` |
| `DELIVERED` | بعد استلام payload | الفرونت إند للمستقبل — socket event |
| `READ` | بعد ظهور الرسالة في viewport | الفرونت إند للمستقبل — IntersectionObserver |

### ما يجب على الفرونت إند فعله

**أ) عند استلام رسالة (مستقبل):**

```typescript
socket.on("chat:message:new", (msg: Message) => {
  appendMessage(msg);

  if (msg.senderId !== currentUserId) {
    socket.emit("chat:messages:delivered", {
      conversationId: msg.conversationId,
      messageIds: [msg.id],
    });
  }
});
```

**ب) عند ظهور الرسالة في الشاشة (مستقبل):**

```typescript
const observer = new IntersectionObserver(
  (entries) => {
    const visibleIds = entries
      .filter((e) => e.isIntersecting)
      .map((e) => e.target.dataset.messageId)
      .filter(Boolean) as string[];

    if (visibleIds.length > 0) {
      socket.emit("chat:messages:read", {
        conversationId,
        messageIds: visibleIds,
      });
    }
  },
  { threshold: 0.5 },
);
```

**ج) عند الإرسال (مرسل) — تحديث UI:**

```typescript
socket.on("chat:messages:status", ({ updates }) => {
  updates.forEach(({ messageId, status, deliveredAt, readAt }) => {
    updateMessageStatus(messageId, status, { deliveredAt, readAt });
  });
});
```

> التحديثات مجمّعة على الباك إند (debounce ~500ms). لا ترسل ack لكل رسالة على حدة إذا أمكن — يمكن إرسال مصفوفة `messageIds`.

---

## 4. Socket.IO — أحداث جديدة

### الاتصال

```typescript
import { io } from "socket.io-client";

const socket = io(BACKEND_URL, {
  auth: { token: accessToken },
  transports: ["websocket"],
});
```

- **Heartbeat:** ping كل 10 ثوانٍ — قطع الاتصال إذا لم يصل pong خلال 5 ثوانٍ.
- **غرفة شخصية:** `user:{userId}` — تُ joined تلقائياً عند الاتصال.
- **غرفة محادثة:** `conversation:{conversationId}` — عبر `chat:join`.

---

### Client → Server (أحداث ترسلها أنت)

| Event | Payload | متى |
|-------|---------|-----|
| `chat:join` | `{ conversationId: string }` | عند فتح محادثة |
| `chat:leave` | `{ conversationId: string }` | عند مغادرة محادثة |
| `chat:messages:delivered` | `{ conversationId, messageIds: string[] }` | بعد استلام رسالة |
| `chat:messages:read` | `{ conversationId, messageIds: string[] }` | بعد ظهور رسالة في viewport |

**Payload schemas:**

```typescript
interface ChatMessagesDeliveredPayload {
  conversationId: string;
  messageIds: string[]; // 1–100 عنصر
}

interface ChatMessagesReadPayload {
  conversationId: string;
  messageIds: string[]; // 1–100 عنصر
}
```

---

### Server → Client (أحداث تستمع لها)

| Event | Payload | ملاحظة |
|-------|---------|--------|
| `chat:message:new` | `Message` | رسالة جديدة — كل المشاركين في الغرفة |
| `chat:message:sent` | `Message` | **جديد** — للمرسل فقط (غرفة `user:{userId}`) |
| `chat:message:edited` | `Message` | تعديل رسالة |
| `chat:message:deleted` | `{ id, conversationId, deletedAt }` | حذف ناعم |
| `chat:message:read` | `ReadReceipt` | read receipt فردي (REST أو socket) |
| `chat:messages:status` | `ChatMessagesStatusEvent` | **جديد** — تحديثات status مجمّعة |
| `chat:presence:online` | `{ userId: number }` | **جديد** |
| `chat:presence:offline` | `{ userId: number, lastSeen: string }` | **جديد** |
| `notification:new` | `Notification` | إشعار جديد (كل الأنواع — غرفة `user:{userId}`) |
| `chat:notification:new` | `Notification` | alias قديم لـ `NEW_MESSAGE` فقط (سيتم إزالته لاحقاً) |
| `chat:error` | `{ code, message }` | خطأ |

```typescript
interface ChatMessagesStatusEvent {
  conversationId: string;
  updates: Array<{
    messageId: string;
    status: "SENT" | "DELIVERED" | "READ";
    deliveredAt?: string | null;
    readAt?: string | null;
  }>;
}
```

**أكواد `chat:error`:**

| code | المعنى |
|------|--------|
| `INVALID_PAYLOAD` | payload ناقص أو غير صالح |
| `FORBIDDEN` | لا صلاحية على المحادثة |
| `JOIN_FAILED` | فشل الانضمام للغرفة |

---

## 5. Presence (Online / Offline)

### السلوك

- المستخدم **online** طالما عنده socket واحد على الأقل (multi-tab مدعوم).
- عند قطع **آخر** tab: انتظار **7 ثوانٍ** قبل اعتباره offline (debounce).
- إذا reconnect خلال 7 ثوانٍ: لا flicker ولا تحديث DB.

### ما يصل للفرونت إند

```typescript
socket.on("chat:presence:online", ({ userId }) => {
  setUserOnline(userId, true);
});

socket.on("chat:presence:offline", ({ userId, lastSeen }) => {
  setUserOnline(userId, false);
  setUserLastSeen(userId, lastSeen);
});
```

> الأحداث تُرسل **لشركاء المحادثة فقط** — ليس broadcast عام.

---

## 5b. Notifications (Hybrid)

### Real-time (Socket.IO)

عند الاتصال بالـ socket، المستخدم ينضم تلقائياً لغرفة `user:{userId}`. استمع لـ:

```typescript
socket.on("notification:new", (notification: Notification) => {
  prependToInbox(notification);
  showToast(notification.title, notification.body);
});
```

- **كل أنواع الإشعارات** (رسائل، عقود، جلسات، مواعيد) تصل عبر `notification:new`.
- `chat:notification:new` alias مؤقت لرسائل الدردشة فقط — يُفضّل الاعتماد على `notification:new`.

### REST (تاريخ + قراءة)

| Endpoint | الاستخدام |
|----------|-----------|
| `GET /notifications` | تحميل أولي، pagination، بعد reconnect |
| `PATCH /notifications/:id/read` | تعليم إشعار كمقروء |
| `PATCH /notifications/read-all` | تعليم الكل كمقروء |

**لا تستخدم polling دوري.** استخدم socket للجديد و REST للتاريخ والـ mark-read.

```typescript
socket.on("connect", () => {
  fetchNotifications({ limit: 20 }); // reconcile after reconnect
});
```

### Fallback من REST

عند تحميل المحادثات، الحقول متوفرة في:

```
GET /conversations
GET /conversations/:id
```

```json
{
  "participants": [{
    "userId": 2,
    "user": {
      "id": 2,
      "username": "ahmad",
      "is_online": true,
      "last_seen": null
    }
  }]
}
```

---

## 6. Offline Queue — توصيات التطبيق

الباك إند يدعم idempotency. الفرونت إند يطبّق الطابور محلياً:

### Flow مقترح

```
1. clientMessageId = crypto.randomUUID()
2. أضف الرسالة للـ UI بحالة "pending" (أيقونة ساعة)
3. احفظ في localStorage / IndexedDB
4. POST /messages مع clientMessageId
   ├─ 201 أو 200 → احذف من الطابور، status = SENT
   └─ فشل شبكة → أبقِ في الطابور
5. عند socket reconnect → flush الطابور sequentially
6. لا تولّد clientMessageId جديد عند retry — نفس UUID
```

```typescript
interface PendingMessage {
  clientMessageId: string;
  conversationId: string;
  body: string;
  status: "pending";
  createdAt: string;
}
```

---

## 7. UI — اقتراحات عرض الحالة

| status | أيقونة مقترحة | لمن |
|--------|---------------|-----|
| `pending` (محلي) | 🕐 ساعة | مرسل — قبل تأكيد السيرفر |
| `SENT` | ✓ واحدة | مرسل |
| `DELIVERED` | ✓✓ رمادي | مرسل |
| `READ` | ✓✓ ملون | مرسل |

---

## 8. Checklist للفرونت إند

- [ ] إضافة `clientMessageId: crypto.randomUUID()` لكل `POST /messages`
- [ ] التعامل مع `201` و `200` كنجاح
- [ ] الاستماع لـ `chat:messages:status` لتحديث ✓✓
- [ ] emit `chat:messages:delivered` عند استلام رسالة
- [ ] emit `chat:messages:read` عبر `IntersectionObserver`
- [ ] الاستماع لـ `chat:presence:online/offline`
- [ ] عرض `is_online` / `last_seen` في قائمة المحادثات
- [ ] تطبيق offline queue مع retry بنفس `clientMessageId`
- [ ] `chat:join` عند فتح كل محادثة
- [ ] reconnect handling: `socket.on("connect", flushQueue)`

---

## 9. Swagger / OpenAPI

التوثيق الكامل متاح في:

```
GET /docs   (Swagger UI)
```

Schemas ذات الصلة:

- `SendMessageRequest`
- `Message`
- `MessageStatus`
- `ChatMessagesDeliveredPayload`
- `ChatMessagesReadPayload`
- `ChatMessagesStatusEvent`
- `ChatPresenceOnlineEvent`
- `ChatPresenceOfflineEvent`

---

## 10. ملاحظات تقنية

| الموضوع | التفاصيل |
|---------|----------|
| Rate limit | 30 رسالة / دقيقة / مستخدم |
| Batch size | حتى 100 `messageIds` في delivered/read |
| Presence debounce | 7 ثوانٍ (env: `PRESENCE_OFFLINE_DEBOUNCE_MS`) |
| Status batch debounce | 500ms (env: `STATUS_BATCH_DEBOUNCE_MS`) |
| Single-node | Presence in-memory — لا يعمل عبر عدة servers بدون Redis |
| Migration | `npx prisma migrate deploy` مطلوب قبل deploy |

---

## 11. أسئلة شائعة

**هل أحتاج endpoint جديد للـ delivered/read؟**  
لا. استخدم socket events `chat:messages:delivered` و `chat:messages:read`.  
`POST /messages/:id/read` ما زال يعمل للحالة الفردية.

**ماذا لو انقطع الإنترنت بعد 201 وقبل حذف الرسالة من الطابور؟**  
أعد الإرسال بنفس `clientMessageId` — ستحصل على `200` بدون duplicate.

**هل `chat:message:sent` يختلف عن `chat:message:new`؟**  
`chat:message:sent` للمرسل فقط (أسرع لتحديث UI).  
`chat:message:new` لكل من في غرفة المحادثة.

**رسائل قديمة بدون `clientMessageId`؟**  
`clientMessageId` يكون `null` — لا يؤثر على العرض.

---

## مراجع

- [chat-system-plan.md](./chat-system-plan.md) — خطة الباك إند
- [Chat Frontend Guide (HTML)](/docs/chat-frontend) — دليل الفرونت إند المنسّق
- PR: `chat-aystem-features` → `main`
