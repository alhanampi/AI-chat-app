# AI Chat App

**[Live demo →](https://ai-chat-app-flax-eight.vercel.app/)**

A full-stack AI chat application with optional authentication. Guest users get instant access with conversations saved locally; signed-in users get persistent conversations backed by a PostgreSQL database.

---

## Features

- **Guest mode** — use the app immediately, no account required; conversations are saved in `localStorage`
- **Auth mode** — sign in with Clerk for persistent conversations stored in Neon PostgreSQL
- **Guest → auth migration** — conversations created as a guest are automatically imported to the database on first sign-in (if the account is new)
- **AI conversations** powered by Groq (Llama 3.1 8B)
- **Multiple conversations** — create, rename, duplicate, and delete chats
- **Message count** — each conversation card shows how many messages it contains
- **Markdown rendering** — AI responses render with full Markdown support: code blocks with syntax highlighting, tables, blockquotes, headings, and lists
- **Read aloud** — any message can be read aloud using the Web Speech API
- **Emoji picker** — insert emojis into your message
- **Dark / light mode** — toggle in the header, defaults to dark
- **Resizable sidebar** — drag the handle to adjust width on desktop
- **Responsive layout** — collapsible sidebar drawer on mobile (< 800px)

---

## Tech stack

**Frontend**

|                             |                                                                |
| --------------------------- | -------------------------------------------------------------- |
| React 19                    | UI library                                                     |
| TypeScript                  | Type safety throughout                                         |
| Vite                        | Build tool and dev server                                      |
| SCSS (Sass)                 | Component-scoped styles with CSS custom properties for theming |
| Clerk                       | Authentication (sign in/up modal, user session)                |
| react-markdown + remark-gfm | Markdown parsing and rendering                                 |
| react-syntax-highlighter    | Syntax-highlighted code blocks                                 |
| emoji-picker-react          | Emoji picker component                                         |
| uuid                        | Unique IDs for guest conversations                             |
| axios                       | HTTP client for API calls                                      |

**Backend**

|                                   |                                              |
| --------------------------------- | -------------------------------------------- |
| Groq SDK                          | LLM inference (Llama 3.1 8B)                 |
| Neon + `@neondatabase/serverless` | Serverless PostgreSQL database               |
| Clerk backend SDK                 | JWT verification in API handlers             |
| Vercel Serverless Functions       | API handlers in production                   |
| Node.js + Express                 | Local development API server (`npm run dev`) |

---

## Running locally

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create a `.env.local` file at the project root:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEON_STRING=postgresql://...
GROQ_API_KEY=gsk_...
```

| Variable                     | Where to get it                                 |
| ---------------------------- | ----------------------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys                      |
| `CLERK_SECRET_KEY`           | Clerk dashboard → API Keys                      |
| `NEON_STRING`                | Neon console → your project → Connection string |
| `GROQ_API_KEY`               | [console.groq.com](https://console.groq.com)    |

### 3. Database setup

Run the following SQL in your Neon console once:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT 'New Conversation',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('prompt', 'response')),
  text             TEXT NOT NULL,
  timestamp        TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4. Start the dev server

```bash
npm run dev
```

This starts two processes concurrently:

- **Vite** on `http://localhost:5173` — the React frontend
- **Express** on `http://localhost:3000` — local API server serving all `api/` handlers

---

## Project structure

```
src/
  Components/
    Chat/           ← main orchestrator; owns all shared state
    SideBar/        ← resizable conversation list + new chat button
    ChatCard/       ← single conversation entry (name, count, actions)
    ConfirmPopup/   ← modal for confirming destructive actions
  utils/
    types.ts        ← shared TypeScript interfaces
    Markdown/       ← MarkdownMessage renderer + SpeakButton
  services/
    chatService.ts  ← all API calls (thin Axios wrappers)
  App.tsx           ← root: header, dark mode toggle, Clerk auth buttons
  index.scss        ← global reset, CSS variables, fonts

api/
  _auth.js          ← Clerk JWT verification helpers
  _db.js            ← Neon client singleton
  chat.js           ← POST /api/chat (guest + auth)
  conversations.js  ← GET/POST /api/conversations
  conversations/
    [id]/index.js   ← GET/PUT/DELETE /api/conversations/:id
    [id]/duplicate.js ← POST /api/conversations/:id/duplicate
  migrate.js        ← POST /api/migrate (guest → auth import)

server.dev.js       ← Express wrapper for local API development
docs/               ← architecture documentation
```

---

## Architecture notes

### No global state

All shared state lives in `Chat/index.tsx` and flows down as props. `App.tsx` owns only `isDarkMode` and `mobileOpen`. No Redux, no Context, no store.

### Guest vs auth branching

`Chat` branches on `isSignedIn` throughout its handlers. Guest mode operates on in-memory React state persisted to `localStorage`. Auth mode makes API calls and updates state optimistically while the database write completes in the background; failures roll back the UI.

### New conversation (auth)

Clicking "new chat" inserts a placeholder entry (`id = "__pending_new__"`) in the sidebar immediately. The real database record is created when the first message is sent. If the user navigates away without sending, the placeholder is removed cleanly.

### Message count

`GET /api/conversations` returns `message_count` per conversation via a `LEFT JOIN COUNT`. The frontend updates the count optimistically when messages are sent (+2 per exchange) and overwrites it with the exact figure when messages are fetched from the database.

---

## Docs

- [`docs/components.md`](docs/components.md) — component map and state ownership
- [`docs/data.md`](docs/data.md) — database schema, API endpoints, guest/auth data flow
- [`docs/ui.md`](docs/ui.md) — SCSS conventions, CSS variables, theming
- [`docs/clean-code.md`](docs/clean-code.md) — folder structure, import order, TypeScript rules
