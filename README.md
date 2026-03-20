# AI Chat App

A fully functional AI chat application built to demonstrate frontend engineering skills — component architecture, state management, responsive design, and real-time AI integration.

---

## Features

- **AI conversations** powered by Groq (Llama 3.1) via a Vercel Serverless Function
- **Multiple conversations** — create, rename, duplicate, and delete chats
- **Persistent sessions** — conversations and active chat saved to localStorage
- **Markdown rendering** — AI responses render with full markdown support: code blocks with syntax highlighting, tables, blockquotes, headings, and lists
- **Copy code button** — one-click copy on every code block
- **Emoji picker** — insert emojis into messages
- **Dark / light mode** — theme toggle with syntax highlighter that adapts automatically
- **Resizable sidebar** — drag to adjust width on desktop
- **Responsive layout** — collapsible sidebar drawer on mobile (< 800px)

---

## Tech Stack

**Frontend**
| | |
|---|---|
| React 19 | UI library |
| TypeScript | Type safety throughout |
| Vite | Build tool and dev server |
| SCSS (Sass) | Component-scoped styles with CSS custom properties for theming |
| react-markdown + remark-gfm | Markdown parsing and rendering |
| react-syntax-highlighter | Syntax-highlighted code blocks |
| emoji-picker-react | Emoji picker component |
| uuid | Unique IDs for conversations |

**Tooling**
| | |
|---|---|
| Claude (Anthropic) | AI pair programming — used throughout development for implementation support, code review, and refactoring |

**Backend**

The API runs as a Vercel Serverless Function (`api/chat.js`) — no separate server required.

| | |
|---|---|
| Vercel Serverless Functions | API handler |
| Groq SDK | LLM inference (Llama 3.1 8B) |

---

## Architecture Highlights

- **Component decomposition** — UI split into focused, reusable components (`Chat`, `SideBar`, `MarkdownMessage`) each with co-located styles
- **State lifted appropriately** — conversation state owned at the `Chat` level and passed down via props; mobile menu state lifted to `App`
- **No global state library** — all state managed with React hooks (`useState`, `useEffect`, `useRef`), demonstrating confident use of core React without reaching for Redux
- **Custom hooks** — `useDarkMode` (MutationObserver on `document.body`) for reactive theme detection across components
- **Responsive without a CSS framework** — media queries and flexbox only, no Bootstrap or Tailwind

---

## Running Locally

```bash
npm install
npm run dev
```

Create a `.env.local` file in the root:

```
GROQ_API_KEY=your_key_here
```

Get a free API key at [console.groq.com](https://console.groq.com).
