# BeerMe

BeerMe is a mobile-first progressive web app for tracking friendly, informal IOUs. It is a ledger—not a spreadsheet and not a financial product. The default unit is beer, while the core architecture will remain unit-agnostic for future group currencies.

Production target: [beerme.christopherbrown.ai](https://beerme.christopherbrown.ai)

## Current status

Milestone 2 — Authentication is complete.

- React 19, strict TypeScript, and Vite
- React Router application shell with Groups, Activity, Profile, and not-found routes
- Responsive craft-brewery visual theme with mobile bottom navigation and desktop rail navigation
- Framer Motion with reduced-motion support
- TanStack Query provider ready for data integration
- Installable PWA manifest, icons, offline shell, and update prompt
- GitHub Pages SPA fallback and deployment workflow
- ESLint, Prettier, Vitest, Testing Library, and Playwright
- CI checks for formatting, linting, types, unit tests, builds, and mobile/desktop browser tests
- Supabase email/password signup, login, session persistence, and logout
- Protected application routes with safe post-login continuation
- Profile creation through an authenticated database trigger
- Immutable, unique usernames and editable display names
- Profile ownership enforced with PostgreSQL Row Level Security
- Shared browser/database profile validation and friendly auth errors

Group data and transaction behavior are intentionally reserved for later milestones.

## Requirements

- Node.js 22 or newer
- npm 10 or newer

## Local setup

```bash
npm install
```

Copy the local environment template and fill it with the project URL and publishable key from Supabase:

```bash
cp .env.example .env.local
npm run dev
```

Vite prints the local development URL, usually `http://localhost:5173`.

Do not open the repository’s `index.html` directly. It is a Vite source entry point, so TypeScript and dependencies must be compiled first. To preview the same static files GitHub Pages receives:

```bash
npm run build
npm run preview
```

The completed `dist/` directory is fully static. At runtime, the browser communicates directly with Supabase; no custom application server is required.

## Supabase

Database changes are versioned in `supabase/migrations/`. Apply pending migrations with the Supabase CLI:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Configure these values under **Authentication → URL Configuration** in the Supabase dashboard:

- Site URL: `https://beerme.christopherbrown.ai`
- Redirect URL: `https://beerme.christopherbrown.ai/**`
- Redirect URL: `http://localhost:5173/**`

Only the Supabase publishable key belongs in the browser. Never expose a secret or service-role key in Vite environment variables.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Run browser tests after installing Chromium once:

```bash
npx playwright install chromium
npm run test:e2e
```

Other useful commands:

```bash
npm run format
npm run test:watch
npm run test:coverage
npm run preview
```

## Deployment

Pushes to `main` build and publish `dist/` through GitHub Pages at `beerme.christopherbrown.ai`. The Supabase project URL and publishable key are stored as GitHub Actions repository variables and injected only during the static build.

The committed `public/404.html` preserves deep links when GitHub Pages initially serves its 404 fallback. The service worker provides the offline application shell after the first successful visit.

## Architecture

Application code lives under `src/` and is organized by responsibility:

- `components/` — reusable brand, layout, and UI primitives
- `pages/` — route-level screens
- `hooks/` — authentication context and query-backed profile state
- `services/` — Supabase auth and profile operations
- `lib/` — shared application providers and Supabase infrastructure
- `types/` — generated-style database contracts
- `utils/` — unit-tested, shared profile validation
- `styles/` — global theme and responsive shell styles
- `test/` — shared unit-test setup

The `supabase/` directory holds local CLI configuration and append-only database migrations. Browser code never receives elevated database credentials.

## Next milestone

Milestone 3 — Groups: create and join groups, enforce membership access, and replace the home empty state with the user’s real groups.
