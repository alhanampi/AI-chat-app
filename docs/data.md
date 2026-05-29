# Data Layer

## Overview

The app has two data modes that coexist:

| Mode  | Storage         | Activated when              |
| ----- | --------------- | --------------------------- |
| Guest | `localStorage`  | User is not signed in       |
| Auth  | Neon PostgreSQL | User is signed in via Clerk |

All API communication goes through `src/services/chatService.ts`.

---

## Guest mode — localStorage

Guest conversations are stored under two keys:

| Key            | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| `"chats"`      | `JSON.stringify(ChatObject[])` — full array including messages |
| `"activeChat"` | The `id` of the last active conversation                       |

Messages are embedded directly inside each `ChatObject.messages` array. The `chats` array is persisted on every state change via a `useEffect` in `Chat`.

Guest users can use the app fully. When they sign in, their localStorage chats are migrated to the database via `POST /api/migrate` (if the DB has no conversations yet). After migration, localStorage is cleared.

---

## Auth mode — Neon PostgreSQL

### Schema

**`conversations`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key, auto-generated |
| `user_id` | `text` | Clerk user ID |
| `name` | `text` | Display name, defaults to "New Conversation" |
| `created_at` | `timestamptz` | Auto-set on insert |
| `updated_at` | `timestamptz` | Updated on every new message |

**`messages`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key |
| `conversation_id` | `uuid` | Foreign key → `conversations.id` |
| `type` | `text` | `"prompt"` (user) or `"response"` (AI) |
| `text` | `text` | Message content |
| `timestamp` | `text` | Locale string, stored as-is |
| `created_at` | `timestamptz` | Used for ordering |

### Lazy message loading

In auth mode, `ChatObject.messages` is always `[]` in the sidebar state. Messages for a conversation are fetched from `GET /api/conversations/:id` only when that conversation becomes active. The `messageCount` field on `ChatObject` tracks the real count without loading all messages.

---

## API endpoints

All routes require a Clerk JWT in the `Authorization: Bearer <token>` header, except guest calls to `POST /api/chat` (no token required).

| Method   | Path                               | Purpose                                                                                                             |
| -------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/chat`                        | Send a message. Guest: stateless, uses `history` from body. Auth: saves to DB, returns `{ reply, conversationId }`. |
| `GET`    | `/api/conversations`               | List all conversations for the user, ordered by `updated_at DESC`. Includes `message_count` per conversation.       |
| `GET`    | `/api/conversations/:id`           | Fetch all messages for one conversation, ordered by `created_at ASC`.                                               |
| `PUT`    | `/api/conversations/:id`           | Rename a conversation.                                                                                              |
| `DELETE` | `/api/conversations/:id`           | Delete a conversation and its messages.                                                                             |
| `POST`   | `/api/conversations/:id/duplicate` | Duplicate a conversation and all its messages.                                                                      |
| `POST`   | `/api/migrate`                     | Bulk-import guest `ChatObject[]` into the DB.                                                                       |

---

## `chatService.ts`

Thin wrappers around Axios. Every auth call calls `getToken()` (Clerk) and passes the result as a Bearer header.

```ts
fetchConversations(getToken); // GET /api/conversations
fetchMessages(id, getToken); // GET /api/conversations/:id
sendMessage(text, convId, getToken); // POST /api/chat (convId may be null → creates new)
sendMessageGuest(text, history); // POST /api/chat (no token)
renameConversation(id, name, getToken);
deleteConversation(id, getToken);
duplicateConversation(id, getToken);
migrateLocalStorage(chats, getToken);
```

---

## Types (`src/utils/types.ts`)

```ts
interface ChatObject {
  id: string;
  date: string; // display date string
  name: string;
  messages: Message[]; // always [] in auth mode; full array in guest mode
  messageCount?: number; // set from DB in auth mode; derived from messages.length in guest mode
}

interface Message {
  type: "prompt" | "response";
  text: string;
  timeStamp: string;
}
```
