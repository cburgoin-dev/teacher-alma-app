# Gamification semantics v1

**Status:** conceptual checkpoint / pre-implementation draft  
**Scope:** Gamification v1  
**Branch:** `feature/gamification-v1`

This document preserves the product decisions agreed before implementation begins. It is intentionally more precise than meeting notes, but it is **not yet the final implementation contract**. Rewards, prices, edge cases and API/data-model details still need a dedicated refinement pass before backend work starts.

## 1. Product intent

Gamification should reinforce learning, consistency and a sense of progress without becoming the main purpose of the product.

Core principles:

- Academic performance and gamification rewards are separate concepts.
- Streak rewards consistency, not correctness.
- Coins should reward durable progress and selected habit goals.
- Coins must have real uses; they should not exist only as a decorative counter.
- Coins must not become a second paywall for learning.
- A learner's ability to receive explanations, feedback, translations, audio or other essential pedagogical support must not depend on their coin balance.
- The economy should avoid infinite farming, circular "earn more coins to earn more coins" mechanics and punitive design.
- Gamification should remain lightweight enough for the MVP and for a single-developer project.

## 2. Streak

### 2.1 Meaning

The streak represents consecutive **learning days**.

It does not represent:
- score,
- perfection,
- number of exercises completed,
- number of lessons completed in a day.

A learner should be able to keep a streak even when a Unit Challenge is completed unsuccessfully, because the learner still studied.

### 2.2 Valid learning events

The following completed experiences are intended to count as a valid learning event for streak purposes:

- first completion of a Lesson;
- completed Lesson Replay;
- completed Unit Challenge, whether passed or failed;
- completed Review session;
- completed Practice session once Practice exists.

The following do not count:

- opening a Lesson;
- opening Review or Practice without completing a session;
- navigating Courses/Roadmap;
- opening content without a completed learning session;
- individual internal activity interactions on their own.

### 2.3 Daily behavior

- A streak may advance or be maintained at most once per local learning day.
- Multiple valid learning events during the same day do not add multiple streak days.
- Streak is based on a user-relevant local date, not directly on UTC.
- Backend timestamps may remain UTC, but the effective `learningDate` must be derived using the applicable user timezone.

Exact timezone-change/travel behavior remains to be defined before implementation.

## 3. Daily Goal

Daily Goal is distinct from streak:

- **Streak:** low-friction minimum for maintaining the learning habit.
- **Daily Goal:** a more demanding daily target that grants a tangible reward.

### 3.1 Configurable difficulty

The user should be able to choose a simple preset, initially conceptualized as:

- Casual
- Normal
- Intense

Exact targets are not finalized yet.

Each preset may provide a different coin reward, proportional to the required effort. Exact values such as `5 / 10 / 15` are illustrative only until the overall economy is calibrated.

### 3.2 Progress unit

Daily Goal progresses through completed **learning sessions/events**, not through every internal Activity.

Candidate events:

- Lesson completion;
- Lesson Replay completion;
- Unit Challenge completion;
- Review session completion;
- Practice session completion.

Each eligible completed session normally contributes one unit toward the goal.

### 3.3 Reconfiguration during the day

- The user may change Daily Goal difficulty during the same day while that day's goal has **not yet been completed/rewarded**.
- Existing progress is evaluated against the newly selected target.
- Once the Daily Goal has been completed and its reward granted, no second Daily Goal reward may be earned that day.
- Changes made after completion apply starting with the next learning day.

The system must prevent reward duplication from changing difficulty after completion.

### 3.4 Reward

- Maximum one Daily Goal coin reward per learning day.
- Daily Goal is expected to be the main renewable source of coins in the initial economy.
- Reward values must be configurable/balanceable rather than deeply hardcoded.

## 4. Coins

### 4.1 Meaning

Coins are an internal gamification currency.

They should primarily represent:

- durable learning progress;
- consistency;
- selected challenges/milestones.

They should not determine the quality of learning support.

### 4.2 Unique reward sources

Candidate one-time or progression-bound sources:

- first Lesson completion;
- modest bonus for a perfect first score, if retained after balancing;
- first Unit Challenge completion;
- first qualifying Unit Challenge pass;
- Course completion milestone;
- selected streak/progression milestones.

A reward tied to a unique progression event must be grantable only once for the relevant user/content/event.

### 4.3 Renewable reward sources

Initial intended renewable sources:

- Daily Goal reward;
- Streak Challenge reward;
- future controlled Practice-related rewards if needed.

Practice does not have to generate direct coins if it already contributes to Daily Goal. Avoid unnecessary duplicate reward streams.

### 4.4 Actions that do not directly award coins

- Lesson Replay;
- repeated Unit Challenge runs;
- individual activity attempts;
- opening/navigating content;
- ordinary Review sessions, unless a future rule explicitly changes this.

Replay may still contribute to streak and Daily Goal while giving no direct coin reward.

### 4.5 Anti-farming

The economy must avoid infinite repeatable rewards.

Required direction:

- first-completion rewards are unique;
- replays do not directly print coins;
- Daily Goal rewards at most once per learning day;
- reward mutations should be idempotent;
- reward creation should be tied to durable server-side events, not client navigation;
- no reward should depend on repeated taps or repeated completion callbacks.

## 5. Coin ledger

The source of truth should be auditable.

Prefer a transaction/ledger model conceptually similar to:

```text
+ LESSON_FIRST_COMPLETION
+ PERFECT_FIRST_RESULT
+ UNIT_CHALLENGE_FIRST_COMPLETION
+ UNIT_CHALLENGE_FIRST_PASS
+ DAILY_GOAL
+ STREAK_CHALLENGE
- STREAK_PROTECTOR_PURCHASE
- VEHICLE_PURCHASE
```

The exact schema is not yet defined.

A simple mutable `user.coins` balance should not be the only durable source of truth. A cached balance may later exist for efficiency, but transactions should explain why the balance changed.

## 6. Coin uses

Coin uses should prioritize **protection, personalization and lightweight challenges**, not essential learning support.

### 6.1 Streak Protector

Approved direction:

- purchasable with coins;
- consumable inventory item;
- used automatically when a missed eligible day would otherwise break a streak;
- limited stock is desirable;
- exact price and maximum stock remain open.

The learner should not need to enter the app on the missed day to manually activate it.

Exact behavior for multiple missed days remains to be defined.

### 6.2 Roadmap vehicles

Vehicles are the primary cosmetic direction currently favored for v1/vNext.

The Roadmap already uses a vehicle/bus as the learner's visual position indicator, making this cosmetic visible during normal use.

Vehicle cosmetics should feel materially different rather than being trivial recolors.

Examples of direction, not committed catalog:

- classic London double-decker;
- black cab;
- classic Mini;
- vintage bus;
- retro van;
- seasonal/special vehicle.

Some cosmetics may be bought with coins and others may be milestone unlocks.

### 6.3 Milestone unlocks

Not every cosmetic should require coins.

Examples:

- complete a course -> commemorative cosmetic;
- reach a meaningful streak milestone -> exclusive vehicle/badge;
- complete a specified progression milestone -> unlock.

This gives cosmetics meaning beyond being shop inventory.

### 6.4 Future profile cosmetics

Possible later additions:

- avatar frames;
- badges;
- profile accents;
- lightweight completion effects.

These are not required for Gamification v1 until Profile provides enough visible surfaces for them to have value.

### 6.5 Themes

Full Roadmap/app themes are **not currently favored for v1**.

Reason:

- a strong Roadmap-only night/day theme may visually clash when entering the existing light Courses/Lesson/Review flows;
- making themes coherent across the whole app substantially increases design and accessibility cost.

Keep this as future exploration rather than an initial Shop requirement.

### 6.6 Paid hints / pedagogical help

Do **not** make essential hints or learning support depend on coins.

Unit Challenge v1 remains without hints.
Review v1 remains without hints.

Lesson help should not become frustrating because the learner lacks coins.

Extraordinary assistance could be reconsidered later only if it clearly does not degrade learning for users with low balances.

## 7. Inventory

The domain should be capable of distinguishing at least:

### Consumables

Example:
- Streak Protector

Characteristics:
- quantity;
- consumed through a defined rule;
- may have a maximum stock.

### Permanent/equippable cosmetics

Example:
- Roadmap vehicle

Characteristics:
- owned once;
- may be equipped/unequipped;
- should not be repurchased after ownership.

Acquisition may conceptually be:

- `BUY` with coins;
- `UNLOCK` through a milestone.

Exact schema and enums remain to be designed.

## 8. Streak Challenges

Initial direction:

- optional habit challenge;
- only one active challenge at a time for MVP;
- objective is to maintain qualifying learning days for a configured period;
- successful completion grants coins;
- no required coin wager in v1.

Potential durations later include 7, 14 or 30 days, but the initial implementation should remain simple.

A wager model such as "spend X coins and receive X + bonus after success" is deferred until the basic economy is proven useful.

## 9. End-of-content behavior

The economy must continue to function when a learner temporarily has no new course content.

A learner should still be able to:

- maintain streak through legitimate Replay/Review/Practice;
- progress toward Daily Goal through legitimate completed learning sessions;
- earn the renewable Daily Goal reward;
- participate in suitable habit challenges.

This prevents the wallet and streak from becoming unusable merely because available courses have been completed.

Replay still does not directly award coins.

## 10. Profile relationship

Profile is a likely home for lightweight learner preferences and gamification settings, including:

- Daily Goal selection;
- basic learner/account information;
- learning preferences such as translation behavior when that preference is formally defined;
- future avatar/frame/badge configuration;
- potentially equipped cosmetic/vehicle access.

Gamification v1 should not require a complex social profile.

## 11. Explicitly outside Gamification v1

Do not implement as side effects of this vertical:

- Ads / sponsors;
- real-money coin purchases;
- loot boxes or randomized paid rewards;
- hearts/lives penalties;
- another XP currency;
- competitive leagues/leaderboards;
- social/friends systems;
- global app themes;
- complex avatar builders;
- mascot customization;
- paid access to essential pedagogical help;
- a large Shop catalog;
- reward multipliers whose main purpose is to generate still more coins.

### Ads

Ads remain a separate monetization decision. Alma has discussed the possibility of free users producing revenue through ads/sponsors, but placement, eligibility, consent/privacy, provider and Free/Premium behavior must be designed as a separate monetization vertical.

### Real-money coin purchases

Deferred.

The economy should first prove that coins have sufficient useful sinks and healthy balance. Real-money coin purchases are not necessary for Gamification v1 and should not be introduced merely because the wallet exists.

## 12. Current v1 candidate Shop

A deliberately small first catalog could contain:

- default Roadmap vehicle: free;
- several materially distinct purchasable vehicles;
- Streak Protector;
- milestone-only cosmetic(s);
- Streak Challenge as a reward mechanic rather than a Shop purchase.

The goal is not to fill a store with arbitrary items. A few meaningful items are preferable to a large low-value catalog.

## 13. Calibration strategy

Do not choose coin amounts because a number merely "looks right".

Calibrate the economy by expected learner effort:

- Daily Goal reward = small recurring reward;
- Streak Protector = several normal days of saving, not trivial and not punishing;
- simple vehicle = meaningful short-term saving goal;
- more special vehicle = longer-term saving goal;
- milestone-exclusive item = no coin price.

Once desired effort bands are agreed, derive concrete rewards and prices from them.

## 14. Open decisions before implementation

Still require explicit resolution:

- exact Daily Goal targets for Casual / Normal / Intense;
- exact Daily Goal reward amounts;
- Lesson/Unit Challenge reward amounts;
- whether perfect-result bonus remains;
- exact Course/milestone rewards;
- Streak Protector price and stock limit;
- exact behavior for multiple missed days;
- timezone changes and travel;
- initial Streak Challenge duration/reward;
- concrete initial vehicle catalog;
- vehicle prices;
- whether Review/Practice ever receive any direct coin reward;
- exact rules for Course-completion and streak milestone cosmetics;
- Profile surface required by Gamification v1;
- final data model, database schema and API contracts.

## 15. Implementation sequencing

When Unit Challenge v1 is finished and this vertical officially starts:

1. Reconcile this branch with the finalized Unit Challenge/base branch.
2. Refine this document into an implementation-ready semantic contract.
3. Update affected business rules/screens docs.
4. Define data model/database schema.
5. Define API contracts and idempotency requirements.
6. Implement backend Gamification v1.
7. Integrate mobile presentation into Home/Results/Profile/Roadmap as supported by real data.
8. Implement the smallest useful Shop/inventory surface.
9. Physically validate reward feedback and economy UX.
10. Only then evaluate additional cosmetics, monetization or Ads.
