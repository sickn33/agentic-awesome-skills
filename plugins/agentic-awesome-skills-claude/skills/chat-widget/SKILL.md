---
name: chat-widget
description: Build a real-time support chat system with a floating widget for users and an admin dashboard for support staff. Use when the user wants live chat, customer support chat, real-time messaging, or in-app support.
risk: unknown
source: community
---

# Live Support Chat Widget

Build a real-time support chat system with a floating widget for users and an admin dashboard for support staff.

## When to Use This Skill

Use when the user wants to:
- Add a live chat widget to their app
- Build customer support chat functionality
- Create real-time messaging between users and admins
- Add an in-app support channel

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                 │
├─────────────────────────────┬───────────────────────────────────┤
│   User Widget               │   Admin Dashboard                 │
│   - Floating chat button    │   - Chat list (active/archived)   │
│   - Message panel           │   - Conversation view             │
│   - Unread badge            │   - Archive/restore controls      │
│   - Connection indicator    │   - User info display             │
└─────────────┬───────────────┴───────────────┬───────────────────┘
              │                               │
              │     WebSocket + REST API      │
              ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                  │
├─────────────────────────────────────────────────────────────────┤
│   Channels                  │   Controllers                     │
│   - ChatChannel (per chat)  │   - User: get/create chat         │
│   - AdminChannel (global)   │   - Admin: list, view, archive    │
├─────────────────────────────┼───────────────────────────────────┤
│   Models                    │   Jobs                            │
│   - Chat (1 per user)       │   - Email notification (delayed)  │
│   - Message (many per chat) │                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Guide

### Step 1: Data Models

Create two tables: `support_chats` and `support_messages`.

**support_chats**
```
id              - primary key (UUID recommended)
user_id         - foreign key to users (UNIQUE - one chat per user)
last_message_at - timestamp (for sorting chats by recency)
admin_viewed_at - timestamp (tracks when admin last viewed)
archived_at     - timestamp (null = active, set = archived)
created_at
updated_at
```

**support_messages**
```
id              - primary key (UUID recommended)
chat_id         - foreign key to support_chats
content         - text (required)
sender_type     - enum: 'user' | 'admin'
read_at         - timestamp (null = unread)
created_at
updated_at
```

**Key indexes:**
- `support_chats.user_id` (unique)
- `support_chats.last_message_at` (for sorting)
- `support_chats.archived_at` (for filtering)
- `support_messages.chat_id`
- `support_messages.(chat_id, created_at)` (composite, for ordering)

**Model relationships:**
```
User has_one SupportChat
SupportChat belongs_to User
SupportChat has_many SupportMessages
SupportMessage belongs_to SupportChat
```

**Model methods to implement:**

Chat model:
```pseudo
function touch_last_message()
  update last_message_at = now()

function unread_for_admin?()
  return exists message where sender_type = 'user'
    and created_at > admin_viewed_at

function mark_viewed_by_admin()
  update admin_viewed_at = now()

function archive()
  update archived_at = now()

function unarchive()
  update archived_at = null

function archived?()
  return archived_at != null
```

Message model:
```pseudo
after_create:
  chat.touch_last_message()
  if sender_type == 'user' and chat.archived?:
    chat.unarchive()  // Auto-reactivate on new user message

after_create_commit:
  broadcast_to_chat_channel(message_data)
  if sender_type == 'user':
    broadcast_to_admin_notification_channel(message_data, chat_info)
  if sender_type == 'admin':
    schedule_email_notification(delay: 5.minutes)
```

### Step 2: API Endpoints

**User-facing:**
```
GET  /support_chat       - Get or create user's chat with messages
PATCH /support_chat/mark_read - Mark admin messages as read
```

**Admin-facing:**
```
GET  /admin/chats              - List chats (query: archived=true/false)
GET  /admin/chats/:id          - Get chat with messages
POST /admin/chats/:id/archive  - Archive chat
POST /admin/chats/:id/unarchive - Restore chat
```

**Controller logic:**

User GET /support_chat:
```pseudo
function show()
  chat = current_user.support_chat || create_chat(user: current_user)
  return {
    id: chat.id,
    messages: chat.messages.map(m => serialize_message(m))
  }
```

Admin GET /admin/chats:
```pseudo
function index()
  chats = SupportChat
    .where(archived_at: params.archived ? not_null : null)
    .includes(:user, :messages)
    .order(last_message_at: desc)

  return chats.map(c => {
    id: c.id,
    user_email: c.user.email,
    last_message_preview: c.messages.last?.content.truncate(100),
    last_message_sender: c.messages.last?.sender_type,
    message_count: c.messages.count,
    unread: c.unread_for_admin?,
    archived: c.archived?
  })
```

### Step 3: WebSocket Channels

Create two channels for real-time communication.

**ChatChannel** (specific to each chat):
```pseudo
class ChatChannel
  on_subscribe(chat_id):
    chat = find_chat(chat_id)
    if not authorized(chat):
      reject()
      return
    stream_from "support_chat:#{chat_id}"

  function authorized(chat):
    return chat.user_id == current_user.id OR current_user.is_admin

  action send_message(content):
    if content.blank: return
    sender_type = current_user.is_admin ? 'admin' : 'user'
    chat.messages.create(content: content, sender_type: sender_type)
```

**AdminNotificationChannel** (global for all admins):
```pseudo
class AdminNotificationChannel
  on_subscribe:
    if not current_user.is_admin:
      reject()
      return
    stream_from "admin_support_notifications"
```

**Broadcasting (from Message model):**
```pseudo
function broadcast_message():
  message_data = {
    id: id,
    content: content,
    sender_type: sender_type,
    read_at: read_at,
    created_at: created_at
  }

  // Broadcast to chat subscribers (user + any viewing admins)
  broadcast("support_chat:#{chat.id}", {
    type: "new_message",
    message: message_data
  })

  // Notify all admins when user sends message
  if sender_type == 'user':
    broadcast("admin_support_notifications", {
      type: "new_user_message",
      chat_id: chat.id,
      user_email: chat.user.email,
      message: message_data
    })
```

### Step 4: Frontend - User Widget

Create a floating chat widget with these components:

**Component structure:**
```
ChatWidget (root container)
├── ChatButton (fixed position, bottom-right)
│   ├── Icon (message bubble when closed, X when open)
│   └── UnreadBadge (shows count, caps at "9+")
└── ChatPanel (slides up when open)
    ├── Header (title + connection status dot)
    ├── MessageList (scrollable)
    │   └── MessageBubble (styled by sender_type)
    └── InputArea
        ├── Textarea (auto-expanding)
        └── SendButton
```

**State management hook:**
```pseudo
function useSupportChat():
  state:
    chat: Chat | null
    connected: boolean
    loading: boolean

  refs:
    consumer: WebSocketConsumer
    subscription: ChannelSubscription
    seenMessageIds: Set<string>  // For deduplication

  on_mount:
    fetch('/support_chat')
      .then(data => {
        chat = data
        seenMessageIds.addAll(data.messages.map(m => m.id))
      })

  when chat.id changes:
    subscription = consumer.subscribe('ChatChannel', { chat_id: chat.id })
    subscription.on_received(data => {
      if data.type == 'new_message':
        if seenMessageIds.has(data.message.id): return  // Dedupe
        seenMessageIds.add(data.message.id)
        chat.messages.push(data.message)
        if data.message.sender_type == 'admin':
          play_notification_sound()
    })
    subscription.on_connected(() => connected = true)
    subscription.on_disconnected(() => connected = false)

  on_unmount:
    subscription.unsubscribe()

  function sendMessage(content):
    subscription.perform('send_message', { content: content.trim() })

  function markAsRead():
    fetch('/support_chat/mark_read', { method: 'PATCH' })
    // Update local state to mark admin messages as read

  return { chat, connected, loading, sendMessage, markAsRead }
```

**Widget behavior:**
- Show floating button at bottom-right corner (fixed position)
- Display unread count badge (count messages where sender_type='admin' and read_at=null)
- Toggle panel open/closed on button click
- Auto-call markAsRead() when panel opens
- Auto-scroll to bottom when new messages arrive
- Show connection status indicator (green dot = connected)
- Keyboard: Enter to send, Shift+Enter for newline

**Message styling:**
- User messages: right-aligned, primary color background
- Admin messages: left-aligned, secondary/muted background
- Show timestamp on each message

### Step 5: Frontend - Admin Dashboard

Create two pages: chat list and chat detail.

**Chat List Page:**
```
Header: "Support Chats"
Tabs: [Active] [Archived]

Chat cards (sorted by last_message_at desc):
┌─────────────────────────────────────────┐
│ [Unread indicator] user@example.com     │
│ Last message preview text...            │
│ 5 messages · 2 minutes ago              │
└─────────────────────────────────────────┘
```

Features:
- Tab filtering (active vs archived)
- Unread indicator (highlight border or badge)
- Click to navigate to detail
- Show "You: " prefix if last message was from admin

**Chat Detail Page:**
```
Header: user@example.com [Archive/Restore button]
Back link

Messages (grouped by date):
──── Monday, January 29 ────
[User bubble]  Message content
               10:30 AM

          [Admin bubble] Reply content
                         10:35 AM

Input area (same as widget)
```

Features:
- Group messages by date with dividers
- User messages left, admin messages right (opposite of user widget)
- Show sender label ("You" for admin, user email/name for user)
- Archive/restore toggle button
- Same WebSocket subscription as user widget for real-time updates
- Call mark_viewed_by_admin() when page loads (server-side)

### Step 6: Email Notifications

Send email to user when admin replies and user hasn't seen it.

**Job/worker:**
```pseudo
class SupportReplyNotificationJob
  perform(message):
    if message.sender_type != 'admin': return
    if message.read_at != null: return  // Already read, skip

    send_email(
      to: message.chat.user.email,
      subject: "New reply from Support",
      body: "You have a new message from our support team..."
    )
```

**Scheduling:**
- Schedule job with 5-minute delay when admin sends message
- This gives user time to see message in-app before email
- Job checks if still unread before sending

### Step 7: TypeScript Types

```typescript
interface SupportMessage {
  id: string
  content: string
  sender_type: 'user' | 'admin'
  read_at: string | null  // ISO8601
  created_at: string      // ISO8601
}

interface SupportChat {
  id: string
  messages: SupportMessage[]
}

interface SupportChatListItem {
  id: string
  user_id: string
  user_email: string
  last_message_at: string | null
  last_message_preview: string | null
  last_message_sender: 'user' | 'admin' | null
  message_count: number
  unread: boolean
  archived: boolean
}

interface AdminSupportChat {
  id: string
  user_id: string
  user_email: string
  archived: boolean
  messages: SupportMessage[]
}

// WebSocket message types
interface ChatChannelMessage {
  type: 'new_message'
  message: SupportMessage
}

interface AdminNotificationMessage {
  type: 'new_user_message'
  chat_id: string
  user_email: string
  message: SupportMessage
}
```

## Key Design Decisions

1. **One chat per user** - Simplifies UX, user always has same conversation history
2. **Soft-delete via archiving** - Preserves history, allows restore
3. **Auto-unarchive** - When user sends message to archived chat, reactivate it
4. **Delayed email notifications** - 5 min delay prevents spam for rapid replies
5. **Message deduplication** - Track seen IDs to prevent duplicates from send + broadcast echo
6. **Separate admin channel** - Allows future features like global unread count, desktop notifications

## Testing Checklist

After implementation:
- [ ] User can open widget and send message
- [ ] Admin sees message in real-time on dashboard
- [ ] Admin can reply and user sees it instantly
- [ ] Unread badge shows correct count
- [ ] Badge clears when widget opens
- [ ] Connection indicator reflects actual status
- [ ] Archive/restore works correctly
- [ ] Auto-unarchive triggers on user message
- [ ] Email sends after 5 min if message unread
- [ ] Email does NOT send if user already read message
- [ ] Messages appear in chronological order
- [ ] No duplicate messages appear

## Common Pitfalls

1. **Forgetting deduplication** - Messages sent by current user echo back via broadcast
2. **Race conditions on read status** - Use database transactions
3. **WebSocket auth** - Verify user can access the specific chat
4. **Stale connection status** - Handle reconnection gracefully
5. **Missing indexes** - Add composite index on (chat_id, created_at)
6. **Email timing** - Use background job, not synchronous send

---

## Framework-Specific Guidance

### Ruby on Rails

**Models:**
```ruby
# app/models/support_chat.rb
class SupportChat < ApplicationRecord
  belongs_to :user
  has_many :support_messages, dependent: :destroy

  scope :active, -> { where(archived_at: nil) }
  scope :archived, -> { where.not(archived_at: nil) }
  scope :recent_first, -> { order(last_message_at: :desc) }

  def touch_last_message
    update_column(:last_message_at, Time.current)
  end

  def unread_for_admin?
    support_messages.where(sender_type: :user)
      .where("created_at > ?", admin_viewed_at || Time.at(0)).exists?
  end

  def archive!
    update_column(:archived_at, Time.current)
  end

  def unarchive!
    update_column(:archived_at, nil)
  end
end

# app/models/support_message.rb
class SupportMessage < ApplicationRecord
  belongs_to :support_chat
  enum :sender_type, { user: 0, admin: 1 }
  validates :content, presence: true

  after_create :update_chat_timestamp
  after_create :auto_unarchive, if: :user?
  after_create_commit :broadcast_message
  after_create_commit :schedule_notification, if: :admin?

  private

  def broadcast_message
    ActionCable.server.broadcast("support_chat:#{support_chat_id}", {
      type: "new_message",
      message: { id:, content:, sender_type:, read_at:, created_at: }
    })
  end

  def schedule_notification
    SupportReplyNotificationJob.set(wait: 5.minutes).perform_later(self)
  end
end
```

**Channel:**
```ruby
# app/channels/support_chat_channel.rb
class SupportChatChannel < ApplicationCable::Channel
  def subscribed
    @chat = SupportChat.find(params[:chat_id])
    reject unless @chat.user_id == current_user.id || current_user.admin?
    stream_from "support_chat:#{@chat.id}"
  end

  def send_message(data)
    @chat.support_messages.create!(
      content: data["content"],
      sender_type: current_user.admin? ? :admin : :user
    )
  end
end
```

**Migration:**
```ruby
create_table :support_chats, id: :uuid do |t|
  t.references :user, type: :uuid, null: false, foreign_key: true, index: { unique: true }
  t.datetime :last_message_at
  t.datetime :admin_viewed_at
  t.datetime :archived_at
  t.timestamps
end

create_table :support_messages, id: :uuid do |t|
  t.references :support_chat, type: :uuid, null: false, foreign_key: true
  t.text :content, null: false
  t.integer :sender_type, default: 0
  t.datetime :read_at
  t.timestamps
end
add_index :support_messages, [:support_chat_id, :created_at]
```

### React (with any backend)

**Hook:**
```typescript
// hooks/useSupportChat.ts
import { useEffect, useState, useRef, useCallback } from 'react'

export function useSupportChat(websocketUrl: string) {
  const [chat, setChat] = useState<Chat | null>(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const seenIds = useRef(new Set<string>())

  useEffect(() => {
    fetch('/api/support_chat').then(r => r.json()).then(data => {
      setChat(data)
      data.messages.forEach((m: Message) => seenIds.current.add(m.id))
    })
  }, [])

  useEffect(() => {
    if (!chat?.id) return
    const ws = new WebSocket(`${websocketUrl}?chat_id=${chat.id}`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'new_message' && !seenIds.current.has(data.message.id)) {
        seenIds.current.add(data.message.id)
        setChat(prev => prev ? { ...prev, messages: [...prev.messages, data.message] } : prev)
      }
    }
    return () => ws.close()
  }, [chat?.id])

  const sendMessage = useCallback((content: string) => {
    wsRef.current?.send(JSON.stringify({ action: 'send_message', content }))
  }, [])

  return { chat, connected, sendMessage }
}
```

**Widget Component:**
```tsx
// components/ChatWidget.tsx
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const { chat, connected, sendMessage } = useSupportChat('/ws/chat')
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const unreadCount = chat?.messages.filter(
    m => m.sender_type === 'admin' && !m.read_at
  ).length ?? 0

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat?.messages])

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input.trim())
    setInput('')
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="w-80 h-96 bg-white rounded-lg shadow-xl flex flex-col">
          <header className="p-3 border-b flex justify-between items-center">
            <span>Support Chat</span>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
          </header>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chat?.messages.map(m => (
              <div key={m.id} className={`p-2 rounded ${m.sender_type === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'}`}>
                {m.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 border-t flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className="flex-1 border rounded px-2" placeholder="Type a message..." />
            <button onClick={handleSend} className="px-3 py-1 bg-blue-500 text-white rounded">Send</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="w-14 h-14 bg-blue-500 rounded-full text-white relative">
          💬
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  )
}
```

### Next.js (App Router)

**API Route:**
```typescript
// app/api/support-chat/route.ts
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let chat = await prisma.supportChat.findUnique({
    where: { userId: session.user.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  })

  if (!chat) {
    chat = await prisma.supportChat.create({
      data: { userId: session.user.id },
      include: { messages: true }
    })
  }

  return Response.json(chat)
}
```

**WebSocket with Pusher/Ably (serverless-friendly):**
```typescript
// For serverless, use Pusher, Ably, or similar
import Pusher from 'pusher'
const pusher = new Pusher({ appId, key, secret, cluster })

// When message is created:
await pusher.trigger(`support-chat-${chatId}`, 'new-message', messageData)

// Client-side with pusher-js:
const channel = pusher.subscribe(`support-chat-${chatId}`)
channel.bind('new-message', (data) => { /* update state */ })
```

### PHP/Laravel

**Models:**
```php
// app/Models/SupportChat.php
class SupportChat extends Model
{
    protected $casts = ['last_message_at' => 'datetime', 'archived_at' => 'datetime'];

    public function user() { return $this->belongsTo(User::class); }
    public function messages() { return $this->hasMany(SupportMessage::class); }

    public function scopeActive($query) { return $query->whereNull('archived_at'); }
    public function scopeArchived($query) { return $query->whereNotNull('archived_at'); }

    public function isUnreadForAdmin(): bool {
        return $this->messages()
            ->where('sender_type', 'user')
            ->where('created_at', '>', $this->admin_viewed_at ?? '1970-01-01')
            ->exists();
    }
}

// app/Models/SupportMessage.php
class SupportMessage extends Model
{
    protected static function booted() {
        static::created(function ($message) {
            $message->supportChat->update(['last_message_at' => now()]);
            broadcast(new NewSupportMessage($message))->toOthers();

            if ($message->sender_type === 'admin') {
                SendSupportReplyNotification::dispatch($message)->delay(now()->addMinutes(5));
            }
        });
    }
}
```

**Broadcasting Event:**
```php
// app/Events/NewSupportMessage.php
class NewSupportMessage implements ShouldBroadcast
{
    public function __construct(public SupportMessage $message) {}

    public function broadcastOn() {
        return new PrivateChannel('support-chat.' . $this->message->support_chat_id);
    }

    public function broadcastAs() { return 'new-message'; }
}
```

### Vue.js

**Composable:**
```typescript
// composables/useSupportChat.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useSupportChat() {
  const chat = ref<Chat | null>(null)
  const connected = ref(false)
  let ws: WebSocket | null = null
  const seenIds = new Set<string>()

  onMounted(async () => {
    const res = await fetch('/api/support-chat')
    chat.value = await res.json()
    chat.value?.messages.forEach(m => seenIds.add(m.id))

    ws = new WebSocket(`/ws/chat?id=${chat.value?.id}`)
    ws.onopen = () => connected.value = true
    ws.onclose = () => connected.value = false
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'new_message' && !seenIds.has(data.message.id)) {
        seenIds.add(data.message.id)
        chat.value?.messages.push(data.message)
      }
    }
  })

  onUnmounted(() => ws?.close())

  const sendMessage = (content: string) => {
    ws?.send(JSON.stringify({ action: 'send_message', content }))
  }

  return { chat, connected, sendMessage }
}
```

---

## Database Recommendations

### PostgreSQL (Recommended)
- Use UUID primary keys for security (non-guessable IDs)
- Use `timestamptz` for all datetime columns
- Add GIN index on content for full-text search (optional)

### MySQL
- Use `CHAR(36)` or `BINARY(16)` for UUIDs
- Use `DATETIME(6)` for microsecond precision
- Consider `utf8mb4` charset for emoji support

### SQLite (Development/Small Scale)
- Works fine for prototyping
- Store UUIDs as TEXT
- No native datetime type, store as ISO8601 strings

### MongoDB (Document Store)
- Embed messages in chat document if message count is bounded
- Or use separate collection with chat_id reference
- Use TTL index on archived chats for auto-cleanup (optional)

---

## Email Processing Recommendations

### Transactional Email Services
- **Postmark** - Best deliverability, simple API
- **SendGrid** - Good free tier, robust
- **AWS SES** - Cheapest at scale
- **Resend** - Modern DX, React email templates

### Implementation Pattern
```pseudo
// Always use background jobs for email
Job: SendSupportReplyNotification
  delay: 5 minutes after admin message

  perform(message_id):
    message = find_message(message_id)

    // Guard clauses - don't send if:
    if message.sender_type != 'admin': return
    if message.read_at != null: return        // Already read
    if message.chat.archived?: return         // Chat archived

    send_email(
      to: message.chat.user.email,
      template: 'support_reply',
      data: { message_preview: message.content.truncate(200) }
    )
```

### Email Template Tips
- Include message preview (truncated)
- Add direct link to open chat (if web app)
- Keep subject simple: "New reply from [App] Support"
- Include unsubscribe link for compliance

---

## Real-Time Technology Options

| Technology | Best For | Serverless? |
|------------|----------|-------------|
| ActionCable (Rails) | Rails apps | No |
| Socket.IO | Node.js apps | No |
| Pusher | Any stack | Yes |
| Ably | Any stack | Yes |
| Supabase Realtime | Supabase users | Yes |
| Firebase RTDB | Firebase users | Yes |
| Server-Sent Events | Simple one-way | Yes |

### Fallback Strategy
If WebSocket unavailable, implement polling:
```pseudo
// Poll every 5 seconds when disconnected
if (!websocket.connected) {
  setInterval(() => {
    fetch('/api/support-chat/messages?since=' + lastMessageTime)
      .then(newMessages => appendMessages(newMessages))
  }, 5000)
}
```

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
