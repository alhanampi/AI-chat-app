# Clean Code Standards

Architecture and conventions for this AI chat app. Read alongside [`docs/components.md`](components.md), [`docs/data.md`](data.md), and [`docs/ui.md`](ui.md).

---

## Folder structure

```
src/
  Components/
    Chat/
      index.tsx          ← JSX and hook wiring only; no business logic
      hooks/
        useConversations.ts  ← chat CRUD, auth init, localStorage, message sync
        useMessaging.ts      ← send, regenerate, streaming
      styles.scss
    CopyButton/
      index.tsx
    SpeakButton/
      index.tsx
    SideBar/
      index.tsx
      types.ts           ← component-local types and interfaces
      utils.ts           ← component-local utility functions and constants
      styles.scss
    ChatCard/
      index.tsx
      styles.scss
    ConfirmPopup/
      index.tsx
      styles.scss
  utils/
    types.ts             ← shared TypeScript interfaces (ChatObject, Message, *Props)
    constants.ts         ← shared utilities and constants (stripMarkdown, hasNonLatinScript, PENDING_CHAT_ID)
    Markdown/
      index.tsx          ← MarkdownMessage component
      styles.scss
  services/
    chatService.ts       ← all Axios API calls; no fetch logic in components
  App.tsx
  main.tsx
  index.scss             ← global reset, CSS custom properties, fonts

api/                     ← serverless API handlers (Vercel format)
  _auth.js               ← Clerk JWT verification helpers
  _db.js                 ← Neon sql client singleton
  chat.js                ← POST /api/chat
  conversations.js       ← GET/POST /api/conversations
  migrate.js             ← POST /api/migrate
  conversations/
    [id]/
      index.js           ← GET/PUT/DELETE /api/conversations/:id
      duplicate.js       ← POST /api/conversations/:id/duplicate

server.dev.js            ← Express wrapper that serves all api/ handlers locally
docs/                    ← this documentation
```

---

## Types — `src/utils/types.ts`

All interfaces shared across more than one file go here.

**What belongs here:** `ChatObject`, `Message`, `ChatCardProps`, `SideBarProps`, `ChatProps`, `ConfirmPopupProps`

**What does not belong here:** types local to one component, API response shapes (define those inline in `chatService.ts`)

---

## Component-local types, utils, and constants

Types, interfaces, utility functions, and constants that belong to a single component live in dedicated files inside the component folder — **never inline in `index.tsx`**.

```
ComponentName/
  index.tsx       ← only the component(s) and React logic
  types.ts        ← local types and interfaces
  utils.ts        ← local utility functions and pure-logic constants
  styles.scss
```

- `types.ts` contains `type` and `interface` declarations used only within that component.
- `utils.ts` contains helper functions and module-level constants (e.g. `MS_PER_DAY`, group labels).
- If a type or utility grows to be needed by a second component, move it to `src/utils/types.ts` or `src/utils/constants.ts` respectively.
- `index.tsx` imports from `./types` and `./utils` — never declares them inline.

---

## Shared utilities — `src/utils/constants.ts`

Pure functions and module-level constants used by more than one component live here.

**What belongs here:** `PENDING_CHAT_ID`, `stripMarkdown`, `hasNonLatinScript`, and any other utility or constant with no component-specific context.

**What does not belong here:** types or interfaces (those go in `types.ts`), component-local constants (those stay in `ComponentName/utils.ts`).

---

## Services — `src/services/chatService.ts`

All network calls go through `chatService.ts`. Components never call `axios` or `fetch` directly.

Each function is a thin async wrapper: receives typed arguments, returns a typed result. Auth functions accept a `GetToken` callback (from Clerk's `useAuth`) so the service layer never imports Clerk itself.

---

## API handlers — `api/`

Handlers follow the Vercel serverless function signature: `export default async function handler(req, res)`. They are also served locally by `server.dev.js` via Express, which maps the file paths to routes.

- `_auth.js` and `_db.js` are internal helpers (prefixed with `_` so they are not treated as routes).
- Route params available via `req.params?.id ?? req.query?.id` — Express sets `req.params`, Vercel sets `req.query`.

---

## State management

No global store. All shared state lives in `Chat/index.tsx` (via hooks) and is passed down as props. `App.tsx` owns only `isDarkMode` and `mobileOpen`.

Business logic is split into two custom hooks in `Chat/hooks/`:
- `useConversations` — owns `chats`, `activeChat`, `messages`, all CRUD handlers, auth init, and localStorage persistence.
- `useMessaging` — owns `isLoading`, `handleSendMessage`, and `handleRegenerate`; receives state slices from `useConversations`.

`Chat/index.tsx` only wires these hooks together and renders JSX. It owns only UI-local state (`inputValue`, `showEmojiPicker`, `isDark`, `errorMsg`).

If state needs to be shared between two components that are siblings: lift it to their nearest common ancestor (`Chat` or `App`).

---

## Guest vs auth branching

`Chat/index.tsx` branches on `isSignedIn` (from Clerk's `useAuth`) throughout its handlers. The pattern is consistent:

```ts
if (!isSignedIn) {
  // operate on chats[] in memory + localStorage
} else {
  // call chatService, update chats[] optimistically, then sync from DB
}
```

Never put auth branching inside `chatService.ts` — keep it in the component.

---

## Optimistic updates

In auth mode, the UI updates immediately (optimistic) and the DB write happens in the background. If the write fails, the UI is rolled back (e.g. message removed from state).

The pending new-conversation placeholder uses the sentinel ID `PENDING_CHAT_ID = "__pending_new__"`. Any code that reads `activeChat` and needs to skip the pending case must check for this value explicitly.

---

## Import order

```ts
// 1. React
import { useState, useEffect, useRef } from "react";

// 2. Third-party
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";

// 3. Internal services / utils / types
import { fetchConversations } from "../../services/chatService";
import type { ChatObject } from "../../utils/types";

// 4. Child components
import SideBar from "../SideBar";

// 5. Styles — always last
import "./styles.scss";
```

---

## TypeScript

- No `any`. Use `unknown` and narrow it, or extend a third-party type with a local interface.
- Shared prop types use a named `interface` in `utils/types.ts`, not inline object types in function signatures.
- API response shapes that are not shared are typed inline at the call site in `chatService.ts`.

---

## Rules summary

| Rule                                                        | Rationale                                                         |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| All state in `Chat`; pass as props                          | No hidden data flow; state ownership is obvious                   |
| All API calls in `chatService.ts`                           | Components stay focused; easy to swap transport                   |
| Optimistic updates + rollback on error                      | UI feels instant; auth-mode latency is hidden                     |
| `PENDING_CHAT_ID` sentinel for draft conversations          | Avoids a separate `isPending` boolean; the ID doubles as the flag |
| `Number.isFinite(chat.messageCount)` before using the count | `??` doesn't catch `NaN`; DB bigint can arrive as a string        |
| Guest/auth branching only in `Chat`, never in `chatService` | Service stays stateless and reusable                              |
| SCSS colocated with each component                          | No global class leakage; easy to find styles                      |
| CSS custom properties for all colors                        | Single source of truth; dark/light swap with one class toggle     |
| Component-local types in `types.ts`, utils in `utils.ts`   | `index.tsx` stays focused on rendering; logic is easy to test     |
