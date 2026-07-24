<div align="center">
  <img src="public/favicon.svg" width="88" height="88" alt="BeerMe logo" />

# BeerMe

### Good friends. Clear tabs.

BeerMe is a fast, friendly way for groups to remember the little things they owe each other—without turning friendship into accounting.

[**Open BeerMe →**](https://beerme.christopherbrown.ai)

[![Release](https://img.shields.io/badge/release-v0.1.0-e6a11f)](https://github.com/christopherrbrown3/beerme/releases/tag/v0.1.0)
[![CI](https://github.com/christopherrbrown3/beerme/actions/workflows/ci.yml/badge.svg)](https://github.com/christopherrbrown3/beerme/actions/workflows/ci.yml)
[![PWA](https://img.shields.io/badge/PWA-installable-214c36)](https://beerme.christopherbrown.ai)

</div>

## Friendship is not a spreadsheet

Chris buys Alex three beers. Alex gets the next one. BeerMe shows that Alex still owes Chris two, while keeping both moments in a clear, shared history.

That is the whole idea: record an IOU in a few taps, understand where everyone stands, and get back to the conversation. BeerMe does not move money and it does not silently rewrite history. It keeps a trustworthy ledger for the informal things friends return in kind.

## BeerMe v0.1

The first public release is a complete mobile-first group ledger:

- **Shared groups** — create a group, invite friends with a link or on-device QR code, and see updates live
- **Friendly IOUs** — record who owes whom in a few taps, with optional notes and optimistic feedback
- **Clear balances** — understand individual, pairwise, and whole-group positions calculated from ledger history
- **Relationship matrix** — scan every directional balance in one compact, interactive view
- **Honest history** — reverse mistakes while preserving the original entry and its correction
- **Anything worth returning** — owners can rename the unit from beers to coffee, tacos, favors, or their own idea
- **Membership controls** — members can leave; owners can permanently delete groups with an explicit confirmation
- **Activity across groups** — follow new groups, joins, transactions, and reversals in one timeline
- **A real phone app feel** — installable PWA, offline shell, native sharing, safe-area support, and accessible motion

Beer is simply the default. Owners can choose a familiar IOU unit in one tap or define a custom one. Transactions store numeric quantities, so changing the unit relabels the ledger without changing its math.

## Designed to stay trustworthy

BeerMe treats the ledger as the source of truth:

- Balances are calculated from transactions, never stored as mutable totals.
- Transactions cannot be edited or individually deleted.
- Corrections are append-only reversals with an actor and timestamp.
- Group access is enforced by PostgreSQL Row Level Security, not just hidden in the interface.
- Owner-only operations are checked again in the database.
- Invite QR codes are generated on the device, so invite tokens are not sent to a third-party QR service.

The repository's [canonical threat model](docs/threat-model.md) documents assets, trust boundaries,
security invariants, attacker stories, accepted risks, and the changes that require a security
review.

The [database authorization audit](docs/database-authorization.md) inventories public objects,
grants, RLS policies, trusted functions, triggers, and the adversarial tests that lock the contract.

## How it runs

```text
GitHub Pages ── static React PWA
                       │
                       └── Supabase
                           ├── Username/password Auth
                           ├── PostgreSQL + Row Level Security
                           └── Realtime Postgres Changes
```

There is no custom application server. Vite builds static assets for GitHub Pages, and the browser communicates directly with Supabase using a publishable key. Elevated database credentials never enter the frontend bundle.

| Area      | Stack                                                                        |
| --------- | ---------------------------------------------------------------------------- |
| Interface | React 19, TypeScript, React Router, Tailwind CSS, Framer Motion, Lucide      |
| Data      | Supabase, PostgreSQL, TanStack Query                                         |
| Security  | Supabase Auth, Row Level Security, constraints, triggers, authenticated RPCs |
| Quality   | Vitest, Testing Library, Playwright, ESLint, Prettier                        |
| Delivery  | Vite, GitHub Actions, GitHub Pages, Workbox PWA service worker               |

## Run it locally

Requirements: Node.js 22+ and npm 10+.

```bash
git clone https://github.com/christopherrbrown3/beerme.git
cd beerme
npm install
cp .env.example .env.local
```

Add your Supabase project’s browser-safe values:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Then start Vite:

```bash
npm run dev
```

Opening the repository’s `index.html` directly will show nothing useful because it is Vite’s source entry point. Use `npm run dev`, or use `npm run build && npm run preview` to preview the same static output deployed to GitHub Pages.

### Supabase setup

Database changes are append-only migrations under `supabase/migrations/`:

```bash
supabase start
supabase db reset
```

This recreates the local database and applies every tracked migration. Use linked projects only for
non-production development. Production migrations run through the manually approved,
snapshot-first workflow documented in
[Production database deployments](docs/production-database-deployments.md); do not run
`supabase db push` against production from a local shell.

BeerMe collects only a username, display name, and password. Supabase Auth requires an email-shaped login identifier internally, so BeerMe deterministically derives a non-deliverable address under the reserved `.invalid` domain. No real email address is requested, stored, or sent.

Disable **Confirm email** in Supabase Authentication and configure these Auth URLs:

- Site URL: `https://beerme.christopherbrown.ai`
- Redirect URL: `https://beerme.christopherbrown.ai/**`
- Redirect URL: `http://localhost:5173/**`

Only the publishable key belongs in a browser environment. Secret and service-role keys bypass Row Level Security and must never be exposed through `VITE_*` variables.

## Quality gates

Every push runs formatting, linting, strict type checks, unit/component tests, a production build, and browser-level Playwright tests before GitHub Pages deploys.

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Install the Playwright browser once with `npx playwright install chromium`.

### Browser integration tests

The fast browser suite runs mobile and desktop Chromium:

```bash
npm run test:e2e
```

Authenticated critical journeys use a fresh, local Supabase stack. They are guarded to reject
hosted project URLs, create unique synthetic users, and delete those users after each run:

```bash
npx supabase start
npm run test:e2e:local -- --project=desktop-chromium
```

Install the complete browser matrix and run it locally with:

```bash
npx playwright install chromium firefox webkit
npm run test:e2e:local
```

Pull requests run the Chromium suite against isolated local Supabase. The protected `main` workflow
runs Chromium, Firefox, and WebKit before deployment. Failure artifacts retain screenshots and
video for seven days. Signed-out tests also retain traces; traces are disabled for authenticated
journeys so browser storage, authorization headers, passwords, and session material are not
uploaded.

## Project map

```text
src/
├── components/   Reusable product and interface components
├── hooks/        Auth, query mutations, cache behavior, and realtime sync
├── pages/        Route-level screens
├── services/     Typed Supabase operations
├── styles/       Visual system and responsive behavior
├── types/        Database and domain contracts
└── utils/        Shared, tested business rules

supabase/
└── migrations/   Schema, policies, triggers, and authenticated functions
```

## What comes next

v0.1 establishes the full core loop. The public
[BeerMe Product Roadmap](https://github.com/users/christopherrbrown3/projects/1) is the source of
truth for upcoming work across group and identity controls, security assurance, push
notifications, platform quality, and native iOS and Android distribution. Each roadmap item is
an implementation-ready GitHub issue with acceptance criteria, dependencies, story points, and
release sequencing.

BeerMe should always feel fast, fun, understandable, and trustworthy. If a feature makes a five-second interaction feel like accounting, it does not belong here.
