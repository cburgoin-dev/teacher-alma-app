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
