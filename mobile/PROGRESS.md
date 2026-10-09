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

A DEV-only selector now covers rich, empty and completed states without changing
the database (see v2 below). The first implementation was physically tested on
Android; the v3 visual changes still need physical acceptance: review narrow devices, large system fonts,
TalkBack, card spacing, month transitions and back/refresh after learning.
Use the existing local backend/Expo setup documented in `HOME.md` and repository
Android acceptance docs; open Progreso, then Ver calendario. Verify Roadmap and
Review return to Progreso and future-month navigation is disabled.

## Validation (from mobile)

```powershell
npm run typecheck
node --test tests/progress.test.cjs tests/home-navigation.test.cjs tests/home.test.cjs
node node_modules/expo/bin/cli export --platform android --output-dir dist/progress-v3-check --max-workers 2
git diff --check
```

Focused tests cover API shape/URLs, retained snapshots, month request races,
course states/counts, Review states/actions, all weekly/history states, leap
months, today/future cells, learned-only segments, month controls, shared streak
ownership and real router return history. Existing navigation/Gamification tests
include the added root Calendar registration.

Previous v1 validation: TypeScript PASS; focused/regression tests 47/47 PASS; Android production
export PASS (1100 modules, 2.5 MB Hermes bundle); git diff --check PASS. Export
required local execution because the sandbox denied Hermes temporary-file writes.


## Visual iteration v2

- Course hero is a two-zone composition: title, percentage, required-node counts,
  progress bar and short copy on the left; a larger shaped landscape and 48dp
  Ver ruta action on the right. Home's existing A1 focal crop preserves Big Ben
  and the bus. The level badge is discreet and redundant `Nivel A1` is omitted.
  Narrow/large-font layouts reflow instead of shrinking the text.
- Review pending keeps coral, real groups and Ver repaso; clear uses a pale green
  surface and positive check icon. Weekly consistency uses a quieter surface,
  calendar corner detail, seven simple day marks and a compact trailing action.
- Calendar uses one contextual Back/title header. The top summary separates shared
  current streak from the selected month's API learning-day count. No bottom
  duplicate, full logo header or permanent explanatory paragraph.
- Grid uses explicit seven-cell flex rows, fixing Android's observed six-column
  wrap from percentage widths. Base rows are 50dp (60dp for larger fonts), versus
  the previous tall icon/number stacks. Numbers overlay real flame/shield/repair
  icons; neutral dates show only the number. Today outlines the cell. Coral bands
  connect LEARNED only, ending at week boundaries. Legend is a tiny wrapping flow.
- API, resources/cache, contracts and navigation are unchanged. No backend,
  persistence, global header, Shop or other-screen redesign.

### DEV preview

Only Metro's `__DEV__` branch loads `devPreview.ts` and `ProgressPreviewControl`.
The selector starts at REAL, expands to presets, and stores selection in screen
memory. `Ocultar` removes controls for screenshots. Long-press Tu progreso to
restore Dashboard controls; leave/reopen Calendar to restore its controls.

Dashboard: ACTIVE_COURSE, COMPLETED_COURSE, NO_COURSE, REVIEW_PENDING,
REVIEW_CLEAR, MIXED_WEEK. Calendar: EMPTY_MONTH, WEEK_STREAK, MIXED_MONTH,
PROTECTED, REPAIRED, BROKEN, MULTI_WEEK_STREAK. Start with MIXED_MONTH for bands,
long learned sequences, each continuity state, today and future dates.
Calendar previews use an authored October 2026 today per preset and in-memory month navigation.
No fixture is sent to APIs or saved into live resources. Course/Review/Shop
navigation is blocked while Dashboard fixtures are displayed; Calendar navigation
is safe and permitted. Shared Gamification is never mutated. REAL uses its streak exclusively; Calendar presets supply a separate presentation-only streak value.

### Remaining acceptance and transversal loading debt

V2 validation: TypeScript PASS; Progress/Home/navigation tests 41/41 PASS;
Android production export PASS (1105 modules, 2.5 MB Hermes bundle);
git diff --check PASS. Export required local execution after the sandbox denied
Hermes temporary-file writes. Eight preview-specific identifiers/labels were
checked in the production Hermes bundle (UTF-8 and UTF-16LE); none were present.

Validate v3 on physical narrow Android and with large fonts/TalkBack, especially
artwork framing, number-over-icon clarity, seven-column alignment and continuity
bands. The latest supplied screenshots demonstrate the v2 seven-column fix and identify the polish addressed in v3; they are not v3 acceptance.
No final visual-fidelity claim is made from component tests or export alone.

Cold loads can still show the shared header with unavailable coin/streak values
and a spinner/text for content. Future transversal work should provide skeleton
layouts, preserve the shared header's last snapshot on refresh and avoid visually
inconsistent partial loading. No global loading refactor is included here.


## Visual iteration v3

- Retains the existing landscape asset (no alternative course illustration in the
  asset inventory); a lower layered print treatment gives Progress its own frame.
  The artwork column is narrower, with tighter title/percentage/count rhythm and
  an adjacent compact action. Narrow/large-font reflow remains.
- Review clear uses a raised check seal in a mint badge; pending Review keeps real
  groups/counts and the coral action. Weekly marks sit in a light inset strip,
  with a framed corner calendar and a separated trailing action.
- Calendar summary uses a larger flame/halo, dominant shared streak value and a
  contextual encouragement. Month learning count remains independent. The summary
  wraps when space is insufficient; it does not constrain large text to one line.
- Seven-cell rows are preserved. Scalloped SVG bands connect LEARNED only and
  stop at week boundaries; opaque number backplates improve icon contrast.
  Legend is now two explicit rows of two items, 27dp icons and 13sp labels.
- Calendar DEV presets use explicit presentation facts: EMPTY_MONTH/BROKEN 0,
  WEEK_STREAK 7, PROTECTED/REPAIRED 4, MIXED_MONTH 10, MULTI_WEEK_STREAK 21.
  Today is October 12 for WEEK_STREAK, October 9 for the isolated continuity
  presets, and October 22 otherwise, so the shown streak is temporally coherent.
  REAL continues through the shared-resource adapter; no fixture enters it.
- Physical v3 acceptance remains pending: balance/crop, seal, weekly density,
  summary wrapping, scalloped joins, number contrast and legend at large fonts.
  Existing landscape/shared icon adaptations and transversal loading debt remain.

V3 validation: TypeScript PASS; focused Progress tests 16/16 PASS (including real
router return behavior and isolated DEV summary facts); Android production export
PASS (1104 modules, 2.5 MB Hermes); git diff --check PASS. Nine DEV-only markers,
including calendarPreviewPresentation, absent in UTF-8/UTF-16LE bundle scans.
Home/shared navigation source was not changed; no broader Home suite was needed.
