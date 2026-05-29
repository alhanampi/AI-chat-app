# Component Standards

## Folder structure

Each component lives in its own subfolder under `src/Components/`. Each folder contains exactly two files:

```
src/
  Components/
    Chat/
      index.tsx      ← all state, event handlers, and JSX
      styles.scss    ← component-scoped styles
    SideBar/
      index.tsx
      styles.scss
    ChatCard/
      index.tsx
      styles.scss
    ConfirmPopup/
      index.tsx
      styles.scss
  utils/
    types.ts         ← shared TypeScript interfaces
    Markdown/
      index.tsx      ← MarkdownMessage renderer
      styles.scss
  services/
    chatService.ts   ← all API calls
```

## Component map

### `App`
Root shell. Owns dark/light mode toggle state and mobile sidebar open state. Renders the header (title, dark mode switch, Clerk auth buttons, mobile menu icon) and mounts `<Chat>`.

### `Chat`
The main orchestrator. Owns all application state: `chats`, `messages`, `activeChat`, `isLoading`, `isInitializing`, `inputValue`. Handles auth vs. guest branching, message sending, conversation CRUD, and localStorage persistence. Passes props down to `SideBar`.

### `SideBar`
Displays the conversation list and the new-chat button. Width is user-resizable via a drag handle. On mobile it slides in as an overlay. Renders one `ChatCard` per conversation.

### `ChatCard`
Renders a single conversation entry. Shows the conversation name, message count, and action icons (rename, duplicate, delete). Inline rename uses a controlled input. Destructive and ambiguous actions route through `ConfirmPopup`.

### `ConfirmPopup`
A modal built with `reactjs-popup`. Accepts `open`, `message`, `confirmLabel`, `onConfirm`, and `onCancel`. Used by `ChatCard` for delete, duplicate, rename-save, and rename-cancel confirmations.

### `MarkdownMessage` (`src/utils/Markdown/index.tsx`)
Renders AI response text as Markdown using `react-markdown` with `remark-gfm` and `react-syntax-highlighter` for code blocks. Accepts a `nonLatin` flag that adjusts font rendering for CJK/Arabic/Hebrew/etc. scripts.

### `SpeakButton` (defined inside `Chat/index.tsx`)
A small icon button that uses the Web Speech API (`SpeechSynthesisUtterance`) to read a message aloud. Strips Markdown formatting before speaking. Toggles between play and stop state.

## State ownership

All shared state lives in `Chat`. Child components receive only what they need via props — nothing is in global context or a store.

| State | Owner | Passed to |
|---|---|---|
| `chats` | `Chat` | `SideBar` → `ChatCard` |
| `activeChat` | `Chat` | `SideBar` → `ChatCard` |
| `messages` | `Chat` | rendered inline in `Chat` |
| `isLoading` | `Chat` | rendered inline in `Chat` |
| `mobileOpen` | `App` | `Chat` → `SideBar` |
| `isDarkMode` | `App` | toggles `.dark`/`.light` on `<body>` |

## Adding a new component

1. Create `src/Components/MyComponent/index.tsx` and `styles.scss`
2. Import styles: `import "./styles.scss"`
3. Define and export a typed props interface in `index.tsx`
4. Mount it where needed — lift state to `Chat` or `App` if shared state is required
