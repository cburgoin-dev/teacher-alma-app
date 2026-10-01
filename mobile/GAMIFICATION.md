# Mobile Gamification — v1 functional / v2 visual fidelity

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

The v2 Shop reference is archived unchanged at `docs/mockups/gamification/shop.png`.
It supplies visual direction only: its old prices, 7-day challenge, mascot and
bottom Shop tab are not implemented.

## V2 visual fidelity (2026-10-01)

This continues the accepted v1 checkpoint and preserves the partial local v2 edits
from the interrupted pass. Resource, API, timezone, retry keys and navigation are
unchanged. No backend or demo seed changes.

References inspected and used, without duplicating existing files:

- `docs/mockups/courses/courses-catalog.png`: left brand/right coin and streak,
  compact rhythm and separation from the catalog title.
- All three `docs/mockups/results/lesson-result-{perfect,standard,review}.png`:
  warm coin and coral flame tiles; distinct perfect/standard/Review treatment.
- `docs/mockups/unit-challenge/unit-challenge-result.png`: retain challenge hero,
  circular score and pass state before the secondary reward layer and route CTA.
- `docs/mockups/gamification/shop.png`: illustrated tinted product face, white
  price/action footer, rounded shell and subtle shadow. The archived PNG SHA256 is
  `0833DC7D90A0576C343171A39DD4DC0C5EA221D9CBA8CDC85C0EDD4ADC269D60`, matching the attachment.

**Logo/header:** the official available mark is vertical, unlike the mockup's
wordmark. The existing raster derivative is preserved without crop, distortion or
redrawing. An opt-in 54×40dp contain box removes the extra bottom margin in the
app header; the default logo presentation elsewhere is unchanged. Coins retain a
48dp touch target around a smaller visual pill; streak stays display-only. Warm
layered coin/flame vectors replace outline icons. Numbers are exact, scalable,
and can wrap rather than being truncated. Courses changes only header spacing.

**Shop:** a compact balance and current streak lead into a short editorial hero.
Protector has a blue illustrated shield/fire face, real `Tienes X / 2` stock and a
50-coin price beside the existing coral purchase button. Full inventory uses a
disabled gray CTA. Zero/low balance receives a small learning hint, but purchase
validation remains with the backend. Repair occupies the second slot only when
eligible: warm shield/restore illustration, prior days, returned price and real
expiration. Large fonts stack artwork/text and price/action vertically. Loading
uses muted artwork and a spinner, success a compact check strip, errors a small
message rail; ambiguous retries retain their original action. There is no fake
second product, new mascot, or Shop tab.

**Results:** shared reward/streak tiles replace the text card, followed by compact
reward rows and a Daily Goal progress track. `coinsEarned` remains operation-only.
The DAILY_GOAL breakdown row is represented once in the goal footer, marked as
included in the earned total; zero `rewardEarnedNow` renders no reward badge.
The track caps visually at 100%, while the exact backend progress/target stays
visible and accessible. No extra streak day is implied when `advancedToday=false`.
Perfect Lesson uses a warmer coin tile; standard is positive; pending Review,
Challenge and final Review use a quieter secondary treatment. Hero, score,
progress, next step, Review action, CTAs and completion motion stay in place.
Replay still returns before the Gamification component; intermediate Review items
never display it. No animations were introduced.

**Visual gaps:** no Android device was connected for this pass. Component checks
cover branching/handlers and responsive style selection, not native text layout,
TalkBack or touch acceptance. Narrow-device/large-font screenshots and physical
scroll/CTA checks remain pending. The official vertical logo and the absence of
an approved reusable mascot intentionally differ from the reference illustrations.
Daily Goal settings, Home/Progress/Profile, Roadmap header, Practice, Streak
Challenge and the previously deferred commercial/social scope remain deferred.

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
node node_modules/expo/bin/cli export --platform android --output-dir dist/gamification-v2-check
git diff --check
```

Tests exercise HTTP payloads, synchronization/deduplication, spending success and
ambiguous retries, contextual Repair, component output/handlers, optional result
deltas, Replay exclusion and root navigation. Native primitives are stubbed in
component tests; they do not prove Android touch/layout/TalkBack behavior.

V2 validation on 2026-10-01: TypeScript PASS; focused Gamification 22/22; full
Mobile suite 130/130; Android production export PASS (1064 modules, Hermes 2.4 MB)
at `mobile/dist/gamification-v2-check`; `git diff --check` PASS. The additional
component checks cover full long numbers, 48dp touch targets, adaptive stacking,
zero balance, loading/operation states, Lesson emphasis and a single Daily Goal
reward detail. No device was connected; these checks do not establish native
visual fidelity or physical acceptance.

V1 validation on 2026-09-30: TypeScript PASS; focused Gamification 20/20; full Mobile
suite 128/128; Android production export PASS (1065 modules, Hermes 2.4 MB);
`git diff --check` PASS. Expo needed execution outside the Windows sandbox because
its local export log returned EPERM. Export output is ignored under `mobile/dist/`.

Physical acceptance still required on the existing configured demo environment:
open Courses, enter Shop via coins, buy with available balance, return/back, check
stock cap and network retry, then complete Lesson/Challenge/Review and verify real
result deltas. Repair requires a genuinely eligible backend candidate; Mobile does
not fabricate one. Also check narrow widths/large fonts, safe areas and hardware
Back. This pass does not reset/seed the demo or claim physical-device acceptance.
