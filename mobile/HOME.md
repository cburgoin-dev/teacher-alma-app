# Home Mobile v1

## Official visual references

The four original PNGs are archived byte-for-byte under `docs/mockups/home/`:

- `home-active-primary.png`: primary ACTIVE target (attachment #2, 11_37_57).
- `home-active-secondary-01.png`: secondary ACTIVE composition reference (#3, 11_37_49).
- `home-active-secondary-02.png`: secondary ACTIVE hierarchy reference (#4, 11_37_48).
- `home-new-primary.png`: primary NEW target (#1, 11_50_37).

Primary references win over secondary ones. Home semantics/API and real data win
when references imply unavailable features. Generated characters/avatars, example
counts and notifications are not extracted into application assets. All four copies
were verified against their source SHA256 hashes.

## Integration

`src/features/home/` owns only GET `/me/home`: types, a discriminated-envelope
parser, coalesced session resource, focus hook and components. The backend owns
state selection, current node, course ordering, access and progression. Percentage
labels use the returned value; only visual bar fill is clamped to its track.

The existing Inicio tab hosts Home with its own safe-area/header. Course Detail,
Roadmap, Lesson, Unit Challenge and Review are registered once in the existing root
stack; the former nested CoursesNavigator is removed. Both Home and the Courses
catalog push onto this history, so native/header Back retains the originating tab.
The four bottom tabs retain their styling; detail/learning screens sit above them,
like Shop, and provide contextual Back. Safe-area bottom padding is retained there.

Home Continue opens Roadmap, never Lesson/Unit Challenge. Home passes `focusNode`
(id/type) as an entry hint; Roadmap validates it against its own fresh currentNode
and uses the existing measured auto-scroll. A stale hint cannot override academic
progression. Lessons/Challenges enter from Roadmap with existing completion tickets.
Starting a course keeps Course Detail in history. Review without course context
returns through goBack instead of forcing the catalog.

Home course cards reuse Courses' catalogDestination: IN_PROGRESS and COMPLETED
open Roadmap; unstarted and COMING_SOON open Course Detail. Ver todos selects the Courses catalog.
No course is auto-started. Locked nodes remain visible and offer the real Roadmap
with Ver ruta rather than a nonexistent payment flow. Missing context has no CTA.

`useGamification` and `gamificationResource` remain the only shared source for
coins/streak/Daily Goal. MainAppHeader uses one responsive logo/metrics policy for Home and Courses. Shared metrics
now retain last-known values during refresh/transient errors instead of flashing
placeholders. Shop spending validation is unchanged. No new cache or endpoint is
introduced for Gamification.

Home refreshes on focus (including return after learning), foreground transition
while focused, or explicit pull-to-refresh. Concurrent Home reads coalesce and
last-known data stays visible. Foreground/pull refresh also uses the shared
Gamification resource; its existing focus hook covers tab returns. There is no
polling or requirement to remount the app. Errors with cached data show a stale-data
notice and retry; first load shows a spinner or error, without inventing NEW state.

## Rendering and deliberate visual differences

White base, navy type, blue rounded hero, coral action, two secondary cards and up
to two cover-led featured cards follow the primary references. Existing course
artwork and simple book/trophy symbols replace generated Alma characters. Greeting
uses the real name or a neutral Hola; the avatar is a non-interactive outline.
Notifications are omitted. Header uses the official horizontal mark without changing
the shared Home/Courses composition.

- NEW: disabled, explicitly coming-soon Diagnostic CTA; real beginner course or
  catalog alternative plus shared Daily Goal.
- ASSESSED: real recommendation/level, nullable course and informational result card.
- ACTIVE: backend node and percentage, Roadmap CTA with a validated focus hint;
  locked or missing content never creates a dead destination.
- COURSE_COMPLETED: real completion context and next-course recommendation, including
  COMING_SOON. Null legacy context renders neutral copy without fabricated progress.
- ACTIVE/COMPLETED secondary left: real pending Review, otherwise non-interactive
  Practice coming-soon. Daily Goal is informational and counts sessions, not invented
  lesson/exercise mixes. It follows the returned completion flag.

HomeCourse provides the nullable editorial description. Featured cards prefer it,
with existing access/coming-soon copy when absent; status never repeats percentage.
At large font scales,
both two-card groups stack and hero artwork is omitted to protect readable copy.
There are no fixed text heights. The greeting wraps to at most two lines with ellipsis for long names. Scroll and safe areas
remain enabled, and interactive controls have at least 48dp touch surfaces.

## Validation and remaining acceptance

From mobile:

```powershell
node node_modules/typescript/bin/tsc --noEmit
node --test tests/home.test.cjs tests/gamification.test.cjs tests/courses.test.cjs
node node_modules/expo/bin/cli export --platform android --output-dir dist/home-v1-check
```

Component tests execute TSX with native primitives stubbed. They cover all four
states, nulls, access locks, navigation handlers, actual goal/count data, ordering,
resource coalescing/stale data and focus/foreground cleanup. They do not establish
native layout, hardware Back, TalkBack or physical visual acceptance. Those checks
remain for Android, especially narrow widths and large fonts.

Session/account switching must clear/recreate Home and shared resources when a
real authentication lifecycle is added. The parser checks envelope/discriminants;
deep payload validation follows the existing typed API boundary. Diagnosis,
Practice, Notifications, avatar management, payment and Daily Goal settings remain
outside this iteration. V3 only adds description to the Home projection; no new dependencies.

V1 historical validation result: Mobile TypeScript PASS; full Mobile suite
154/154 PASS; Android production export PASS (1083 modules, 2.4 MB Hermes bundle)
at `dist/home-v1-check`; `git diff --check` PASS. The attempted ADB device listing
failed under the Windows sandbox before device discovery; no physical acceptance
or screenshot evidence is claimed.

## Historical V2 visual + navigation revision (2026-10-03)

Primary: `home-active-primary.png`. The real Android screenshots supplied for this
revision are evidence of the prior implementation, not alternative design targets.

- ACTIVE now has a dedicated composition: prominent Continuar aprendiendo heading,
  course pill, Topic, node, progress and coral CTA in the left column; existing
  landscape artwork is clipped into a curved right-hand region. An SVG blue
  gradient, subtle cloud, lower blue sweep and actual level badge provide depth
  without generating assets. Bundled course artwork remains until a remote image
  is usable. Large fonts/narrow widths use the full text column without artwork.
- Logo grows only in Home; header/greeting spacing is tighter. The greeting stays
  API-driven, with controlled wrapping and the same non-interactive avatar.
- Secondary cards use icon halos and text side-by-side, finer borders, smaller
  spacing, real Review affordance and real shared goal count/percentage. Practice
  and Daily Goal have no misleading navigation chevrons.
- Featured cards have shorter image/body proportions, real completion/access
  supporting copy and icon/status treatments. No description is invented because
  the Home projection does not provide one.

The configured development user's displayName was changed to Sofía, and only that
field. Reapply after demo recreation with `node mobile/scripts/set-home-demo-name.cjs Sofía`
from repository root. The script refuses non-local/non-development databases and
only targets DEV_AUTH_USER_ID; it does not reset progress, coins, streak or fixtures.
Backend code, schema, API and Gamification rules remain unchanged.

Remaining differences: official horizontal branding instead of the mockup's alternate
mark, an outline avatar, existing catalog landscapes rather than identical art,
and no notifications or invented academic copy. No device was connected to ADB
for this revision. Native layout/TalkBack/hardware Back and a new screenshot
comparison remain physical acceptance items; no 75–85% fidelity claim is made.

Revision validation: TypeScript PASS; full Mobile tests 156/156 PASS, including real
StackRouter histories for Home vs catalog, Lesson/Challenge return, and stale
Roadmap anchors. Android export PASS (1086 modules, 2.4 MB Hermes) at
`dist/home-v2-check`; final `git diff --check` PASS.

## V3 fidelity + navigation revision (2026-10-06)

- Fixed the invalid string gradient offset with numeric stops. A regression test
  runs the installed react-native-svg gradient extractor: the old value produces
  the reported warning, and the rendered numeric stops produce none. No warning
  suppression is used in application code.
- Home-only logo treatment clips measured transparent margins (alpha bounds
  17,21..575,106 in the official 592x124 derivative). Both axes scale equally;
  other screens retain their original mark/layout. Metrics remain live and the
  header/greeting still scroll. The neutral avatar only gains a subtle border.
- ACTIVE is one Pressable containing both the entire hero and decorative CTA;
  both lead to the same Roadmap/focusNode. Missing destinations remove all arrow
  affordances. The badge reads the real level plus Inglés, the v1 product language.
  The artwork boundary is smoother, with more space around progress and CTA.
- HomeCourseArtwork and courseArtworkFrame share a visual crop between ACTIVE
  and Featured. The bundled A1 focal x=.64 targets Big Ben and the red bus; cover
  geometry preserves aspect ratio and clamps edges. Other/remote covers center,
  using remote dimensions when loaded; bundled art remains on failure. Featured
  uses a 3:2 frame to retain the complete local landscape, with smaller badges.
- Practice's Muy pronto and Daily Goal's Ver detalles footers are intentionally
  non-interactive views, as approved. Review remains a real action only when its
  pending count is positive. Halos, depth and footer surfaces follow the primary.
- HomeCourse.description is projected from Course for beginner/recommended/featured
  cards. No second fetch, schema, repository or progression changes. Featured uses
  the description, a simple status and a stronger progress icon.

Validation: Mobile/backend TypeScript PASS; full Mobile tests 159/159 PASS;
Home backend tests 19/19 PASS including PostgreSQL/HTTP and read-only snapshots.
Android export PASS at `dist/home-v3-check` (1088 modules, 2.4 MB Hermes);
`git diff --check` PASS. Export also reports the environment's NO_COLOR/FORCE_COLOR
conflict; it does not affect bundling.
The PG driver emitted its existing concurrent-query deprecation warning; query
optimization remains deferred. No ADB device was connected, so native screenshots,
TalkBack/font scaling, physical Back and on-device warning disappearance require
another device pass. The JS warning regression is verified, not physical acceptance.

Remaining visual differences from primary: official horizontal branding, neutral
avatar, existing landscapes and real course/goal copy; no notification or flag.
The crop/layout changes need new Android screenshots before judging fidelity.

## V4 ACTIVE final polish (2026-10-06)

V3 was physically tested on Android and accepted by the user as the baseline.
V4 retains its artwork, focal helper, general clip, featured cards, API and navigation.

- MainAppHeader no longer accepts a home flag. Both screens use the official
  trimmed logo at 172dp (150dp below 360dp or with fontScale >1.3). Metrics compact
  below 390dp or with larger fonts, independently of screen. Wrapping remains
  available for longer metrics; no notification placeholder space is reserved.
- Hero heading uses ChevronRight; CTA keeps ArrowRight. Numeric gradient stops
  remain valid, with slightly stronger lower blue depth. Pill/padding and badge
  are subtly smaller. Decorative italic Let's do this! is hidden from accessibility
  and omitted with the artwork at narrow widths/large fonts. No new font or asset.
- Secondary uses a stronger notebook/pencil and target with a red arrow accent.
  Footer arrows are ArrowRight components. Only real actions get a title chevron;
  Practice and Goal remain non-interactive. Shared goal and Review behavior remain.
- Main scroll gaps reduce 14 to 10dp, Hero padding/heading/pill save 8dp, and
  secondary padding/gaps save about 6dp. Combined saving is approximately 30dp
  at normal sizing, dependent on text wrapping. No fixed text heights were added.

Validation: TypeScript PASS; full Mobile tests 162/162 PASS, including shared header
policy, icon convention, decorative accessibility/responsive behavior and retained
navigation/placeholder behavior. Backend and API unchanged; no backend tests needed.
Physical V4 layout/fidelity remains to be confirmed with new Android captures;
no 90% fidelity claim is made. Official horizontal brand, neutral avatar, existing
landscapes and real goal copy remain deliberate differences from the primary.
Future focal mapping by artwork identity instead of level and cross-app brand
harmonization remain deferred.

V4 Android export PASS: dist/home-v4-check (1089 modules, 2.4 MB Hermes).
git diff --check PASS. Export reports the environment NO_COLOR/FORCE_COLOR warning.

## V5 state presentation and final localized polish (2026-10-06)

V4 was physically tested on Android and accepted as the baseline. Featured,
focal positioning, academic navigation, backend and API remain unchanged.

- Home and Courses now use mainHeaderTopSpacing (8dp) inside identical top/left/right
  SafeAreaView edges. This replaces container-specific 4dp/12dp offsets without
  changing logo size or making the header sticky.
- ACTIVE badge typography/padding is smaller. Let's / do this! uses 14sp bold italic
  text, two lines, a slight tilt and a 13dp bottom inset, on a raised lower blue
  sweep. The artwork/focal geometry remains unchanged. Decorative copy stays
  excluded from accessibility and hidden in narrow/large-font layouts.
- Daily Goal's red arrow points down-left into the target. Secondary title chevrons
  are now approved temporary visual affordances, including Practice and Goal.
  They DO NOT create handlers or Pressables. Review remains actionable only for
  a real pending count. Before production, revisit affordances without actions
  when Practice and Daily Goal detail exist.
- NEW has a full-width title, blue gradient, a simple rotated level-sign graphic
  inspired by the reference, brief description and an explicitly unavailable
  disabled diagnostic CTA. No mascot, fake route or invented beginner course.
- ASSESSED shares the gradient/type hierarchy and displays the actual recommendation
  with status/access context. Missing recommendation/level remain safe, with no CTA.
- COURSE_COMPLETED uses a trophy/celebratory accent with the real course and progress,
  then a separate next-course section when available. COMING_SOON is preserved;
  no auto-start. Missing completed context never fabricates title or percentage.

No DEV state mutation helper was added. Existing component render fixtures in
mobile/tests/home.test.cjs cover NEW (beginner present/null), ASSESSED (paid/null),
ACTIVE and COURSE_COMPLETED (next/coming-soon/null/degraded), alongside shared goal
and navigation tests. These stubbed renders validate behavior, not physical layout.
Run: node --test mobile/tests/home.test.cjs from repository root. No productive
Diagnostic data or demo user progress is changed to exercise these states.

Validation: Mobile TypeScript PASS; full Mobile suite 164/164 PASS. Physical V5
screenshots still required for ACTIVE plus NEW, ASSESSED and COURSE_COMPLETED,
including narrow/large-font acceptance and shared header alignment when switching
tabs. Home is not declared fully closed. Deferred debt: artwork-identity focal map,
real Diagnosis/Practice/Goal detail, avatar and global brand harmonization.

V5 Android export PASS: dist/home-v5-check (1089 modules, 2.4 MB Hermes).
git diff --check PASS. Only the environment NO_COLOR/FORCE_COLOR warning appeared during export.

## Home v1 DEV preview + localized art direction (2026-10-06)

V5 ACTIVE and the shared Home/Courses header were physically exercised by the user.
This revision does not declare Home closed: NEW/ASSESSED/COMPLETED still need
physical acceptance, as do the final ACTIVE decorations below.

### DEV Home State Preview

Run the existing Expo development build/server (not a production export). Home
shows DEV · Home: REAL under the shared header. Tap it for REAL, NEW, ASSESSED,
ACTIVE and COMPLETED. Selecting collapses the options. Tap Ocultar to remove the
entire control from layout for clean screenshots. Long-press the greeting to
restore it, scroll back to the top if necessary, and choose REAL when finished.
Selection and visibility exist only in mounted-screen memory; reloading resets
REAL. Switching tabs may retain the mounted screen's selection.

The __DEV__-guarded require loads HomePreviewControl and devPreview snapshots only
in development. Production uses home.data directly. REAL returns the identical
resource object. Other modes render typed HomeResponse fixtures with synthetic IDs,
not a second progression engine. No resource write, storage, PostgreSQL change,
POST or PATCH occurs on selection. Existing Home focus reads and pull-to-refresh
remain active; Gamification is still real/shared (preview does not invent coins,
streak or Daily Goal). Cached-data errors do not cover a selected fixture.

While a fixture is selected, Home learning/course/Review navigation shows a DEV
notice instead of sending synthetic IDs into real screens. Choose REAL to test
navigation. The shared real Shop and global tabs retain their normal behavior.
Fixtures: NEW beginner A1 and A1/A2 featured; ASSESSED recommends available A2;
ACTIVE A1/Familia y amigos/Verb to be/33%/LESSON; COMPLETED A1/100% and available A2.
All use Sofía and zero Review. Existing render tests separately cover unavailable
recommendations, COMING_SOON and nullable/degraded records.

### Final ACTIVE changes

Secondary chevrons now sit in an absolute card layer, independent of title length;
title padding reserves their space. Practice/Goal/diagnostic placeholders stay
non-interactive; Review and beginner-course navigation retain their handlers.
These temporary decorative affordances require review before production once
Practice/Goal details are implemented.

The lower-right blue swoosh rises over a small part of the photograph, keeping
London and the bus recognizable and containing the two-line italic slogan farther
from the edges. Two low-opacity blue ellipses add left-side depth. CTA, progress,
focal geometry, badge, course pill and navigation are unchanged. The decoration is
not functional information and remains excluded from accessibility/large-font mode.
Featured and the shared header are unchanged. NEW retains the gradient, level sign
and unavailable diagnostic CTA; ASSESSED retains real recommendation/access;
COMPLETED retains trophy/progress and the separate next-course section.

### Roadmap / bottom navigation: analysis only, future iteration

Current RootNavigator registers MainTabs and Roadmap as sibling native-stack routes.
MainTabs is defined in RootNavigator.tsx, not a separate file. Its four tabs host
Home, Courses, Progress and Profile. Pushing Roadmap covers MainTabs and its bar;
this is structural, not a missing bar style. Root Back correctly reveals the
originating tab. Roadmap then pushes Lesson/UnitChallenge, consuming existing
completion tickets on focus; canonical currentNode validates Home's focus hint.
No navigator, Roadmap layout, Back, ticket, motion or animation changed here.

Candidate for a separate implementation: keep an outer immersive root stack for
Lesson/UnitChallenge/Result/Review/Shop, with MainTabs below. Within Home and Courses,
use small tab-local stacks (HomeRoot -> Roadmap; CoursesRoot -> CourseDetail/Roadmap)
that reuse the SAME Roadmap component. This keeps a real tab bar around Roadmap
without drawing a duplicate bar or creating a fifth tab. Back pops to the actual
entry screen in that tab. Tabs can switch directly to Home/Courses/Progress/Profile.

Before implementing, decide tab-reselect behavior: Home/Courses should expose their
root when explicitly selected, while returning from immersive learning must restore
the exact originating Roadmap instance. Do not blindly reset all stacks on tab focus.
Two instances may legitimately exist for different courses; never route completion
to whichever Roadmap happens to be found first by name. Carry/target explicit origin
navigator/route identity for immersive returns and preserve existing courseId,
focusNode validation and completionTicket semantics. Current root popTo('Roadmap')
assumptions will require a controlled migration, not a cosmetic navigator move.

Risk/acceptance matrix for that later pass:
- Home -> Roadmap -> Back -> Home; Courses -> Roadmap -> Back -> Courses, including
  CourseDetail/start history where that detail was intentionally visited.
- Roadmap -> Lesson/Challenge/Result/Review -> correct original Roadmap; Android
  hardware Back, header Back, cancellation and completion all target that instance.
- No duplicate consumption of tickets or repeated completion animation; no stale
  focus anchor overriding fresh currentNode. Preserve focus reload and motion guards.
- Tab switching/reselection, retained course state and deep links need explicit rules.
- New tab-bar height changes the map viewport: recheck measured auto-scroll,
  current-step visibility, bottom safe area, large fonts and transition timing.
Start with router/history tests, then physical Android acceptance. This is a proposal,
not an approved implementation of those unresolved tab-reselect details.

### Global header actions: analysis only

MainAppHeader already reuses GamificationMetrics with responsive compact policy.
Home/Courses place it inside a top SafeAreaView with 8dp extra top spacing, a 48dp
row and 18dp horizontal gutters. RoadmapHeader instead supplies non-compact metrics
as ContextualHeader.trailing: ContextualHeader owns insets.top, uses a 54dp row,
20dp gutters, 10dp bottom padding and a trailing maxWidth of 75%. It is a native-stack
header rather than scrolling content. For a single row, the vertical center differs
by about 5dp (8+24 versus 27 after safe area), with additional differences when metrics
wrap. Aligning only the logo or adding a device-specific margin cannot solve this.

A future AppHeaderActions primitive is useful chiefly to centralize action spacing,
compact breakpoints and measured available-width behavior; GamificationMetrics already
centralizes data rendering and should remain the source. A shared header-layout policy
should establish row center/right gutter and minimum 48dp targets. Leading content may
be logo or Back, without forcing a logo onto Roadmap. Each host owns top safe area
exactly once; scrolling versus fixed placement must be an explicit screen decision.
Reserve a composable optional notification child API, not empty visual space or a fake
bell. When it exists, count its width before deciding compact/wrap behavior. Test
large coin values, font scaling, narrow screens and loading/error shared values.
No AppHeaderActions extraction or notification UI is implemented in this iteration.

Validation so far: TypeScript PASS; full Mobile tests 168/168 PASS, including all
snapshot states, production/REAL identity, in-memory selector/hiding, blocked fixture
routes, no selection fetches, fixed chevrons and existing navigation/accessibility.
Backend and contracts untouched. Physical captures needed: clean ACTIVE and all three
other states, plus DEV selection/restore and large-font/narrow behavior. No physical
fidelity or full Home closure is claimed from component tests.

Android export PASS: dist/home-v1-preview-check (1089 modules, 2.4 MB Hermes).
Production Hermes marker check: dev-preview-a1, dev-preview-diagnostic and DEV selector label absent.
git diff --check PASS. Export only reported the existing NO_COLOR/FORCE_COLOR environment warning.
