# BeerMe

BeerMe is a mobile-first progressive web app for tracking friendly, informal IOUs. It is a ledger—not a spreadsheet and not a financial product. The default unit is beer, while the core architecture will remain unit-agnostic for future group currencies.

Production target: [beerme.christopherbrown.ai](https://beerme.christopherbrown.ai)

## Current status

Milestone 1 — Project Foundation is complete.

- React 19, strict TypeScript, and Vite
- React Router application shell with Groups, Activity, Profile, and not-found routes
- Responsive craft-brewery visual theme with mobile bottom navigation and desktop rail navigation
- Framer Motion with reduced-motion support
- TanStack Query provider ready for data integration
- Installable PWA manifest, icons, offline shell, and update prompt
- GitHub Pages SPA fallback and deployment workflow
- ESLint, Prettier, Vitest, Testing Library, and Playwright
- CI checks for formatting, linting, types, unit tests, builds, and mobile/desktop browser tests

Authentication, real group data, and transaction behavior are intentionally not included yet. They belong to later milestones in [`spec.md`](./spec.md).

## Requirements

- Node.js 22 or newer
- npm 10 or newer

## Local setup

```bash
npm install
npm run dev
```

Vite prints the local development URL, usually `http://localhost:5173`.

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

Pushes to `main` build and publish `dist/` through GitHub Pages. In the repository settings, set Pages source to **GitHub Actions** and configure the custom domain as `beerme.christopherbrown.ai`. DNS and repository-level Pages settings remain external setup steps.

The deployment workflow is skipped while the repository is private because the current GitHub account plan does not support Pages for private repositories. It activates automatically after the repository becomes public.

The committed `public/404.html` preserves deep links when GitHub Pages initially serves its 404 fallback. The service worker provides the offline application shell after the first successful visit.

## Architecture

Application code lives under `src/` and is organized by responsibility:

- `components/` — reusable brand, layout, and UI primitives
- `pages/` — route-level screens
- `lib/` — shared application providers and infrastructure
- `styles/` — global theme and responsive shell styles
- `test/` — shared unit-test setup

Future milestones will add the specified `hooks/`, `services/`, `utils/`, and `types/` layers when they have real responsibilities. This avoids placeholder modules while preserving the target architecture.

## Next milestone

Milestone 2 — Authentication: connect Supabase, implement email/password signup and login, protect private routes, add logout, and create immutable-username user profiles with Row Level Security.
