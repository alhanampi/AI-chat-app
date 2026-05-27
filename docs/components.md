# Component Standards

## File structure

Each component is a single file with one default export. Styled components are defined above the component function in the same file — no separate `styles.ts` files.

```
src/components/
  Hero.tsx         ← full-page section, no props
  Nav.tsx          ← full-page section, no props
  Projects.tsx     ← full-page section, no props
  ProjectCard.tsx  ← leaf component, receives typed props
  Skills.tsx
  Experience.tsx
  Contact.tsx
```

## Section components vs. leaf components

**Section components** (Hero, Nav, Projects, Skills, Experience, Contact) map to a single page section. They:

- Take no props
- Import their content directly from `src/data/`
- Are rendered once in `App.tsx`

**Leaf components** (ProjectCard) are reusable units rendered inside a section. They:

- Receive typed props via a colocated `interface Props { ... }` block
- Do not import from `src/data/` directly

```ts
// leaf component — typed props, no data imports
interface Props {
  project: Project
  index:   number
}

export default function ProjectCard({ project, index }: Props) { ... }
```

## Adding a new section

1. Create `src/components/MySectionName.tsx`
2. If it needs content, add a data file at `src/data/my-section.ts` (see `docs/data.md`)
3. Add the component to `App.tsx` inside `<main>`
4. Add a nav link entry to the `links` array in `Nav.tsx`

The section's root element should have an `id` matching the nav href:

```tsx
<section id="my-section">...</section>
```

## State

Components manage their own local UI state with `useState`. There is no global state store — don't add one. If two components need to share state, lift it to `App.tsx` and pass it as props.

## No external UI libraries

This app uses styled-components for all UI. Do not install shadcn/ui, MUI, Radix, or any other component library. Build what you need with styled-components and native HTML elements.
