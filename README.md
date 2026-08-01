<div align="center">
  <img src="public/favicon.svg" width="88" height="88" alt="BeerMe logo" />

# BeerMe

### Good friends. Clear tabs.

BeerMe is the friendly shared tab for the beers, coffees, tacos, and favors friends return to
one another.

[**Open BeerMe →**](https://beerme.christopherbrown.ai)

[![Live product](https://img.shields.io/badge/status-live-214c36)](https://beerme.christopherbrown.ai)
[![Release](https://img.shields.io/badge/release-v0.1.0-e6a11f)](https://github.com/christopherrbrown3/beerme/releases/tag/v0.1.0)
[![CI](https://github.com/christopherrbrown3/beerme/actions/workflows/ci.yml/badge.svg)](https://github.com/christopherrbrown3/beerme/actions/workflows/ci.yml)
[![PWA](https://img.shields.io/badge/PWA-installable-214c36)](https://beerme.christopherbrown.ai)

</div>

<p align="center">
  <img src="public/beerme-invite-preview.png" alt="BeerMe invite preview" width="900" />
</p>

## A shared tab that keeps up with the night

Chris buys Alex three beers. Alex gets the next one. BeerMe shows that Alex still owes Chris two,
while keeping both moments in a clear, shared history.

Open BeerMe, start a group, and invite your friends. There are no payment details, bank
connections, or real email addresses to manage—just a quick, trustworthy way to remember whose
turn it is.

## Use BeerMe in three quick steps

1. **Start a group.** Give your crew a name and choose the unit that fits: beers, coffees, tacos,
   favors, or anything else you take turns returning.
2. **Log the moment.** Record who covered what in a few taps, with an optional note.
3. **Settle up.** When someone returns the favor, settle the live balance and enjoy the little
   celebration when everyone is square.

## Everything your group needs

- **Shared groups** — invite friends with a link or on-device QR code. By default, every member can
  invite; owners can turn member invitations off.
- **Friendly IOUs** — record who owes whom without turning friendship into accounting.
- **Clear balances** — see individual, pairwise, and whole-group positions calculated from the
  ledger history.
- **Relationship matrix** — scan every directional balance in one compact, interactive view.
- **Honest history** — reverse mistakes while preserving the original entry and its correction.
- **Membership controls** — members can leave; owners can transfer ownership, remove members, rotate
  invites, or permanently delete a group with explicit confirmation.
- **Activity across groups** — follow joins, transactions, reversals, and new groups in one
  timeline.
- **A real phone app feel** — installable PWA, offline shell, native sharing, safe-area support,
  and accessible motion.

Beer is simply the default. Owners can rename the unit at any time; transactions store numeric
quantities, so changing the label never changes the math.

## Designed to stay trustworthy

BeerMe treats the ledger as the source of truth:

- Balances are calculated from transactions, never stored as mutable totals.
- Settlements are append-only ledger entries validated against the live debt, never silent balance
  edits.
- Transactions cannot be edited or individually deleted.
- Corrections are append-only reversals with an actor and timestamp.
- Group access is enforced by PostgreSQL Row Level Security, not just hidden in the interface.
- Owner-only operations are checked again in the database.
- Invite QR codes are generated on the device, so invite tokens are not sent to a third-party QR
  service.

The repository's [canonical threat model](docs/threat-model.md) documents assets, trust boundaries,
security invariants, attacker stories, accepted risks, and the changes that require a security
review.

The [database authorization audit](docs/database-authorization.md) inventories public objects,
grants, RLS policies, trusted functions, triggers, and the adversarial tests that lock the contract.

## For contributors

BeerMe is a static React PWA deployed to GitHub Pages. The browser communicates directly with
Supabase using a publishable key; elevated database credentials never enter the frontend bundle.

```text
GitHub Pages ── static React PWA
                       │
                       └── Supabase
                           ├── Username/password Auth
                           ├── PostgreSQL + Row Level Security
                           └── Realtime Postgres Changes
```

| Area      | Stack                                                                        |
| --------- | ---------------------------------------------------------------------------- |
| Interface | React 19, TypeScript, React Router, Tailwind CSS, Framer Motion, Lucide      |
| Data      | Supabase, PostgreSQL, TanStack Query                                         |
| Security  | Supabase Auth, Row Level Security, constraints, triggers, authenticated RPCs |
| Quality   | Vitest, Testing Library, Playwright, ESLint, Prettier                        |
| Delivery  | Vite, GitHub Actions, GitHub Pages, Workbox PWA service worker               |

### Run it locally

Requirements: Node.js 22+ and npm 10+.

```bash
git clone https://github.com/christopherrbrown3/beerme.git
cd beerme
npm install
cp .env.example .env.local
```

Add your Supabase project's browser-safe values:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Then start Vite:

```bash
npm run dev
```

Use npm run dev for local development, or use npm run build && npm run preview to preview the same
static output deployed to GitHub Pages.

### Supabase setup

Database changes are append-only migrations under supabase/migrations/:

```bash
supabase start
supabase db reset
```

This recreates the local database and applies every tracked migration. Use linked projects only for
non-production development. Production migrations run through the manually approved,
snapshot-first workflow documented in
[Production database deployments](docs/production-database-deployments.md); do not run
supabase db push against production from a local shell.

BeerMe collects only a username, display name, and password. Supabase Auth requires an email-shaped
login identifier internally, so BeerMe deterministically derives a non-deliverable address under
the reserved .invalid domain. No real email address is requested, stored, or sent.

Disable **Confirm email** in Supabase Authentication and configure these Auth URLs:

- Site URL: https://beerme.christopherbrown.ai
- Redirect URL: https://beerme.christopherbrown.ai/**
- Redirect URL: http://localhost:5173/**

Only the publishable key belongs in a browser environment. Secret and service-role keys bypass Row
Level Security and must never be exposed through VITE_* variables.

### Quality gates

Every push runs formatting, linting, strict type checks, unit/component tests, a production build,
browser-level Playwright tests, database tests, and security checks before GitHub Pages deploys.

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Install the Playwright browser once with npx playwright install chromium.

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

Pull requests run the Chromium suite against isolated local Supabase. The protected main workflow
runs Chromium, Firefox, and WebKit before deployment. Failure artifacts retain screenshots and
video for seven days. Signed-out tests also retain traces; traces are disabled for authenticated
journeys so browser storage, authorization headers, passwords, and session material are not
uploaded.

### Project map

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

## What's next

BeerMe is usable today for the full shared-ledger loop. The public
[BeerMe Product Roadmap](https://github.com/users/christopherrbrown3/projects/1) tracks the next
layer of trust and convenience—account recovery, ledger export, operational hardening, push
notifications, and native iOS and Android distribution.

The product should always feel fast, fun, understandable, and trustworthy. If a feature makes a
five-second interaction feel like accounting, it does not belong here.
