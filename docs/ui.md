# UI & Styling Standards

## Styling approach

**SCSS is the only styling mechanism.** Each component has a colocated `styles.scss` file. No inline styles, no CSS Modules, no Tailwind, no styled-components.

```
Chat/
  index.tsx
  styles.scss   ← all styles for Chat and its direct DOM children
```

Import the file at the top of the component:

```ts
import "./styles.scss";
```

## Prohibited

- **`!important` is banned.** Fix specificity at the selector level instead.
- **Hardcoded colors.** Always use CSS custom properties (see tokens below).
- **Inline `style` props** — except for dynamic values that cannot be expressed in SCSS, such as the sidebar width: `style={{ '--sidebar-width': `${width}px` }}`.

## Theming — CSS custom properties

The theme is applied by toggling `.dark` or `.light` on `<body>`. Both classes are defined in `src/index.scss`. Always use the CSS variables they define — never hardcode colors.

### Available tokens

| Variable            | Dark value | Light value | Use for                                           |
| ------------------- | ---------- | ----------- | ------------------------------------------------- |
| `--bg-color`        | `#131927`  | `#f2eef8`   | Page and panel backgrounds                        |
| `--text-color`      | `#ebf3ff`  | `#283552`   | Primary text, active states                       |
| `--text-color-soft` | `#aab8d8`  | `#726b99`   | Secondary text, placeholders, muted labels        |
| `--switch-active`   | `#907ad6`  | `#907ad6`   | Toggle switch on-state                            |
| `--switch-inactive` | `#232b3e`  | `#ddd6ec`   | Toggle switch off-state, card backgrounds         |
| `--main`            | `#7564ac`  | `#8b6bbf`   | Primary accent (borders, icons, buttons)          |
| `--accent`          | `#a994c6`  | `#b99fd6`   | Secondary accent, gradients                       |
| `--main-alt`        | `#3382b4`  | `#5a90c0`   | Alternate accent (currently unused in components) |
| `--accent-alt`      | `#5baac5`  | `#82b8d4`   | Alternate accent pair                             |

Example:

```scss
.myElement {
  background: var(--switch-inactive);
  color: var(--text-color-soft);
  border: 1px solid var(--main);
}
```

## Fonts

Three fonts are loaded from Google Fonts in `src/index.scss`:

| Family   | Weight range               | Use for                          |
| -------- | -------------------------- | -------------------------------- |
| `Outfit` | 100–900                    | Default body font (`*` selector) |
| `Inter`  | 100–900                    | Available for secondary text     |
| `Exo 2`  | 100–900 (including italic) | Available for display text       |

`Outfit` is the effective default. Do not introduce additional font families.

## Base sizing

`html { font-size: 62.5% }` — so `1rem = 10px`. All sizing should use `rem` units, not `px`.

## Responsive breakpoints

| Breakpoint | Used for                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------- |
| `800px`    | Header switches to compact layout; mobile menu button appears; sidebar becomes full-screen overlay |
| `400px`    | Header title font size reduction                                                                   |

The sidebar uses a CSS custom property `--sidebar-width` (set inline from React state) on the `.chatList` element so the width can be dynamically controlled without inline styles on inner elements.

## Active state pattern

The active conversation card uses a gradient background:

```scss
&.active {
  background: linear-gradient(135deg, var(--main), var(--accent));
  border-left-color: var(--accent);
}
```

Text inside an active card switches to `--text-color` at full weight.

## Emoji picker theming

`emoji-picker-react` receives the `Theme.DARK` or `Theme.LIGHT` enum value from a `isDark` state in `Chat`, which is kept in sync with `document.body.classList` via a `MutationObserver`.
