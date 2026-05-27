# Data Layer

## Overview

Most site content lives in `src/data/` as plain TypeScript files. The one exception is **projects**, which are fetched live from GitHub pinned repos in production via `api/pinned.ts`.

```
src/data/
  projects.ts    ← Project interface + static array (used as dev fallback)
  experience.ts  ← Job[]
  skills.ts      ← SkillCategory[]

api/
  pinned.ts      ← Vercel edge function — fetches pinned repos from GitHub GraphQL
```

## File convention

Each data file exports:
1. A typed interface describing one item
2. A named `const` array of that type

```ts
// src/data/projects.ts
export interface Project {
  id: string
  name: string
  description: string
  liveUrl: string
  githubUrl: string
  tags: string[]
  featured?: boolean
}

export const projects: Project[] = [ ... ]
```

Section components import the array directly — no prop drilling, no context:

```ts
import { projects } from '../data/projects'
```

## Projects — GitHub pinned repos

In production, `Projects.tsx` fetches `/api/pinned`, which calls the GitHub GraphQL API and returns the repos pinned on the `alhanampi` profile. To change which projects appear: **pin or unpin repos on GitHub** — no code change needed.

The data shape returned by the API matches the `Project` interface:
- `name` — derived from the repo slug (hyphens → spaces, title-cased)
- `description` — the repo description field
- `liveUrl` — the repo's Website field (homepage URL); falls back to the GitHub URL if unset
- `githubUrl` — the GitHub repo URL
- `tags` — repository topics

**Set the Website field on each pinned repo** in GitHub repo settings so the "live demo →" link works correctly.

### Local development

The edge function doesn't run under `npm run dev`. To test the projects section locally, use `vercel dev` instead and add `GITHUB_TOKEN` to a `.env.local` file at the project root.

### GITHUB_TOKEN

The edge function requires a `GITHUB_TOKEN` environment variable — a GitHub personal access token with at minimum `public_repo` read scope. Set it in the Vercel project settings under Environment Variables.

## Adding a new project

Add an object to the `projects` array in [src/data/projects.ts](../src/data/projects.ts). Required fields: `id`, `name`, `description`, `liveUrl`, `githubUrl`, `tags`. This only affects the local dev fallback — in production, pin the repo on GitHub instead.

## Adding a new data category

1. Create `src/data/my-category.ts` with an interface and a typed array export
2. Import it in the relevant section component

Do not fetch content from an API or external source — keep all portfolio data local and version-controlled.

## Hero animation

The `Hero` component uses `@chenglou/pretext` for the canvas text animation. The name segments (`'PAMINA'`, `'GOLDENBERG'`, `'THIERY'`) are hardcoded in [src/components/Hero.tsx](../src/components/Hero.tsx) inside the `useEffect`. To update the displayed name, edit those strings directly — there is no data file for the hero.
