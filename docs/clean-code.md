# Clean Code Standards

Architecture and file organization conventions for this portfolio. Read alongside [`docs/components.md`](components.md) and [`docs/ui.md`](ui.md).

---

## Folder structure

```
src/
  components/
    Nav/
      index.tsx          ← component logic and JSX
      Nav.styles.ts      ← all styled-components for this component
    Hero/
      index.tsx
      Hero.styles.ts
    Experience/
      index.tsx
      Experience.styles.ts
    ...
  constants/
    index.ts             ← app-level constants (nav links, section ids, etc.)
  utils/
    types.ts             ← shared interfaces and TypeScript types
  data/                  ← content arrays (experience, skills, certificates…)
  styles/                ← global theme and GlobalStyles
```

---

## Components — one folder per component

Each component lives in its own subfolder under `src/components/`. The folder contains exactly two files:

| File                      | Purpose                                        |
| ------------------------- | ---------------------------------------------- |
| `index.tsx`               | Component function, state, event handlers, JSX |
| `ComponentName.styles.ts` | All `styled-components` for that component     |

**index.tsx** imports styles from the sibling file:

```ts
// src/components/Nav/index.tsx
import { Wrapper, LinkList, NavLink } from './Nav.styles'
```

**ComponentName.styles.ts** exports named styled-components. No default export, no logic:

```ts
// src/components/Nav/Nav.styles.ts
import styled from 'styled-components'

export const Wrapper = styled.nav<{ $scrolled: boolean }>`
  ...
`

export const NavLink = styled.a<{ $active: boolean }>`
  ...
`
```

Do not define styled-components inside `index.tsx`. Do not put JSX or hooks inside `*.styles.ts`.

---

## Constants — `src/constants/index.ts`

App-level values that are not internal component state and not content data belong in `src/constants/index.ts`.

**What goes here:**

- Navigation link definitions
- Section anchor IDs
- Any magic string or number used across more than one file

**What does NOT go here:**

- Component-internal derived values (compute them inline or with a helper)
- Content data — that lives in `src/data/`
- Theme tokens — those live in `src/styles/theme.ts`

```ts
// src/constants/index.ts
export const NAV_LINKS = [
  { label: 'projects', href: '#projects' },
  { label: 'skills', href: '#skills' },
  { label: 'experience', href: '#experience' },
  { label: 'learning', href: '#certificates' },
  { label: 'contact', href: '#contact' },
] as const

export const SECTION_IDS = {
  projects: 'projects',
  skills: 'skills',
  experience: 'experience',
  certificates: 'certificates',
  contact: 'contact',
} as const
```

---

## Utils — `src/utils/types.ts`

Shared TypeScript interfaces and types that are used across multiple components live in `src/utils/types.ts`.

**What goes here:**

- Interfaces shared between a data file and a component (e.g. `Job`, `Certificate`, `Project`)
- Union types or utility types used in more than one place

**What does NOT go here:**

- Types local to a single component (define them in that component's `index.tsx`)
- Styled-component prop types (define them inline in the `.styles.ts` file)

```ts
// src/utils/types.ts
export interface Job {
  company: string
  role: string
  period: string
  description: string
  bullets: string[]
  stack?: string
}

export interface Certificate {
  title: string
  issuer: string
  platform: string
  date: string
}
```

Data files import from `utils/types.ts` and re-export the array:

```ts
// src/data/experience.ts
import type { Job } from '../utils/types'

export const experience: Job[] = [ ... ]
```

---

## Import order

Every file follows the same import order — one blank line between groups:

```ts
// 1. React
import { useState, useEffect } from 'react'

// 2. Third-party
import styled from 'styled-components'

// 3. Constants / utils / types
import { NAV_LINKS } from '../../constants'
import type { Job } from '../../utils/types'

// 4. Data
import { experience } from '../../data/experience'

// 5. Child components
import JobCard from '../JobCard'

// 6. Styles — always last
import { Wrapper, Heading } from './Experience.styles'
```

Never mix groups. If an import doesn't fit a group cleanly, it goes in the nearest one above it.

---

## Hooks — `src/hooks/`

Extract logic into a custom hook when:

- The same `useEffect` or stateful block appears in more than one component, **or**
- A single `useEffect` + its state exceeds ~15 lines inside a component

Place hooks in `src/hooks/useX.ts`. One hook per file, named `useX`.

Examples already in this codebase that should become hooks:

| Logic | Hook name | Currently in |
|---|---|---|
| `window.scrollY > 60` listener | `useScrolled` | `Nav/index.tsx` |
| `IntersectionObserver` for active section | `useActiveSection` | `Nav/index.tsx` |

```ts
// src/hooks/useScrolled.ts
import { useState, useEffect } from 'react'

export function useScrolled(threshold = 60) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [threshold])
  return scrolled
}
```

Do not create a hook just to avoid one `useState`. Hooks are for reusable or complex side-effect logic, not for splitting code for its own sake.

---

## TypeScript strictness

**No `any`.** If the type is genuinely unknown, use `unknown` and narrow it. If a third-party type is missing, extend it with a local interface.

**Props must be typed with a named interface** in the component's `index.tsx`, not inline in the function signature:

```ts
// ✓
interface Props {
  isOpen: boolean
  onClose: () => void
}
export default function Modal({ isOpen, onClose }: Props) { ... }

// ✗
export default function Modal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) { ... }
```

**Styled-component props use the `$` transient prefix** to prevent them forwarding to the DOM (see [`docs/ui.md`](ui.md)):

```ts
// Nav.styles.ts
export const NavLink = styled.a<{ $active: boolean }>` ... `
```

---

## Component size

If `index.tsx` exceeds ~120 lines of JSX (not counting imports or the styles file), the component likely has more than one responsibility.

Split by extracting subcomponents into the same folder:

```
Experience/
  index.tsx          ← orchestrates the list, manages expanded state
  ExperienceItem.tsx ← renders a single job entry
  index.styles.ts
  ExperienceItem.styles.ts
```

The parent `index.tsx` imports the subcomponent directly — not through `src/components/`:

```ts
import ExperienceItem from './ExperienceItem'
```

Subcomponents that only make sense inside their parent folder are not exported from `src/components/index.ts`.

---

## Rules summary

| Rule | Rationale |
|---|---|
| One folder per component, two files max | Styles and logic stay co-located without polluting one file |
| Styles file exports named styled-components only | Components stay readable; styles stay movable |
| App-level constants in `src/constants/` | Prevents magic strings scattered across components |
| Shared types in `src/utils/types.ts` | Single source of truth; data files stay thin |
| Content data stays in `src/data/` | Content is edited independently from structure |
| Theme tokens only in `src/styles/theme.ts` | No hardcoded colors, fonts, or breakpoints anywhere else |
| Fixed import order (React → third-party → constants → data → components → styles) | Consistent, diff-friendly, immediately readable |
| Extract to `src/hooks/` when logic repeats or exceeds ~15 lines | Keeps components focused; makes logic testable in isolation |
| No `any`; props typed with named `interface Props` | Prevents silent type errors; keeps signatures readable |
| `$` prefix on all styled-component props | Prevents DOM forwarding warnings; signals "style-only" prop at a glance |
| Split component when `index.tsx` JSX exceeds ~120 lines | Single responsibility; subcomponents live in the same folder |
