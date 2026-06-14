export const chatFrontendHtml = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Wasla — دليل تكامل الشات للفرونت إند</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" />
    <style>
      :root {
        --bg: #0f1419;
        --surface: #1a2332;
        --surface-2: #243044;
        --border: #2d3f56;
        --text: #e7edf4;
        --muted: #94a3b8;
        --accent: #3b82f6;
        --accent-soft: rgba(59, 130, 246, 0.15);
        --warn: #f59e0b;
        --warn-soft: rgba(245, 158, 11, 0.12);
        --success: #22c55e;
        --danger: #ef4444;
        --code-bg: #0d1117;
        --radius: 10px;
        --sidebar-w: 280px;
      }

      * { box-sizing: border-box; }

      html { scroll-behavior: smooth; }

      body {
        margin: 0;
        font-family: "IBM Plex Sans Arabic", system-ui, sans-serif;
        background: var(--bg);
        color: var(--text);
        line-height: 1.75;
        font-size: 16px;
      }

      a { color: var(--accent); text-decoration: none; }
      a:hover { text-decoration: underline; }

      .layout {
        display: grid;
        grid-template-columns: var(--sidebar-w) 1fr;
        min-height: 100vh;
      }

      .sidebar {
        position: sticky;
        top: 0;
        height: 100vh;
        overflow-y: auto;
        background: var(--surface);
        border-left: 1px solid var(--border);
        padding: 1.5rem 1rem;
      }

      .sidebar-brand {
        font-weight: 700;
        font-size: 1.1rem;
        margin-bottom: 0.25rem;
      }

      .sidebar-sub {
        color: var(--muted);
        font-size: 0.85rem;
        margin-bottom: 1.5rem;
      }

      .sidebar nav a {
        display: block;
        color: var(--muted);
        padding: 0.4rem 0.75rem;
        border-radius: 6px;
        font-size: 0.9rem;
        margin-bottom: 0.15rem;
      }

      .sidebar nav a:hover {
        background: var(--surface-2);
        color: var(--text);
        text-decoration: none;
      }

      .sidebar-links {
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border);
      }

      .sidebar-links a {
        display: block;
        font-size: 0.85rem;
        margin-bottom: 0.5rem;
      }

      .content {
        max-width: 900px;
        padding: 2.5rem 3rem 4rem;
      }

      .hero {
        margin-bottom: 2.5rem;
        padding-bottom: 2rem;
        border-bottom: 1px solid var(--border);
      }

      .hero h1 {
        font-size: 2rem;
        font-weight: 700;
        margin: 0 0 1rem;
        line-height: 1.3;
      }

      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .badge {
        display: inline-block;
        padding: 0.2rem 0.65rem;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 500;
        background: var(--surface-2);
        color: var(--muted);
        border: 1px solid var(--border);
      }

      .badge-accent { background: var(--accent-soft); color: #93c5fd; border-color: #3b82f6; }
      .badge-warn { background: var(--warn-soft); color: #fcd34d; border-color: #f59e0b; }

      section {
        margin-bottom: 3rem;
        scroll-margin-top: 1.5rem;
      }

      h2 {
        font-size: 1.45rem;
        font-weight: 700;
        margin: 0 0 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid var(--accent);
        display: inline-block;
      }

      h3 {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 1.75rem 0 0.75rem;
        color: #cbd5e1;
      }

      p { margin: 0.75rem 0; }

      ul, ol { padding-right: 1.25rem; margin: 0.75rem 0; }
      li { margin-bottom: 0.35rem; }

      .callout {
        border-radius: var(--radius);
        padding: 1rem 1.25rem;
        margin: 1.25rem 0;
        border: 1px solid var(--border);
      }

      .callout-info { background: var(--accent-soft); border-color: #2563eb; }
      .callout-warn { background: var(--warn-soft); border-color: #d97706; }

      .callout strong { display: block; margin-bottom: 0.35rem; }

      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
        font-size: 0.92rem;
        background: var(--surface);
        border-radius: var(--radius);
        overflow: hidden;
        border: 1px solid var(--border);
      }

      th, td {
        padding: 0.65rem 0.85rem;
        text-align: right;
        border-bottom: 1px solid var(--border);
        vertical-align: top;
      }

      th {
        background: var(--surface-2);
        font-weight: 600;
        color: #cbd5e1;
      }

      tr:last-child td { border-bottom: none; }

      code:not(pre code) {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.85em;
        background: var(--code-bg);
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        color: #7dd3fc;
        direction: ltr;
        unicode-bidi: embed;
      }

      pre {
        margin: 1rem 0;
        border-radius: var(--radius);
        overflow-x: auto;
        border: 1px solid var(--border);
        direction: ltr;
        text-align: left;
      }

      pre code {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.82rem;
        line-height: 1.6;
        display: block;
        padding: 1rem 1.15rem;
      }

      .endpoint {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0.85rem 1rem;
        margin: 0.75rem 0;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.9rem;
        direction: ltr;
        text-align: left;
      }

      .method {
        display: inline-block;
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.75rem;
        margin-left: 0.5rem;
      }

      .method-post { background: #166534; color: #bbf7d0; }
      .method-get { background: #1e40af; color: #bfdbfe; }
      .method-patch { background: #92400e; color: #fde68a; }
      .method-delete { background: #991b1b; color: #fecaca; }

      .status { font-family: "JetBrains Mono", monospace; font-weight: 600; }
      .status-201 { color: var(--success); }
      .status-200 { color: #60a5fa; }
      .status-4xx { color: var(--danger); }

      .flow {
        background: var(--code-bg);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 1rem 1.25rem;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.88rem;
        direction: ltr;
        text-align: left;
        white-space: pre;
        line-height: 1.7;
        color: #a5b4fc;
      }

      .checklist {
        list-style: none;
        padding: 0;
      }

      .checklist li {
        padding: 0.5rem 0.75rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 6px;
        margin-bottom: 0.5rem;
      }

      .checklist li::before {
        content: "☐ ";
        color: var(--accent);
        font-weight: bold;
      }

      .faq-item {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 1rem 1.25rem;
        margin-bottom: 0.75rem;
      }

      .faq-item strong { color: #93c5fd; display: block; margin-bottom: 0.35rem; }

      .tag-new {
        background: #065f46;
        color: #6ee7b7;
        font-size: 0.7rem;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        margin-right: 0.35rem;
        font-weight: 600;
      }

      @media (max-width: 900px) {
        .layout { grid-template-columns: 1fr; }
        .sidebar {
          position: relative;
          height: auto;
          border-left: none;
          border-bottom: 1px solid var(--border);
        }
        .content { padding: 1.5rem 1.25rem 3rem; }
      }
    </style>
  </head>
  <body>
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-brand">Wasla Docs</div>
        <div class="sidebar-sub">دليل تكامل الشات</div>
        <nav>
          <a href="#summary">ملخص سريع</a>
          <a href="#rest">REST API</a>
          <a href="#breaking">Breaking Change</a>
          <a href="#responses">شكل الردود</a>
          <a href="#lifecycle">دورة حياة الرسالة</a>
          <a href="#socket">Socket.IO</a>
          <a href="#presence">Presence</a>
          <a href="#offline">Offline Queue</a>
          <a href="#ui">اقتراحات UI</a>
          <a href="#checklist">Checklist</a>
          <a href="#swagger">Swagger</a>
          <a href="#technical">ملاحظات تقنية</a>
          <a href="#faq">أسئلة شائعة</a>
        </nav>
        <div class="sidebar-links">
          <a href="/docs">← Swagger API Docs</a>
        </div>
      </aside>

      <main class="content">
        <header class="hero" id="top">
          <h1>دليل تكامل الشات للفرونت إند</h1>
          <div class="meta">
            <span class="badge badge-accent">Frontend Developer</span>
            <span class="badge">chat-aystem-features</span>
            <span class="badge">يونيو 2026</span>
          </div>
          <p>توثيق كامل للتغييرات على REST و Socket.IO بعد ترقية نظام الشات.</p>
        </header>

        <section id="summary">
          <h2>ملخص سريع</h2>
          <p>تم ترقية نظام الشات على الباك إند لدعم:</p>
          <ol>
            <li><strong>إرسال أسرع</strong> — الرد HTTP يعود مباشرة بعد حفظ الرسالة في قاعدة البيانات.</li>
            <li><strong>حالة الاتصال (Presence)</strong> — online / offline للمستخدمين.</li>
            <li><strong>دورة حياة الرسالة</strong> — <code>SENT</code> → <code>DELIVERED</code> → <code>READ</code>.</li>
            <li><strong>المرونة عند انقطاع الشبكة</strong> — idempotency عبر <code>clientMessageId</code>.</li>
          </ol>
          <div class="callout callout-info">
            <strong>مهم</strong>
            لم يُضف أي REST endpoint جديد. التغييرات على endpoints موجودة + أحداث Socket.IO جديدة.
          </div>
        </section>

        <section id="rest">
          <h2>1. REST API — ما الذي تغيّر؟</h2>
          <h3>Endpoints بدون تغيير في المسار</h3>
          <table>
            <thead><tr><th>Method</th><th>Endpoint</th><th>ملاحظة</th></tr></thead>
            <tbody>
              <tr><td><code>POST</code></td><td><code>/conversations</code></td><td>بدون تغيير</td></tr>
              <tr><td><code>GET</code></td><td><code>/conversations</code></td><td>يرجع حقول presence جديدة</td></tr>
              <tr><td><code>GET</code></td><td><code>/conversations/:id</code></td><td>يرجع حقول presence جديدة</td></tr>
              <tr><td><code>GET</code></td><td><code>/conversations/:id/messages</code></td><td>يرجع حقول status جديدة</td></tr>
              <tr><td><code>PATCH</code></td><td><code>/messages/:id</code></td><td>بدون تغيير</td></tr>
              <tr><td><code>DELETE</code></td><td><code>/messages/:id</code></td><td>بدون تغيير</td></tr>
              <tr><td><code>POST</code></td><td><code>/messages/:id/read</code></td><td>يحدّث status إلى READ أيضاً</td></tr>
            </tbody>
          </table>
        </section>

        <section id="breaking">
          <h2>Breaking Change — إرسال رسالة</h2>
          <div class="callout callout-warn">
            <strong>⚠️ تغيير إلزامي</strong>
            يجب إرسال <code>clientMessageId</code> (UUID) مع كل رسالة جديدة.
          </div>
          <div class="endpoint"><span class="method method-post">POST</span> /conversations/:conversationId/messages</div>
          <h3>Request Body</h3>
          <pre><code class="language-json">{
  "body": "نص الرسالة",
  "clientMessageId": "550e8400-e29b-41d4-a716-446655440000"
}</code></pre>
          <table>
            <thead><tr><th>الحقل</th><th>النوع</th><th>إلزامي</th><th>الوصف</th></tr></thead>
            <tbody>
              <tr><td><code>body</code></td><td>string</td><td>✅</td><td>1–2000 حرف</td></tr>
              <tr><td><code>clientMessageId</code></td><td>UUID v4</td><td>✅</td><td>يُولَّد على الفرونت قبل أول محاولة إرسال</td></tr>
            </tbody>
          </table>
          <h3>Responses</h3>
          <table>
            <thead><tr><th>Status</th><th>المعنى</th></tr></thead>
            <tbody>
              <tr><td><span class="status status-201">201</span></td><td>رسالة جديدة — status = <code>SENT</code></td></tr>
              <tr><td><span class="status status-200">200</span></td><td>إعادة إرسال بنفس clientMessageId — بدون duplicate</td></tr>
              <tr><td><span class="status status-4xx">409</span></td><td>clientMessageId مستخدم لمحادثة أو مرسل مختلف</td></tr>
              <tr><td><span class="status status-4xx">400</span></td><td>body فارغ أو clientMessageId غير صالح</td></tr>
              <tr><td><span class="status status-4xx">429</span></td><td>تجاوز حد 30 رسالة/دقيقة</td></tr>
            </tbody>
          </table>
          <h3>مثال TypeScript</h3>
          <pre><code class="language-typescript">const clientMessageId = crypto.randomUUID();

const response = await api.post(
  \`/conversations/\${conversationId}/messages\`,
  { body: text, clientMessageId },
);

// 201 = جديدة | 200 = duplicate آمن
const message = response.data.message;</code></pre>
        </section>

        <section id="responses">
          <h2>2. شكل الردود — حقول جديدة</h2>
          <h3>Message Object</h3>
          <pre><code class="language-typescript">type MessageStatus = "SENT" | "DELIVERED" | "READ";

interface Message {
  id: string;
  clientMessageId: string | null;   // جديد
  conversationId: string;
  senderId: number;
  sender: { id: number; username: string };
  body: string | null;
  status: MessageStatus;            // جديد
  createdAt: string;
  deliveredAt: string | null;       // جديد
  readAt: string | null;            // جديد
  editedAt: string | null;
  deletedAt: string | null;
  readBy: ReadReceipt[];
}</code></pre>
          <h3>Participant User</h3>
          <pre><code class="language-typescript">interface ChatParticipantUser {
  id: number;
  username: string;
  full_name: string;
  profile_image: string | null;
  is_online: boolean;       // جديد
  last_seen: string | null; // جديد
}</code></pre>
        </section>

        <section id="lifecycle">
          <h2>3. دورة حياة الرسالة</h2>
          <div class="flow">SENT ──► DELIVERED ──► READ</div>
          <table>
            <thead><tr><th>Status</th><th>متى</th><th>من يفعّله</th></tr></thead>
            <tbody>
              <tr><td><code>SENT</code></td><td>بعد حفظ الرسالة في DB</td><td>الباك إند — فور POST</td></tr>
              <tr><td><code>DELIVERED</code></td><td>بعد استلام payload</td><td>الفرونت إند — socket event</td></tr>
              <tr><td><code>READ</code></td><td>بعد ظهور الرسالة في viewport</td><td>الفرونت إند — IntersectionObserver</td></tr>
            </tbody>
          </table>
          <h3>أ) عند استلام رسالة (مستقبل)</h3>
          <pre><code class="language-typescript">socket.on("chat:message:new", (msg: Message) => {
  appendMessage(msg);
  if (msg.senderId !== currentUserId) {
    socket.emit("chat:messages:delivered", {
      conversationId: msg.conversationId,
      messageIds: [msg.id],
    });
  }
});</code></pre>
          <h3>ب) عند ظهور الرسالة (IntersectionObserver)</h3>
          <pre><code class="language-typescript">const observer = new IntersectionObserver((entries) => {
  const visibleIds = entries
    .filter((e) => e.isIntersecting)
    .map((e) => e.target.dataset.messageId)
    .filter(Boolean) as string[];
  if (visibleIds.length > 0) {
    socket.emit("chat:messages:read", { conversationId, messageIds: visibleIds });
  }
}, { threshold: 0.5 });</code></pre>
          <h3>ج) تحديث UI للمرسل</h3>
          <pre><code class="language-typescript">socket.on("chat:messages:status", ({ updates }) => {
  updates.forEach(({ messageId, status, deliveredAt, readAt }) => {
    updateMessageStatus(messageId, status, { deliveredAt, readAt });
  });
});</code></pre>
        </section>

        <section id="socket">
          <h2>4. Socket.IO</h2>
          <h3>الاتصال</h3>
          <pre><code class="language-typescript">import { io } from "socket.io-client";

const socket = io(BACKEND_URL, {
  auth: { token: accessToken },
  transports: ["websocket"],
});</code></pre>
          <ul>
            <li><strong>Heartbeat:</strong> ping كل 10 ثوانٍ — قطع إذا لم يصل pong خلال 5 ثوانٍ.</li>
            <li><strong>غرفة شخصية:</strong> <code>user:{userId}</code> — auto-join عند الاتصال.</li>
            <li><strong>غرفة محادثة:</strong> <code>conversation:{conversationId}</code> — عبر <code>chat:join</code>.</li>
          </ul>
          <h3>Client → Server</h3>
          <table>
            <thead><tr><th>Event</th><th>Payload</th><th>متى</th></tr></thead>
            <tbody>
              <tr><td><code>chat:join</code></td><td><code>{ conversationId }</code></td><td>فتح محادثة</td></tr>
              <tr><td><code>chat:leave</code></td><td><code>{ conversationId }</code></td><td>مغادرة محادثة</td></tr>
              <tr><td><code>chat:messages:delivered</code></td><td><code>{ conversationId, messageIds[] }</code></td><td>بعد استلام رسالة</td></tr>
              <tr><td><code>chat:messages:read</code></td><td><code>{ conversationId, messageIds[] }</code></td><td>ظهور في viewport</td></tr>
            </tbody>
          </table>
          <h3>Server → Client</h3>
          <table>
            <thead><tr><th>Event</th><th>Payload</th><th>ملاحظة</th></tr></thead>
            <tbody>
              <tr><td><code>chat:message:new</code></td><td>Message</td><td>كل المشاركين</td></tr>
              <tr><td><code>chat:message:sent</code></td><td>Message</td><td><span class="tag-new">جديد</span> للمرسل فقط</td></tr>
              <tr><td><code>chat:messages:status</code></td><td>ChatMessagesStatusEvent</td><td><span class="tag-new">جديد</span> تحديثات مجمّعة</td></tr>
              <tr><td><code>chat:presence:online</code></td><td><code>{ userId }</code></td><td><span class="tag-new">جديد</span></td></tr>
              <tr><td><code>chat:presence:offline</code></td><td><code>{ userId, lastSeen }</code></td><td><span class="tag-new">جديد</span></td></tr>
              <tr><td><code>chat:message:edited</code></td><td>Message</td><td>—</td></tr>
              <tr><td><code>chat:message:deleted</code></td><td><code>{ id, conversationId, deletedAt }</code></td><td>—</td></tr>
              <tr><td><code>chat:message:read</code></td><td>ReadReceipt</td><td>—</td></tr>
              <tr><td><code>chat:notification:new</code></td><td>Notification</td><td>—</td></tr>
              <tr><td><code>chat:error</code></td><td><code>{ code, message }</code></td><td>—</td></tr>
            </tbody>
          </table>
        </section>

        <section id="presence">
          <h2>5. Presence</h2>
          <ul>
            <li>online طالما يوجد socket واحد على الأقل (multi-tab).</li>
            <li>offline بعد 7 ثوانٍ من قطع آخر tab (debounce).</li>
            <li>reconnect خلال 7 ثوانٍ → لا flicker.</li>
          </ul>
          <pre><code class="language-typescript">socket.on("chat:presence:online", ({ userId }) => {
  setUserOnline(userId, true);
});

socket.on("chat:presence:offline", ({ userId, lastSeen }) => {
  setUserOnline(userId, false);
  setUserLastSeen(userId, lastSeen);
});</code></pre>
        </section>

        <section id="offline">
          <h2>6. Offline Queue</h2>
          <div class="flow">1. clientMessageId = crypto.randomUUID()
2. UI → pending (أيقونة ساعة)
3. حفظ في localStorage / IndexedDB
4. POST → 201/200 = نجاح | فشل = أبقِ في الطابور
5. reconnect → flush sequentially
6. retry = نفس UUID</div>
        </section>

        <section id="ui">
          <h2>7. اقتراحات UI</h2>
          <table>
            <thead><tr><th>status</th><th>أيقونة</th><th>لمن</th></tr></thead>
            <tbody>
              <tr><td><code>pending</code></td><td>🕐</td><td>مرسل — قبل تأكيد السيرفر</td></tr>
              <tr><td><code>SENT</code></td><td>✓</td><td>مرسل</td></tr>
              <tr><td><code>DELIVERED</code></td><td>✓✓ رمادي</td><td>مرسل</td></tr>
              <tr><td><code>READ</code></td><td>✓✓ ملون</td><td>مرسل</td></tr>
            </tbody>
          </table>
        </section>

        <section id="checklist">
          <h2>8. Checklist</h2>
          <ul class="checklist">
            <li>إضافة clientMessageId لكل POST /messages</li>
            <li>التعامل مع 201 و 200 كنجاح</li>
            <li>الاستماع لـ chat:messages:status</li>
            <li>emit chat:messages:delivered عند الاستلام</li>
            <li>emit chat:messages:read عبر IntersectionObserver</li>
            <li>الاستماع لـ chat:presence:online/offline</li>
            <li>عرض is_online / last_seen</li>
            <li>offline queue مع retry بنفس UUID</li>
            <li>chat:join عند فتح محادثة</li>
            <li>socket.on("connect", flushQueue)</li>
          </ul>
        </section>

        <section id="swagger">
          <h2>9. Swagger</h2>
          <p>التوثيق الكامل للـ REST:</p>
          <div class="endpoint"><span class="method method-get">GET</span> /docs</div>
        </section>

        <section id="technical">
          <h2>10. ملاحظات تقنية</h2>
          <table>
            <thead><tr><th>الموضوع</th><th>التفاصيل</th></tr></thead>
            <tbody>
              <tr><td>Rate limit</td><td>30 رسالة / دقيقة / مستخدم</td></tr>
              <tr><td>Batch size</td><td>حتى 100 messageIds</td></tr>
              <tr><td>Presence debounce</td><td>7 ثوانٍ</td></tr>
              <tr><td>Status debounce</td><td>500ms</td></tr>
              <tr><td>Single-node</td><td>Presence in-memory — لا scaling أفقي بدون Redis</td></tr>
            </tbody>
          </table>
        </section>

        <section id="faq">
          <h2>11. أسئلة شائعة</h2>
          <div class="faq-item">
            <strong>هل أحتاج endpoint جديد للـ delivered/read؟</strong>
            لا. استخدم socket events. POST /messages/:id/read ما زال يعمل للحالة الفردية.
          </div>
          <div class="faq-item">
            <strong>ماذا لو انقطع الإنترنت بعد 201؟</strong>
            أعد الإرسال بنفس clientMessageId — ستحصل على 200 بدون duplicate.
          </div>
          <div class="faq-item">
            <strong>chat:message:sent vs chat:message:new؟</strong>
            sent للمرسل فقط. new لكل من في غرفة المحادثة.
          </div>
        </section>
      </main>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/typescript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/json.min.js"></script>
    <script>hljs.highlightAll();</script>
  </body>
</html>`;
