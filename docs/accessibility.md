# Accessibility regression policy

BeerMe treats accessibility failures as release blockers in the same way as type, unit, and browser
test failures.

## Automated budgets

- Axe must report zero `serious` or `critical` violations on public authentication routes and the
  representative component tests for groups, dialogs, transactions, the relationship matrix,
  settings, and notifications.
- Browser tests enforce keyboard order, form error associations, and dialog focus trap/restore
  behavior.
- Interactive controls and standalone navigation targets must render at least 44 by 44 CSS pixels.
  Inline links inside sentences follow the WCAG inline-target exception.
- Text uses WCAG AA contrast: 4.5:1 for normal text and 3:1 for large text or meaningful UI
  graphics. Browser axe checks are the source of truth because JSDOM cannot calculate rendered
  colors.
- With `prefers-reduced-motion: reduce`, animation and transition durations must collapse to 0.01ms.

Run the complete gate with:

```sh
npm run accessibility:policy
npm test
npm run test:e2e
```

## Manual assistive-technology checklist

Run this checklist before a release that materially changes navigation, forms, dialogs, the ledger,
or notifications. Record the device, browser, assistive-technology version, date, and tester in the
release notes.

### VoiceOver

- On macOS with Safari, navigate login, signup, group list, group ledger, matrix, settings, and all
  dialogs using only Control-Option commands and the keyboard.
- On iOS with Safari, repeat the core create-account, open-group, add-transaction, and settings
  flows with swipe navigation and the rotor.
- Confirm headings and landmarks make sense, labels and hints are announced once, errors identify
  their fields, status messages announce without moving focus, and dialogs trap then restore focus.

### TalkBack

- On Android with Chrome, repeat the core flows with swipe navigation and explore-by-touch.
- Confirm every actionable control has a useful name, disabled states are announced, matrix cells
  describe both people and the balance, and notifications do not interrupt unrelated speech.

For both screen readers, also verify 200% text zoom, landscape orientation, dark/high-contrast
settings where available, reduced motion, offline messaging, empty states, and a failed form submit.

## Exceptions

Exceptions live in `.github/accessibility-exceptions.json`. Each entry must name the axe `rule`, a
narrow CSS `target`, an accountable `owner`, the `rationale`, and an ISO `expires` date. CI rejects
missing fields, duplicate IDs, invalid dates, and expired entries. An exception documents an agreed
temporary risk; it does not automatically suppress a test. Any scoped suppression must reference
the exception ID in code and be removed by its expiry date.

Prefer fixing a regression. If an emergency exception is unavoidable, keep it to one rule and one
target, link the follow-up issue in the rationale, and set the shortest practical expiry. Never
disable axe globally or lower the serious/critical release threshold.
