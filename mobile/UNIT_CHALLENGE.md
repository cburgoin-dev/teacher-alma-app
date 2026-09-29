# Mobile Unit Challenge v1

`src/features/unit-challenges/` owns the API client, a small phase flow, and the Intro, Conversation, Crossword and Result views. The Courses stack hosts them in `UnitChallenge`; the tab bar is hidden during the challenge. No dependency, backend, schema or migration change is required.

## Behavior

- Roadmap reads `topics[].nodes` (`LESSON | UNIT_CHALLENGE`), `currentNode`, backend access/progression and combined required-node counters. The trophy identifies challenges; the bus marks only the supplied current node, including a commercially locked one. Lesson Result consumes `nextNode` and continues through Roadmap.
- Opening an available challenge reads metadata without creating a run. Start is explicit; an existing ACTIVE run is restored with run GET, including its current frozen phase. A deliberate replay starts at phase one with a new key.
- Conversation shows public messages, names and choices only. Learners can revisit local choices or leave them blank before phase submission. Audio appears only for a supplied valid URL.
- Crossword uses actual zero-based coordinates, shared crossing cells and public clues/lengths. Tap a cell or clue, then type the selected word in the input. A repeated crossing tap selects the other direction. Wide grids scroll horizontally; cells grow with font scaling. Blank or partially filled words are allowed.
- Each phase submits once. No hints, answer keys, per-item correctness or immediate correction. Transport retries freeze both payload and request key; concurrent taps do not create extra requests. A conflict reconciles with run GET.
- Back requires confirmation while a run is ACTIVE and calls abandon only after confirmation. Backgrounding or unmounting does not abandon. An uncertain start/submit must be retried before leaving so its commit state is resolved. Definitive access/validation failures release the pending guard.
- Result displays server `correctItems`, `totalItems`, truncated `percentage`, `passed` and `passingScore`; it never recomputes passing from the displayed percentage. A failed replay preserves previous consolidated progress. Returning to Roadmap reloads backend state. There is no local unlock calculation or Review mutation.
- Unsubmitted answers live only in the mounted screen. After process termination, resume restores the server phase; its unsent draft must be entered again.

## Local acceptance

Use the existing development environment and seed in [backend/UNIT_CHALLENGE.md](../backend/UNIT_CHALLENGE.md). `--apply` preserves history; `--check` validates it. Its documented entry-ready seed is optional and resets the configured demo learner, so it is not needed for the isolated smoke test below.

1. Start the configured backend from `backend/` with `node --import tsx src/server.ts` and Expo from `mobile/` with `node node_modules/expo/bin/cli start`. Keep the existing local `EXPO_PUBLIC_API_URL` pointing at that backend reachable from Android.
2. Courses → Inglés A1 → Roadmap. Complete any remaining required first-topic Lessons. With the Lessons seed, the third Lesson is still pending. Its Result returns to Roadmap, where the challenge is now current.
3. Tap the trophy → Intro. Check metadata, supplied threshold/best score, and both included mechanics. Start explicitly.
4. Conversation: select/skip choices, revisit an earlier turn, then send the phase. There must be no correctness feedback. Close/reopen the app now: the same run resumes at Crossword.
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

The views reuse the light blue London scenery, navy type, white rounded cards, blue controls and coral CTA/trophy direction. Participant initials replace illustrated portraits because the contract supplies names, not avatar assets. Result uses a trophy illustration rather than an invented Alma character. No duration, coins, streak, rewards or reinforcement topics are fabricated. Phase numbering follows real phase positions/counts (the demo has two phases, not four screens). The crossword follows valid backend geometry rather than copying the illustrative mockup's filled grid. "Enviar" replaces "Comprobar" because no immediate correction exists. Null threshold means any valid completed run passes, as defined by the backend.

Validation performed: mobile TypeScript, 51 affected unit tests, the real demo smoke test and Android export passed. No Android device was connected; physical layout/keyboard acceptance remains pending.
