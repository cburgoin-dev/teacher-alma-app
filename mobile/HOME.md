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
