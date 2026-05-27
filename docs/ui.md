# UI & Styling Standards

## Styling approach

**styled-components is the only styling mechanism.** Do not add inline styles, CSS Modules, Tailwind, or any other library.

All styled components are defined at the top of the file, above the component function. Import from `styled-components`:

```ts
import styled, { keyframes } from 'styled-components'
```

## Theme tokens

The theme is provided by `ThemeProvider` in `App.tsx` and typed via `src/styled.d.ts`. Always access design values through the theme — never hardcode colors or fonts.

```ts
// correct
const Title = styled.h2`
  color: ${p => p.theme.fg};
  font-family: ${p => p.theme.fontDisplay};
`

// forbidden
const Title = styled.h2`
  color: #f0ece8;
  font-family: 'Space Grotesk';
`
```

### Available tokens

| Token | Value | Use for |
|-------|-------|---------|
| `theme.bg` | `#0c0a0b` | Main background |
| `theme.bg2` | `#100d0e` | Secondary background |
| `theme.fg` | `#f0ece8` | Primary text |
| `theme.fg2` | `#6a6260` | Muted text, labels |
| `theme.accent` | `#f9a8d4` | Highlights, active states |
| `theme.accentDim` | `rgba(249,168,212,0.09)` | Hover backgrounds |
| `theme.border` | `#201a1c` | Borders, dividers |
| `theme.card` | `#0f0c0d` | Card backgrounds |
| `theme.fontDisplay` | Space Grotesk stack | Section headings, names |
| `theme.fontBody` | Inter stack | Body copy, descriptions |
| `theme.fontMono` | JetBrains Mono stack | Nav links, tags, labels, code |

### Font assignment rules

- `fontDisplay` → large headings and section titles
- `fontBody` → paragraph text and descriptions
- `fontMono` → nav links, tech tags, badges, labels, anything code-like

## Transient props

Props that control styling (not passed to the DOM) must be prefixed with `$`. This prevents React from forwarding unknown attributes to HTML elements.

```ts
const Card = styled.article<{ $hovered: boolean }>`
  transform: ${p => p.$hovered ? 'translateY(-3px)' : 'none'};
`

const ActionLink = styled.a<{ $primary?: boolean }>`
  background: ${p => p.$primary ? p.theme.accent : 'transparent'};
`
```

## Animations

Define animations with `keyframes` from `styled-components`, not with `@keyframes` in `GlobalStyles`.

```ts
import styled, { keyframes } from 'styled-components'

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
`

const Box = styled.div`
  animation: ${fadeUp} 0.6s ease forwards;
`
```

Exception: `scrollPulse` is defined in `GlobalStyles` because it's used across multiple components via a named reference. Avoid adding more global keyframes — prefer colocated ones.

## Responsive breakpoints

Three breakpoints are used in this app. Use them consistently — don't introduce new ones.

| Breakpoint | Used for |
|------------|----------|
| `768px` | Nav padding |
| `600px` | Side padding (64px → 24px), font size reduction |
| `400px` | Nav ultra-narrow |

The side padding pattern: `64px` on desktop, `24px` on mobile (≤600px). Apply this to any new full-width section:

```ts
const Section = styled.section`
  padding: 0 64px;

  @media (max-width: 600px) {
    padding: 0 24px;
  }
`
```
