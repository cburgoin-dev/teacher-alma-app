# Mobile Unit Challenge v1

`src/features/unit-challenges/` owns the API client, a small phase flow, and the Intro, Conversation, Crossword and Result views. The Courses stack hosts them in `UnitChallenge`; the tab bar is hidden during the challenge. No dependency, backend, schema or migration change is required.

## Behavior

- Roadmap reads `topics[].nodes` (`LESSON | UNIT_CHALLENGE`), `currentNode`, backend access/progression and combined required-node counters. The trophy identifies challenges; the bus marks only the supplied current node, including a commercially locked one. Lesson Result consumes `nextNode` and continues through Roadmap.
- Opening an available challenge reads metadata without creating a run. Start is explicit; an existing ACTIVE run is restored with run GET, including its current frozen phase. A deliberate replay starts at phase one with a new key.
- Conversation shows public messages, names and choices only, with blue selection and learner bubbles. Each turn has one Continue action; no selection retains an empty answer. The last turn's Continue reveals the final learner reply and any authored closing messages. A single final 'Continuar al crucigrama' CTA submits after the learner has read the ending. Audio appears only for a supplied valid URL.
- Crossword uses actual zero-based coordinates, shared crossing cells and public clues/lengths. Tap a cell or clue, then type the selected word in the input. A repeated crossing tap selects the other direction. The grid fits the measured width without horizontal scrolling; only unused outer margins are cropped and non-letter cells are transparent. Grid letters/numbers scale with cell size; full-size clues (44dp minimum targets) and the word input retain system font scaling as the accessible editing alternative. Blank or partially filled words are allowed.
- Each phase submits once. No hints, answer keys, per-item correctness or immediate correction. Transport retries freeze both payload and request key; concurrent taps do not create extra requests. A conflict reconciles with run GET.
- Back requires confirmation while a run is ACTIVE and calls abandon only after confirmation. Backgrounding or unmounting does not abandon. An uncertain start/submit must be retried before leaving so its commit state is resolved. Definitive access/validation failures release the pending guard.
- Result displays server `correctItems`, `totalItems`, truncated `percentage`, `passed` and `passingScore`; it never recomputes passing from the displayed percentage. A failed replay preserves previous consolidated progress. Returning to Roadmap reloads backend state. There is no local unlock calculation or Review mutation.
- Unsubmitted answers live only in the mounted screen. After process termination, resume restores the server phase; its unsent draft must be entered again.

## Local acceptance

Use the existing development environment and seed in [backend/UNIT_CHALLENGE.md](../backend/UNIT_CHALLENGE.md). `--apply` preserves history; `--check` validates it. Its documented entry-ready seed is optional and resets the configured demo learner, so it is not needed for the isolated smoke test below.

1. Start the configured backend from `backend/` with `node --import tsx src/server.ts` and Expo from `mobile/` with `node node_modules/expo/bin/cli start`. Keep the existing local `EXPO_PUBLIC_API_URL` pointing at that backend reachable from Android.
2. Courses → Inglés A1 → Roadmap. Complete any remaining required first-topic Lessons. With the Lessons seed, the third Lesson is still pending. Its Result returns to Roadmap, where the challenge is now current.
3. Tap the trophy → Intro. Check metadata, supplied threshold/best score, and both included mechanics. Start explicitly.
4. Conversation: choose an option or leave it blank, then Continue. On the last turn, Continue reveals the ending without submission; read it, then tap Continuar al crucigrama to advance with one phase submission and no correctness feedback. Close/reopen the app now: the same run resumes at Crossword.
5. Crossword: tap horizontal/vertical clues, edit a crossing, verify both words change. Leave some entries blank and submit. Result must show server totals, percentage and passing state.
6. Continue to Roadmap. Only backend passing/consolidated progress moves the frontier. Replay via the trophy starts the whole challenge. Back → Seguir preserves it; Back → Abandonar ends it. Reopen after abandonment to start anew.
7. With network interrupted during submission, answers stay frozen; Reintentar uses the same key and payload. Restore connectivity to reconcile. Check narrow Android, large text, keyboard and safe areas on a physical device.

Automated checks from `mobile/`:

```powershell
node node_modules/typescript/bin/tsc --noEmit
node --test tests/unit-challenges.test.cjs tests/courses.test.cjs tests/lessons.test.cjs tests/lessons-replay.test.cjs
node node_modules/expo/bin/cli export --platform android --output-dir dist/unit-challenge-check
git diff --check
```

Real HTTP/PostgreSQL smoke test from `backend/`:

```powershell
node --import tsx scripts/seed-courses-demo.ts --check
node --import tsx ../mobile/tests/check-unit-challenge-demo.cjs
```

The smoke test uses existing seeded challenge content, creates one disposable learner with prerequisite progress, runs the Mobile client/flow against the real backend on an ephemeral localhost port, and deletes only that learner in `finally`. It does not reset the configured demo user or rewrite content. It verifies metadata → start → Conversation submit → resume Crossword → Result → historical GET → Roadmap → replay → abandon. This is API/flow acceptance, not a physical UI test.

## Visual references and differences

Five original PNGs are in `docs/mockups/unit-challenge/`: roadmap, intro, conversation, crossword and result. The official unmodified Alma logo is `assets/branding/la-teacher-alma-logo.png`, rendered by shared `AlmaLogo` in the Courses header.

The views reuse theme typography, navy type, white rounded cards, blue selection and coral CTAs. London scenery is subdued during phases and more visible in Intro/Result. The hero uses a white trophy on coral. Intro's mechanics use full-width rows to avoid breaking their names on narrow phones. Participant initials replace illustrated portraits because the contract supplies names, not avatar assets. No duration, coins, streak, rewards or reinforcement topics are fabricated. Phase numbering and crossword geometry follow backend data. "Continuar" avoids exposing phase submission concepts. Null threshold still means any valid completed run passes.

Lesson Result and Challenge Result each have a single red "Continuar en la ruta" CTA. Challenge Result preserves server scores/passing, without emphasizing the threshold again. Catalog progress text uses completed/total required nodes ("pasos"), matching its combined percentage. The original 3178×2352 logo remains unchanged with contain and its original aspect ratio, now at 44dp height instead of 86dp. Its source resolution is sufficient for this downscaled footprint; actual Android sharpness still needs device acceptance. That second iteration included no global palette, Roadmap motion, backend or lifecycle change.

First iteration validation included the real demo smoke test. Second UX iteration: mobile TypeScript, 56 affected tests, Android export and git diff --check passed. Backend suites were not rerun for this presentation-only change. The supplied Android captures document the previous UI and are not new product references. Final physical layout/keyboard/large-text acceptance of this iteration remains pending.

## Iteration 3 acceptance notes (historical; closure and logo decode superseded below)

- Confirmed interaction cause: the previous last-turn Continue advanced to a second Continue before submission. It now closes and submits in one action; a synchronous local guard rejects a stale second tap and the existing flow still owns durable request keys/retries. API and lifecycle code are unchanged.
- CTAs keep their full Pressable background as the hit surface, with pressed opacity and non-interactive children. Busy indicators occupy the original button footprint (the invisible label reserves even wrapped/scaled text height); submission no longer inserts a spinner above the transcript. Decorative SVGs explicitly ignore pointer events. The outer ScrollView retains `keyboardShouldPersistTaps="handled"`. Other reported physical missed taps were not reproduced automatically; verify center/edge taps, keyboard-open submission and scrolling on Android rather than treating the identified extra step as a universal cause.
- The PNG is 3178×2352 RGBA, displayed at approximately 59.5×44 dp (about 179×132 physical pixels at 3× density). No source upscaling is needed. Android now explicitly decodes with `resize` and multiplier 2, followed by downscaling, to retain more edge detail. RN 0.86 implements this in native/Flow code but omits the multiplier from its TypeScript interface; the component's local extended type documents that discrepancy. The original PNG is unchanged. Final sharpness still requires device acceptance; source resolution is not currently a demonstrated limitation.
- Pixel inspection finds opaque logo colors #06205C and #CB0A3D. Opt-in brand tokens align Challenge headings and a small hero accent; interactive blue, coral CTAs and the global palette remain unchanged. Roadmap trophy stars use the enclosing node's fill, so a completed trophy reads white/green instead of white/red. Intro/Result keep white/coral.
- Demo content only: Emma's second message now introduces greeting practice without assuming a correct name/answer. Every choice (including blank) gets the same authored transition; Mobile neither infers correctness nor rewrites arbitrary speaker text. Future linear conversations must likewise author neutral follow-ups rather than implying unsupported branching.
- The seeded crossword is now 7×7 with NAME, HELLO, HOME, MEET and BYE, four compatible crossings and no disconnected words. Its coordinates are entirely in the demo fixture, not Mobile. Existing frozen runs retain their old content; start a fresh replay to inspect the new demo. Apply with `node --import tsx scripts/seed-courses-demo.ts --apply`, then `--check`; do not reset learner history. The fixture's graph/letter compatibility test runs with `node --import tsx --test scripts/unit-challenge-demo-data.test.ts` from backend.
- Validation: mobile TypeScript and all 81 Mobile tests passed; the demo geometry test and seed apply/check passed with `resetUserProgress: false`. No production backend/domain/API/schema changes. Screenshots remain acceptance evidence, not new mockups.
- Motion is deferred. Existing pure path geometry and current-node coordinates are sufficient groundwork; no preparatory refactor or partial animation was added. Next iteration can build path painting, bus travel and current/unlock transitions on those primitives after physical tap/logo acceptance.

## Iteration 4 acceptance notes

- Conversation deliberately separates revealing the ending from leaving the scene. The last Continue does not submit. The final CTA is Continuar al crucigrama, protected against repeated taps; the existing flow retains durable request keys and transport retries. Only authored closing messages are shown; no correctness or invented Emma dialogue. No demo change was needed. Crossword/Result and scoring are unchanged.
- Feedback auto-scroll now measures the entire feedback, rather than its first 100px. It runs after content size/layout settles and after keyboard dismissal. The shared ActivityStep footer already keeps Continue outside the scrolling viewport. Fitting feedback is revealed with a small margin; feedback taller than the viewport starts at its top and remains manually scrollable, preserving large text accessibility. Already-visible feedback does not jump.
- Hero speech bubbles have a single continuous stroked silhouette including the tail. Background circles fit vertically within the SVG; side cropping is intentional. Challenge's contextual title is 18dp, leaving other headers unchanged. The existing coherent outline icon family is retained. No palette changes: official brand navy #06205C/red #CB0A3D remain opt-in; functional colors are untouched.

### Logo diagnosis and remaining physical check

The repository PNG and the received official PNG have identical SHA-256 hashes: 010ee9541691b97661d98d351f3493f37b25912fdc5ee4e9b681c459f7b7f376. The source is 3178×2352 RGBA. Display remains 44dp high, roughly 59.5dp wide, with contain and original aspect ratio. The native view converts dp to physical pixels (about 179×132 at 3× density). There is no source upscaling and no official vector in the branding assets.

The previous forced resize path passed target dimensions to Fresco ResizeOptions, leaving a decoder sampling step before final rendering. Installed RN 0.86 ReactImageView explicitly implements resizeMethod=none with DownsampleMode.NEVER; this also avoids ResizeOptions. AlmaLogo now uses this path, retaining the full official raster until display scaling, without changing footprint or colors. This removes a demonstrated lossy stage; it does not prove that every artifact in a compressed physical screenshot was caused by it. A single decoded bitmap costs approximately 28.5 MiB. @2x/@3x variants are not needed to fix insufficient resolution here, but properly prepared small-display variants or an official SVG would reduce decode memory and give more predictable tiny-detail rendering. We did not manufacture a vector or redraw the mark. If fine strokes still look poor on-device, request Alma's official SVG (preferably) or exports optimized for roughly 60×44dp at 1×/2×/3×; physical sharpness acceptance remains pending.

### Roadmap progress motion

A presentation-only in-memory ticket captures the current incomplete node/type/course and completed-required-node count when entering from Roadmap. Result marks that ticket only for a non-replay Lesson completion or a passed Challenge without earlier consolidated passing progress. A Review detour invalidates it. Roadmap consumes it once after its focus reload and requires the server's node to be completed, required count to increase, and its adjacent successor to be the unlocked current node. A stale/mismatched response never creates local progression. Normal entry, reload, failed challenge, replay, exit without completion, or no successor show consolidated state directly.

After measuring and centering the relevant segment, a layout frame settles before native Animated motion starts. The 3s timeline shares one value: 2.58s of eased bus travel and progressive blue dashes, followed by a subtle arrival pulse/card fade. The bus uses the same curvedDashes coordinates (including topic bends), ending at the exact existing bus marker. Touch navigation/refresh is blocked during travel, then restored. Blur/unmount stops animations and removes accessibility listeners; no visual state is persisted. Reduced Motion resolves directly to server state with no travel. If large text or a short viewport cannot fit the whole segment plus arrival card, travel is also skipped and the final node is positioned normally, avoiding offscreen animation. No animation library, sound, smoke, gamification or backend change was added.

Physical acceptance: complete a pending Lesson from Roadmap, return through Result and observe the segment/bus/arrival; repeat for a first passed Challenge. Check failed Challenge, completed-node replay, normal entry and app reload do not travel. Repeat with Android Remove animations/Reduce Motion enabled, large fonts, narrow screen, and leaving the screen mid-animation. Inspect logo edges and the full feedback for Lesson 3 MC with the fixed Continue visible. These are device checks still to be performed by the user, not claims of physical acceptance.

Validation: TypeScript and all 89 Mobile tests passed, including Courses/Lessons/Unit Challenge and motion eligibility, geometry, reduced motion, native animation cleanup, viewport fit and feedback visibility. Android export and git diff --check passed. No seed/backend validation was needed because neither changed. Physical acceptance remains pending.

## Iteration 5 acceptance

This section supersedes iteration 4's 3-second timing, whole-segment viewport requirement and full-resolution logo decode. Backend contracts, lifecycle, progression, scoring, passing, replay, resume and abandonment are unchanged.

Motion uses one native Animated progress value: 3500ms travel plus 450ms arrival (3950ms total). Arc-length samples of the existing connector drive the bus, dash painting thresholds and camera target. Rotation follows neighboring sample tangents, unwrapped to avoid full spins; the bus returns upright on arrival. A 1.2dp suspension movement and three faint exhaust dots run only during travel. The scroll camera follows those same samples via the native value listener, without per-frame React state or overlapping scroll animations. Reduced Motion resolves immediately. Frame smoothness and bridge latency still require physical acceptance; automated geometry checks cannot prove on-device synchronization.

The DEV-only `DEV · Replay motion · 1×` button is above the course summary. Scroll back to the top after a preview to repeat it. It reuses CoursePath and the same timing/camera/arrival renderer using the completed predecessor of the real current node. It makes no API calls, changes no progress and creates/consumes no completion ticket. It is absent from production. Normal product navigation still needs the existing single-use, backend-confirmed completion ticket; failed challenges, replay and normal entry do not animate.

Conversation shows the learner bubble, waits 400ms (including its entrance), types three dots for 600ms before each following authored message, then reveals it. No authored following message means no invented Emma response. The final learner reply remains readable before the single `Continuar al crucigrama` CTA appears; only that CTA submits. Timers/animations clean up on unmount and Reduced Motion skips the sequence. Tails are presentation only. No branching or immediate correctness.

Crossword has a separate local input draft. Switching clues empties the TextInput without touching the shared grid. Existing crossing letters stay visible only in their cells. Typing starts at the word's first position and updates shared cells; deleting affects only positions typed in the current draft. Five connected demo words and backend coordinates are unchanged.

### Logo asset preparation

The original official PNG remains byte-for-byte unchanged (SHA-256 listed above). `assets/branding/la-teacher-alma-mobile.png` and @2x/@3x/@4x are transparent 60x44dp canvases with the original proportions, prepared using Lanczos3 downsampling. Metro selects the device-density variant. Even the 4x decode is only 165 KiB, versus ~28.5 MiB previously. No redraw, sharpening, recoloring or runtime dependency was added. Optional regeneration: `node scripts/prepare-logo.cjs <path-to-sharp>` from mobile, using an externally available development copy of Sharp. The source has sufficient pixels; perfect preservation of tiny strokes at this footprint is not guaranteed. An official SVG or brand-authored small-size export remains the appropriate future asset, not an automatically traced substitute. Physical sharpness remains unverified.

### Reproducible physical route

The explicit reset wrapper below calls the existing guarded local seed. It resets the configured demo learner's progress in `teacher_alma_dev`; it is never run by tests, app startup or export. Use it only when you want a fresh acceptance route. No production seed logic or Admin tool was added.

1. In `backend`, run `npm run demo:lessons:reset`, then `npm run demo:check`. Use the existing local backend/Expo setup above. Lessons 1–2 are complete, Lesson 3 is pending; Challenge and Lesson 5 unlock through real completion/passing.
2. Open Roadmap, finish Lesson 3, then tap its Result route CTA.
3. Observe one completion transition and arrival pulse. It should take about 3.95 seconds, with no second animation on normal re-entry.
4. In a DEV build, scroll to the course summary and tap `DEV · Replay motion · 1×`; repeat without resetting progress. Production has no button.
5. Watch the bus turn along the curve and return upright at its destination; test both alternating directions and the topic boundary.
6. Confirm gray dashes turn blue as the bus reaches them, rather than painting the entire segment beforehand.
7. Confirm the camera follows on a narrow Android screen and with large fonts; the route no longer skips travel just because the entire segment cannot fit.
8. Inspect the subtle suspension/exhaust during travel and their disappearance at arrival. Leave the screen during motion and confirm no continuing animation or blocked navigation.
9. Enter Challenge Conversation. Test correct, incorrect and blank choices: learner bubble, short pause, typing, next authored message. At the end read the final reply and tap the one final CTA. Double tapping must not duplicate submission; test the existing network retry path too.
10. In Crossword, fill NAME, select HELLO (its shared E is intermediate): input is empty, E stays in the grid, typing HELLO starts with H. Repeat initial/final crossings and clue switching; verify shared edits, deletion, keyboard, blanks and no horizontal scrolling.
11. Inspect the compact official logo on the physical phone, especially small letter strokes, proportions and the absence of density upscaling on supported 1–4x displays.
12. Pass Challenge and return through Result: observe the real transition to Lesson 5. A failed attempt, completed-node replay or normal Roadmap entry must not trigger product completion motion. DEV preview is the explicit testing exception.
13. Enable Android Remove animations/Reduce Motion and repeat: consolidated Roadmap appears immediately, chat reveals without typing/entrance delay, and all CTAs remain usable.

Automated validation and export do not substitute for these physical checks. No sounds were introduced. Existing Lesson feedback layout, Review and Lesson scoring remain untouched.

Iteration 5 validation: Mobile TypeScript, all 94 Mobile tests at the full-suite checkpoint plus the added chat timer/Reduced Motion cleanup test (17/17 Unit Challenge tests on the final targeted rerun), Android production export and diff whitespace checks passed. Production Hermes was checked for absence of the DEV preview label/helper. The explicit demo reset and subsequent check passed; two prerequisite lessons are complete and there are no active Challenge runs.

On this Windows installation the npm launcher points to a missing roaming npm-cli.js. The wrappers were validated through the installed CLI: `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run demo:lessons:reset`, followed by the same command with `demo:check`, from backend. This is an environment workaround; no global npm settings were changed.

## Iteration 6 acceptance

V5 motion, camera, chat/input and raster sharpness were physically accepted by the user. V6 is presentation polish; its changes still need physical acceptance.

### Vehicle contact and exhaust

The side-on 2D RouteBus is retained. The V5 rotation used the downward marker axis, perpendicular to the SVG's horizontal wheel baseline. V6 converts that angle to the side-on baseline and chooses facing once from the connector direction (mirrored for leftward travel). Rotation pivots at the actual average tire contact, not the container bottom: SVG (30.5,48) maps to (22.367,37.867) dp inside the 44x42 viewport, including xMidYMid letterboxing. Both parked and traveling positions use this contact helper. The bus remains above the path's drawing layer; no segment-specific offset, perspective replacement or new route geometry was introduced. A four-angle static render checked the actual SVG and wheel alignment. On curved segments the contact is the local tangent approximation, not a wheel/road physics simulation.

Whole-vehicle suspension bob was removed because it lifted the tires off the road. The three exhaust particles now originate at the rear of the local SVG, rotate/mirror with the bus, expand from 0.65 to 1.9, and peak at 0.48 alpha. Their envelope is strongest early, quieter during cruise, and zero before arrival. They remain decorative, non-interactive and omitted with Reduce Motion; unmount stops the loops. No particle engine or sound. Arc distance, native progress, dash thresholds, camera following, 3500+450ms timing, easing, arrival, DEV replay and completion eligibility remain unchanged.

### Official artwork and colors

Both supplied files are archived unchanged in `docs/branding/LaTeacherAlma-Logo.ai` and `.pdf`, outside the runtime asset bundle. Both contain one vector artwork sheet with multiple official lockups/colorways (zero embedded raster images); the AI includes a PDF-compatible representation. Their rendered sheets were inspected. The PDF additionally includes print marks/color bars, and the content uses print/spot color resources. These are genuine vector sources, not a PNG requiring tracing.

The accepted V5 density-aware PNGs remain in production. A faithful isolated SVG has not been verified for path selection, print-to-screen color conversion and tiny-size Android rendering, so V6 makes no claim that an untested SVG is superior. No tracing, lettering reconstruction, raster recoloring or new runtime dependency was added. Existing asset/decode cost stays unchanged; the archived source sheets are not imported by Mobile. A future isolated export from the original artwork should be compared at 60x44dp before replacing the accepted PNGs.

The sheet's explicit RGB/HEX labels confirm navy #00205C, red #CA003D and light #F2F2F2. Only opt-in brandColors were corrected to these values; functional blue/coral, white surfaces, success green and Premium gold were preserved. Future brand-surface/heading alignment can be evaluated separately, not by replacing global interactive colors.

### Phase preview and Conversation

Intro uses two solid local SVG phase icons: speech bubble with three white dots and a crossword tile with white cells. They reuse the existing SVG renderer, circle containers, functional blue and icon footprint without adding an icon library. Hero circles/tails, Crossword and Result are unchanged.

Typing now lasts 1000ms (previously 600ms), retaining the 400ms learner entrance/pause and 200ms authored message entrance. Reduced Motion reveals immediately. Final readable reply/closing, the sole Continuar al crucigrama submit, request idempotency and timer cleanup remain unchanged.

The acceptance-only seed now contains four decisions (name, greeting, origin, goodbye), with neutral authored practice transitions and an explicit closing. It is not final pedagogical content approved by Alma. There is no conditional branching or implicit validation in follow-ups. The existing scoring counts four choices plus five crossword entries for fresh runs (nine items); this is content length, not a scoring-rule change. Historical runs keep their frozen content.

The updated demo was applied locally with `--apply` and checked, preserving existing learner progress (`resetUserProgress: false`). Start a fresh replay to see four turns. The explicit V5 reset wrapper remains available only when a fresh Lesson 3 -> Challenge -> Lesson 5 route is desired; V6 did not reset it automatically.

### Physical checks still pending

Use DEV Replay motion on both connector directions and the topic bend: inspect tire contact, body outside the line, start/arrival rotation, rear exhaust during acceleration/cruise/braking, and unchanged 3.95s path/camera pacing. Confirm the parked bus remains coherent. Repeat with Reduce Motion and leaving mid-travel. Inspect the filled phase icons on narrow/large-font Android. Start a new four-choice demo run; observe 1s typing, scrolling, blank/wrong choices, final authored goodbye, and the single final CTA. Check the unchanged density-aware logo and Result. Static rendering/tests/export do not establish this physical acceptance.

V6 validation: Mobile TypeScript passed; 72 relevant Mobile tests passed (Courses, motion/contact geometry, Unit Challenge, Lessons and Lessons replay). Both demo content tests and local seed apply/check passed without resetting learner progress. Android production export passed with the same 25 assets and four PNG logo densities; no vector runtime payload was added. Source AI/PDF hashes match the supplied originals. Git diff whitespace check passed. No production backend/domain/API/schema change.

### V6 physical acceptance correction: moving bus and contextual chat scroll

The interrupted investigation made no edits. Existing V6 work was retained. The moving-only regression was reproduced in the installed React Native 0.86 transform-origin parser: its string regex accepts integer px tokens but not decimal px tokens. The former `22.366...px 37.866...px` pivot lost the decimal prefixes, producing enormous coordinates. Rotation/mirroring around that origin displaced the moving bus outside the visible scene; the parked SVG does not use those transforms. `vehicleOrigin` is now a numeric [x,y,0] tuple, bypassing string parsing for both rotation and mirroring. The translated outer wrapper also explicitly declares its 44x42 footprint and visible overflow. Tire contact, side-on body, angle conversion, exhaust and shared progress/timing/camera/path remain unchanged. The regression test executes the installed regex to reproduce the old pivot and checks bounded numeric coordinates. This proves the parsing defect, not physical visibility on Android.

Conversation now reports measured layouts for the newest learner/authored bubble and each active card/final CTA to its parent ScrollView. The controller coalesces layout/content-size notifications into one animation-frame scroll request, moves only enough to reveal the measured target with a 16dp margin, and clamps to the scrollable content. Already visible content does not move. Oversized cards begin at their top and remain manually scrollable. Scroll events only record position; they never drive auto-scroll per frame. A manual drag suspends following, which resumes on explicit Continue or on returning within 48dp of the bottom. Reduced Motion uses an immediate scroll rather than an animated one. Pending frame requests are cancelled on phase change/unmount. The existing typing timers, 1000ms cadence, bubbles, single submit and final closure are preserved; no sticky CTA was added.

Coverage clarification: V5's 94 was its full-suite checkpoint, followed by one added timer-cleanup test (95). V6's 72 was a relevant subset (Courses/motion/Unit Challenge/Lessons/replay), not the entire Mobile suite. This correction ran all `mobile/tests/*.test.cjs`: 99 passed, zero failed/skipped, including the V6 contact test and three correction tests. Mobile TypeScript passed. Physical checks remain necessary: bus visible throughout both DEV/real motion directions, tire contact, rear exhaust, arrival, Reduce Motion, and long Conversation following versus manual history review. Existing filled preview icons, Crossword, Result and branding were not changed by this correction.

Final correction validation: Android production export and git diff --check passed. The required demo:lessons:reset and demo:check were executed successfully through the documented Windows npm-cli.js launcher after validation: resetUserProgress=true, two prerequisite lessons complete, zero active runs and zero Challenge runs. Lesson 3 is ready for physical acceptance. No Git commit/push/merge/reset was performed.

### V6 final acceptance fixes: Intro exit and incremental follow

The user physically accepted the vehicle/contact/path/camera, filled preview icons, 1000ms typing, Crossword and Result; none were changed in this fix.

Intro's direct exit previously set its permanent leaving ref before dispatching popTo. If removal was intercepted (including a guard/native update timing window), that ref suppressed subsequent exits. Más tarde now uses the same exit request semantics as Back. A valid no-run exit queues a render that releases usePreventRemove, then dispatches the Roadmap return in an effect; only that dispatch sets the duplicate-navigation latch. It never calls start or abandon for an unstarted Intro and invalidates, rather than completes, any motion ticket. ACTIVE/uncertain runs keep their existing confirmation/retry semantics. The test simulates a guard still present before the queued render and checks a single Roadmap navigation with no run mutation. The exact timing on the physical device remains a device acceptance check.

Each new learner bubble, typing bubble, authored message and active card/final CTA now has a distinct ordered measured target. Previously typing had no target, and all requests waited for the next frame. New measurements request the minimum scroll immediately; content-size/layout callbacks reconcile scroll bounds once available, with duplicate offsets suppressed. This keeps the typing stage visible rather than waiting for the final card. Scrolling upward pauses following, including a short upward gesture near the bottom. Returning near the active content can restore following during/end of momentum; explicit Continue also restores it. No blind scrollToEnd, frame-driven scrolling or fixed/sticky CTA. Reduced Motion still requests immediate scrolling and skips artificial reveal delays. Authored content, submit and timing are unchanged.

Validation: Mobile TypeScript and all 101 Mobile tests passed, including Intro navigation, incremental chat targets, manual-review/momentum resumption and existing shared/Lessons/Challenge regressions. Physical acceptance remains pending for Más tarde and the incremental reveal/follow sequence on a long conversation, including upward history review and returning to the latest content.

Final exit/follow validation: Android production export and diff whitespace checks passed. Executed demo:lessons:reset followed by demo:check through the documented npm-cli.js launcher: successful reset/check, two completed prerequisite lessons, Lesson 3 pending, zero active runs and zero Unit Challenge runs. No Git commit, push, merge or reset.


## Iteration 7 acceptance

### Exit semantics

Header chevron and Android hardware Back both request exit, including Lesson Replay. Unit Challenge Intro also uses this confirmation for Más tarde: Continuar keeps the Intro; Salir returns explicitly to Roadmap. An unstarted exit calls neither start nor abandon, changes no progress and does not finish a completion ticket. ACTIVE Challenge retains the existing explicit-abandon request/retry path before returning; background interruption/disposal does not abandon. NORMAL_RUN Lesson retains its existing confirmation and abandon semantics. REPLAY confirms exit locally without a persistent endpoint or historical progress change; previous-step traversal remains the explicit internal revisit capability.

The permanent leaving ref was removed. Challenge releases its removal guard for the confirmed navigation dispatch and then re-arms the request state if still mounted. A failed/no-op popTo can therefore be retried instead of leaving Más tarde permanently inert. Only an actual first passed completion can carry a finished completion ticket. Tests cover cancelling, confirming, shared header/hardware intent and a no-op navigation followed by another attempt; they do not establish native device acceptance.

### Progression choreography

One native animation sequence owns three transient values: origin completion, the unchanged V6 travel/arrival progress, and destination reveal. Nothing is persisted or substituted for backend progression/access state. Timing is completion 600ms -> settle 150ms -> travel 3500ms -> arrival 450ms -> reveal 550ms (5250ms total).

The source starts with a coral current face over the consolidated completed face. Its halo/disc crossfade to green while the check fades/scales in; a restrained pulse settles before departure. Challenge sources retain a white trophy with green accent and a slightly stronger pulse. This uses opacity/scale, not a simulated score or reward and not an SVG stroke draw.

V6 wheel contact, numeric transform origin, 2D bus, tangent/arc geometry, travel easing, dash painting and camera samples are unchanged. The camera holds at the source during completion/settle, follows the V6 samples during travel and holds at the destination through reveal. Exhaust is suppressed at zero travel progress so particles do not appear during the added completion stage; its accepted rear attachment, particle size/alpha and travel envelope remain intact.

The destination initially shows a gray prerequisite face. After arrival it fades away while the consolidated icon, ring, current dot and card reveal; the card slides 10dp and the node pulses lightly. Lesson destinations reveal the current book; Challenge destinations reveal the trophy. An access-locked destination reveals the gold lock and ACCESO PREMIUM card, never an unlocked book/trophy. Existing backend-derived lessonState remains authoritative. Eligibility is unchanged: only a single-use ticket plus a confirmed adjacent backend frontier transition triggers product choreography. Normal entry, replay and failed challenges do not.

Reduce Motion resolves all three values directly to the consolidated state without artificial timing. Animation frame, sequence and progress listener clean up on unmount/change; the existing exhaust loops also clean up. DEV Replay motion reuses the complete same sequence without APIs, mutations or ticket consumption and remains behind the existing production-excluded DEV branch.

### Pending physical acceptance

1. From Intro, cancel and confirm Más tarde and chevron; repeat with Android Back. Confirm returning to Roadmap creates no run/progress/motion. Reopen and repeat.
2. In ACTIVE Challenge, cancel to retain the run; confirm to abandon and return. Background/reopen must remain resumable. Repeat Lesson normal exit and Replay exit midway through an activity; Replay must not go to the previous step or change history.
3. Finish Lesson 3 and return through Result: observe coral-to-green/check completion, brief settle, V6 travel/arrival, then lock-to-trophy/card reveal. Pass Challenge and inspect the corresponding Lesson destination. Confirm the source remains visible before departure and the destination/card remains visible through reveal on narrow/large-font Android.
4. Repeat both directions and topic boundaries with DEV Replay motion; inspect bus visibility, tire contact, exhaust, timing and camera continuity. Leave mid-sequence to check cleanup. Inspect a real access-locked destination: gold lock and Premium card, with no false unlock.
5. Enable Reduce Motion and repeat: immediate consolidated state, usable CTAs, no long choreography. Normal entry/replay/failed attempts must not trigger product completion motion.

Validation: Mobile TypeScript and the complete Mobile suite passed: 104 tests, zero failures/skips. This includes Courses/Roadmap, normal Lessons, Replay, Unit Challenge, shared regressions, exit retries, native sequence ordering/cleanup, Reduced Motion and Lesson/Challenge/Premium rendering layers. Automated checks do not claim physical acceptance.

Final V7 validation: Android production export passed (25 assets); its Hermes bundle contains neither the DEV preview label nor helper. Diff whitespace check passed. Executed demo:lessons:reset and then demo:check using the documented npm-cli.js launcher: resetUserProgress=true, successful database/content check, two prerequisite lesson progress records, zero active runs and zero Unit Challenge runs. Lessons 1–2 are complete and Lesson 3 is pending for physical acceptance. No commit, push, merge or Git reset was performed.


### Iteration 7 acceptance/polish — V7.1

This section supersedes V7's Intro guard-release queue, border-check representation and 150ms settle. Existing V7 local changes were preserved.

Exit investigation: source inspection found the same requestExit callback on header and Más tarde, an enabled real Pressable for valid Intro, pointerEvents=none on decorative children/background, and no Intro scroll-follow action. The supplied still image cannot establish whether Android delivered the physical tap; no device trace was available, so this is not claimed as a reproduced touch-interception root cause. The remaining unnecessary navigation dependency was routing a no-run Intro exit through a guard-release state/effect and popTo. Intro now confirms and navigates directly: canGoBack -> goBack, otherwise explicit Roadmap fallback. It has no removal guard/run to release and no latch. ACTIVE/pending runs retain usePreventRemove and explicit abandon semantics. The real Button/Pressable test checks enabled state, callback identity with header, confirmation, both destinations and retry after a no-op navigation. Physical verification of Más tarde is still required.

Completion now draws an SVG success ring over about 420ms and a 300ms check stroke overlapping from 270ms. Circle/check dash offsets follow the existing completion clock through SVG refs; no extra timers, dependencies or per-frame React state. Listeners are removed on unmount. The final static check uses the same path to avoid a shape swap. Challenge completion retains the trophy with a delayed central star during the final 210ms and a restrained pulse.

Destination reveal staggers gray lock shrink/fade, ring trace, consolidated icon, current dot pop and card slide/fade. Premium reveals a gold ring/lock and ACCESO PREMIUM, never a false unlock. Challenge reveals the shared trophy. Backend state is unchanged.

A left-facing departure crossfades the stationary right-facing bus into the V6 left-facing bus during the 200ms settle. Right-facing departures add no visual turn. Arrival crossfades back into the existing right-facing parked representation during the existing arrival interval, avoiding the endpoint flip. Numeric tire-contact origins, translations, road/camera samples, travel easing and exhaust are retained. Total timing is 600 + 200 + 3500 + 450 + 550 = 5300ms, only 50ms more than V7. Reduced Motion resolves directly; DEV preview runs this same choreography for the actual predecessor/current pair. No synthetic scenario selector was added.

Trophy previously had separate Preview and Roadmap paths. The Roadmap's open stem/base subpath could implicitly close diagonally. Both now use TrophyShape based on the accepted Preview artwork, with explicit rectangular stem and pedestal, configurable white/accent colors and size. Result inherits the same Hero artwork without layout changes.

Validation: Mobile TypeScript and all 107 Mobile tests passed, including real Intro button wiring, goBack/fallback/retry, active protection, Lesson/Replay regressions, stage ordering, drawing windows/listener cleanup, facing decision, Premium/Challenge layers and shared trophy geometry. Physical checks: confirm Más tarde actually opens the same dialog and returns in Android, then inspect ring/check drawing smoothness, star delay, staggered cards, both bus directions/parking, narrow/large-font viewport, Premium and Reduce Motion. Tests do not prove physical delivery, visibility or smoothness.

V7.1 final validation: Android production export passed with 25 assets; DEV label/helper absent from Hermes. Executed demo:lessons:reset followed by demo:check through npm-cli.js, both successful: resetUserProgress=true, two prerequisite lesson progress records, zero active Lesson runs and zero Unit Challenge runs. Lessons 1–2 complete, Lesson 3 pending. Git diff --check passed. No commit/push/merge/Git reset.
