# Mobile Gamification v1 — functional first pass

## Scope and architecture

`src/features/gamification/` owns the typed API, presentation, shared in-memory
resource, focus hook, compact result card and global protection screen. No new
dependencies or client reward/progression calculations. The backend remains the
authority for balance, stock, streak, Daily Goal and Repair eligibility.

`GamificationResource` coalesces concurrent GET requests. Courses and Shop refresh
on focus and explicit pull-to-refresh; confirmed spending also refreshes. There is
no polling. Returning to Courses after Shop or learning loads the current aggregate.
Result screens use the returned delta directly, without an extra GET.

## Timezone

Root bootstrap starts one shared PATCH with the device's
`Intl.DateTimeFormat().resolvedOptions().timeZone`. The runtime value is checked
with `Intl.DateTimeFormat`, rejecting empty/invalid values and numeric offsets.
No fallback timezone is invented. Aggregate reads await synchronization. Normal
Lesson writes, Challenge phase submissions and Review attempts also await it,
because these endpoints can durably complete learning. Replay checking is excluded.

A successful sync is reused for this app session, including concurrent calls and
rerenders. A failed bootstrap does not block navigation: Courses keeps working,
the header shows placeholders, and Shop offers an error/retry. Pull-to-refresh or
an explicit retry of a learning write can retry failed synchronization. Learning
writes fail before submission when timezone cannot be synchronized; no event is
silently created using a guessed zone. Historical learning dates remain untouched.

The current app has no Mobile login/session-switch lifecycle; bootstrap uses the
existing API client's authentication environment. A future login/account switch
must create a fresh resource for that authenticated session (including clearing
cached data and pending requests). Live device-timezone changes during a running
session are not watched: relaunch the app to resync. No Profile vertical is added.

## Header and global navigation

`src/components/MainAppHeader.tsx` reuses the official AlmaLogo, shows the actual
coin balance and current streak, and makes only the coin pill actionable.
Loading/errors use discreet placeholders; the Shop entry remains available.
The host owns safe-area insets. Pills wrap at narrow widths, use scalable text and
48dp minimum touch height. Only Courses integrates this app header in v1.

Root native stack contains `MainTabs` and `GamificationShop`. Shop is outside tabs,
uses ContextualHeader/back, and returns to the retained origin with `goBack()`.
The four tabs, Courses stack, study-flow tab hiding and completion tickets remain.

## Shop / protection

- Current balance and streak come from GET.
- Protector costs 50 coins, displays actual stock/max, and disables purchase at
  the cap. It automatically covers one missed day; purchase never fabricates stock
  or balance locally.
- Repair appears only when the aggregate returns a candidate. It shows the prior
  streak, returned cost and exact expiration formatted in device local time with
  timezone. Backend eligibility is authoritative; no client countdown gate.
- One in-flight spending operation, with stable request key and frozen Repair ID
  across ambiguous retries. Pending requests survive leaving/reopening Shop within
  this process, and prevent starting a different debit until confirmed/rejected.
- Successful mutation triggers GET. If this GET fails, retry reloads state without
  repeating the confirmed debit. Definite domain rejections show Spanish copy and
  refresh state; network/5xx/408/429 keep the pending request for explicit retry.
- Pending keys are in memory, not durable across process termination. On a fresh
  app start, GET returns actual server state; there is no automatic mutation replay.

No Shop-specific mockup was found in the repository's mockups; the first pass uses
the existing shared buttons/header, palette, cards and public per-icon vectors.

## Results and compatibility

- Normal Lesson Result includes optional `gamification` without altering score,
  course progress, Review pending, the existing CTA or completion motion.
- Completed Challenge Result displays the optional delta, regardless of pass/fail.
  Failed runs can show habit progress; repeat/historical results invent no rewards.
- Review shows a delta only in its final Result and only when the final backend
  attempt supplied one. Intermediate answer feedback never renders this card.
- The shared card distinguishes operation `coinsEarned` from balance, renders only
  returned reward entries, current streak/advancedToday, Daily Goal preset/progress
  and reward earned now. Missing deltas are supported.
- Explicit compatibility decision: Lesson Replay stays ephemeral/read-only and
  excluded from Gamification. No Replay persistence, events or rewards. Practice
  remains deferred until a durable session exists.

Daily Goal configuration, real Home/Progress/Profile, Roadmap header, Streak
Challenge, cosmetics, ads and monetization remain deferred.

## Validation and physical acceptance

From `mobile/`:

```powershell
node node_modules/typescript/bin/tsc --noEmit
node --test tests/gamification.test.cjs
node --test tests/*.test.cjs
node node_modules/expo/bin/cli export --platform android --output-dir dist/gamification-v1-check
git diff --check
```

Tests exercise HTTP payloads, synchronization/deduplication, spending success and
ambiguous retries, contextual Repair, component output/handlers, optional result
deltas, Replay exclusion and root navigation. Native primitives are stubbed in
component tests; they do not prove Android touch/layout/TalkBack behavior.

Validation on 2026-09-30: TypeScript PASS; focused Gamification 20/20; full Mobile
suite 128/128; Android production export PASS (1065 modules, Hermes 2.4 MB);
`git diff --check` PASS. Expo needed execution outside the Windows sandbox because
its local export log returned EPERM. Export output is ignored under `mobile/dist/`.

Physical acceptance still required on the existing configured demo environment:
open Courses, enter Shop via coins, buy with available balance, return/back, check
stock cap and network retry, then complete Lesson/Challenge/Review and verify real
result deltas. Repair requires a genuinely eligible backend candidate; Mobile does
not fabricate one. Also check narrow widths/large fonts, safe areas and hardware
Back. This pass does not reset/seed the demo or claim physical-device acceptance.
