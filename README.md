<div align="center">
  <img src="public/favicon.svg" width="88" height="88" alt="BeerMe logo" />

# BeerMe

### Good friends. Clear tabs.

A fast, friendly way for groups to remember the little things they owe each other—without turning friendship into accounting.

[**Try BeerMe →**](https://beerme.christopherbrown.ai)

[![CI](https://github.com/christopherrbrown3/beerme/actions/workflows/ci.yml/badge.svg)](https://github.com/christopherrbrown3/beerme/actions/workflows/ci.yml)
[![Deploy](https://github.com/christopherrbrown3/beerme/actions/workflows/deploy.yml/badge.svg)](https://github.com/christopherrbrown3/beerme/actions/workflows/deploy.yml)

</div>

## What is BeerMe?

BeerMe is a mobile-first progressive web app for informal IOUs between friends. Chris buys Alex three beers; Alex buys Chris one later; BeerMe shows that Alex owes Chris two while preserving both moments in the ledger.

It is intentionally not a payment app or a spreadsheet. The experience is designed for the five-second interaction at the table: tap a friend, record the round, and get back to the conversation.

Beer is the default unit, but balances are designed to stay unit-agnostic so groups can eventually track coffee, cookies, tacos, favors, or anything else worth returning.

## Highlights

- **Built for a phone** — large touch targets, bottom navigation, safe-area support, and installable PWA behavior
- **Ledger-first** — activity is append-only; corrections reverse transactions instead of rewriting history
- **Private by default** — Supabase Auth and PostgreSQL Row Level Security enforce access in the database
- **Human identity** — immutable unique usernames plus editable display names
- **Fast everywhere** — static GitHub Pages hosting, direct Supabase access, offline shell, and split vendor bundles
- **Accessible motion** — visible focus states, semantic controls, screen-reader labels, and reduced-motion support
- **Quality gated** — strict TypeScript, ESLint, Prettier, Vitest, Playwright, and GitHub Actions

## Shipped so far

### Foundation

- Responsive craft-brewery visual system
- Groups, Activity, and Profile application shell
- Installable PWA manifest, app icons, offline shell, and update prompt
- GitHub Pages deployment at the custom production domain

### Authentication

- Email/password signup, login, persistent sessions, and logout
- Protected routes with safe post-login continuation
- Confirmation-email flow
- Database-triggered profiles with immutable usernames
- User-owned profile reads and display-name updates enforced by RLS

### Groups

- Create groups with an automatic owner membership
- Join by pasting an invite link or opening a protected `/join/:token` route
- Responsive home dashboard with member counts, roles, and optimistic creation
- Future-ready group currency fields defaulted to Beer without exposing configuration UI
- Membership, group, and shared-profile access enforced with recursive-safe RLS helpers

### Transaction ledger

- Newest-first group history with friendly timestamps and optional notes
- Optimistic transaction creation with centralized unit-aware display text
- Reversals preserve and visibly mark the original entry instead of deleting it
- Live group updates through Supabase Realtime Postgres Changes
- Database-enforced membership access, valid participants, quantity limits, immutable history, and creator/owner reversal authorization

### Balance engine

- Unit-agnostic pair, directional, individual, and whole-group calculations
- Mutual IOUs netted per relationship before user totals are calculated
- Reversed history excluded without mutating or rewriting ledger entries
- Explicit sign convention: positive net means a member is owed; negative net means they owe
- Decimal-safe scaled arithmetic with zero-sum group invariants

### Group dashboard

- At-a-glance “you are owed” and “you owe” totals calculated from ledger history
- People cards with pairwise relationship balances and bounded unit-symbol displays
- One-tap “they owe me” and “I owe them” flows with preselected transaction direction
- People and History views sharing optimistic updates and live Realtime refresh
- Home cards with each member’s net position and friendly latest-activity timestamps

### Relationship matrix

- Directional row-owes-column view calculated entirely from immutable ledger history
- Sticky member headers and horizontal scrolling for large groups and small screens
- Animated unit-aware cells with even, low, medium, and high balance heat levels
- Accessible cell labels, hover details, and keyboard-reachable transaction actions
- Any non-diagonal cell opens a preselected transaction in that exact direction

### Activity timeline

- Cross-group feed derived from group, membership, and immutable transaction history
- Group creation, member joins, transaction creation, and reversal events
- Newest-first ordering, friendly timestamps, notes, and direct group links
- Transaction and membership Realtime refresh with no duplicate activity table

## How it works

```text
React PWA on GitHub Pages
          │
          ├── Supabase Auth ── email/password sessions
          │
          └── PostgreSQL ───── profiles, groups, memberships, ledger
                    │
                    └── Row Level Security at every boundary
```

There is no custom application server. Vite compiles the React source into static files, GitHub Pages serves them, and the browser communicates directly with Supabase using its publishable key. Elevated database credentials never enter the frontend bundle.

## Technology

| Area     | Stack                                                                   |
| -------- | ----------------------------------------------------------------------- |
| UI       | React 19, TypeScript, React Router, Tailwind CSS, Framer Motion, Lucide |
| Data     | Supabase, PostgreSQL, TanStack Query                                    |
| Security | Supabase Auth, Row Level Security, database constraints and triggers    |
| Testing  | Vitest, Testing Library, Playwright                                     |
| Delivery | Vite, GitHub Actions, GitHub Pages, PWA service worker                  |

## Local development

Requirements: Node.js 22+ and npm 10+.

```bash
git clone https://github.com/christopherrbrown3/beerme.git
cd beerme
npm install
cp .env.example .env.local
npm run dev
```

Add the Supabase project URL and publishable key to `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Vite prints the local URL, usually `http://localhost:5173`.

> Opening the repository’s `index.html` directly will not run the app. It is a Vite source entry point. Use `npm run dev`, or run `npm run build && npm run preview` to preview the same static `dist/` output deployed to GitHub Pages.

## Database development

Database changes are append-only migrations under `supabase/migrations/`.

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Auth URL configuration in Supabase should include:

- Site URL: `https://beerme.christopherbrown.ai`
- Redirect URL: `https://beerme.christopherbrown.ai/**`
- Redirect URL: `http://localhost:5173/**`

Production email confirmation also requires a custom SMTP provider configured under Supabase Authentication settings. Supabase’s built-in mailer is intended only for limited development use and will rate-limit or reject public recipients.

Only the publishable key belongs in a browser environment. Secret and service-role keys bypass RLS and must never be exposed through `VITE_*` variables.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Install the Playwright browser once with `npx playwright install chromium`.

## Project structure

```text
src/
├── components/   Reusable layout, auth, group, transaction, and UI pieces
├── hooks/        Session state, query-backed domain hooks, and realtime sync
├── lib/          Application providers and Supabase infrastructure
├── pages/        Route-level screens
├── services/     Typed Supabase operations
├── styles/       Theme and responsive application styles
├── types/        Database and domain contracts
└── utils/        Shared, unit-tested business rules

supabase/
└── migrations/   Versioned schema, trigger, function, and RLS changes
```

## Roadmap

- [x] Project foundation and installable app shell
- [x] Authentication and user profiles
- [x] Groups, membership, and the home dashboard
- [x] Append-only transaction ledger and reversals
- [x] Unit-agnostic balance engine
- [x] People dashboard and quick transaction flows
- [x] Interactive relationship matrix
- [x] Activity history
- [x] Invite links, sharing, and QR codes
- [ ] Native-feeling polish, performance, and accessibility pass

## Product principles

BeerMe should always feel fast, fun, understandable, and trustworthy. History is never silently changed. Displayed balances are always calculated from the ledger. Security is enforced in PostgreSQL—not inferred from what the interface happens to show.
