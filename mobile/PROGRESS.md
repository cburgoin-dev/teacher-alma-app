# Progress Mobile v1

Feature implementation lives in `src/features/progress`: typed API reads,
coalescing resources, pure date presentation, focused cards and two screens.
No backend changes or new dependencies.

- Dashboard consumes `GET /me/progress`: real course progress (required nodes,
  including Unit Challenges), nullable course/catalog action, eligible Review
  groups and exactly seven weekly dates. Review rows are informational and the
  single action is **Ver repaso**. No Practice, mastery or achievements.
- Calendar consumes `GET /me/progress/calendar?month=YYYY-MM`. On entry a fresh
  Dashboard read supplies authoritative local today before requesting the month;
  device time never selects the initial month. Grid arithmetic uses UTC only on
  date-only keys. Months load independently and retain their own last snapshot,
  preventing out-of-order responses from replacing the selected month.
- History states remain distinct. Only consecutive LEARNED cells within one
  week row share a coral segment. Today has an outline; future/out-of-month dates
  are muted. Counts come directly from the API. Dates are not tappable.
- Dashboard refreshes on focus/foreground and pull-to-refresh. Calendar refreshes
  on focus, month changes and pull-to-refresh; fresh context handles local date
  changes. Errors have retry actions; cached data is explicitly labeled after
  failed refresh. Authentication errors follow the existing API-client pattern.
- MainAppHeader and useGamification own coins/current streak. Progress does not
  fetch, calculate or store a separate streak aggregate. Existing bootstrap owns
  timezone synchronization. Calendar's current-streak card reads shared data.
  Inventory summary is omitted: an eligible repair is not a repair stock count.

## Navigation

Progress remains the existing bottom tab, now without the placeholder native
header. Ver ruta opens the root Roadmap directly; Ver repaso opens root Review
without a course-specific return target. Calendar is a root-stack screen with
an explicit Back, retaining the original MainTabs/Progress instance. It does not
duplicate bottom navigation. Existing Roadmap positioning/learning flows remain
unchanged.

## Visual references and acceptance

The four references are saved in `docs/mockups/progress/`. Dashboard/calendar
`primary` files take precedence; `secondary` files support compatible details.
Contracts override fictitious mockup counts/copy.

Intentional adaptations: shared header without fake notifications; existing
Courses landscape artwork instead of mockup books; no fabricated avatar;
existing Gamification shield/repair/flame vectors; compact wrapping legend;
root-stack Calendar without bottom tabs; no optional inventory summary.

No DEV preview is added. Typed API fixtures and render/action tests cover rich,
empty and completed states without touching the database. Physical Android
fidelity is **not yet validated**: review narrow devices, large system fonts,
TalkBack, card spacing, month transitions and back/refresh after learning.
Use the existing local backend/Expo setup documented in `HOME.md` and repository
Android acceptance docs; open Progreso, then Ver calendario. Verify Roadmap and
Review return to Progreso and future-month navigation is disabled.

## Validation (from mobile)

```powershell
npm run typecheck
node --test tests/progress.test.cjs tests/home-navigation.test.cjs tests/gamification.test.cjs
node node_modules/expo/bin/cli export --platform android --output-dir dist/progress-v1-check --max-workers 2
git diff --check
```

Focused tests cover API shape/URLs, retained snapshots, month request races,
course states/counts, Review states/actions, all weekly/history states, leap
months, today/future cells, learned-only segments, month controls, shared streak
ownership and real router return history. Existing navigation/Gamification tests
include the added root Calendar registration.

Validated: TypeScript PASS; focused/regression tests 47/47 PASS; Android production
export PASS (1100 modules, 2.5 MB Hermes bundle); git diff --check PASS. Export
required local execution because the sandbox denied Hermes temporary-file writes.
