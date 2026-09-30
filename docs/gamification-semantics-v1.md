# Gamification semantics v1

**Status:** product semantics refined / ready for domain and API design  
**Scope:** Gamification v1  
**Branch:** `feature/gamification-v1`

This document is the product-semantic source of truth for Gamification v1. It defines what the system means and how the core mechanics behave before database schema and API contracts are designed.

Concrete persistence structures, endpoint shapes and implementation details are intentionally deferred to the technical contract pass.

## 1. Product intent

Gamification exists to reinforce learning consistency and make progress feel rewarding without becoming the main purpose of the product.

Core principles:

- **Streak is the primary gamification mechanic.**
- Daily Goal supports a stronger daily learning habit than the minimum required to maintain streak.
- Coins are a **lightweight consistency resource**, not a broad virtual economy.
- Academic performance and gamification are related but distinct concepts.
- Coins may reward durable progress, selected performance milestones and habit goals.
- Coins must have a real purpose; do not add sinks only to justify the currency.
- Gamification must not become a second paywall for learning.
- Essential explanations, feedback, translations, audio, normal hints or other pedagogical support must not depend on coin balance.
- Real-money coin purchases are outside v1.
- The economy must avoid infinite farming and repeated callbacks generating rewards.
- The system should remain small enough for an MVP and a single-developer project.

## 2. Streak

### 2.1 Meaning

A streak represents consecutive **learning days**.

It represents consistency, not:

- score;
- perfection;
- number of internal exercises completed;
- number of sessions completed in one day.

A learner can maintain a streak even if a completed Unit Challenge is failed, because the learner still completed a legitimate learning session.

### 2.2 Qualifying learning events

A completed experience counts as a qualifying learning event for streak purposes when it is one of:

- first Lesson completion;
- completed Lesson Replay;
- completed Unit Challenge, whether passed or failed;
- completed Review session;
- completed Practice session once Practice exists.

The following do **not** count:

- opening a Lesson;
- opening Review or Practice without completing the session;
- navigating Home, Courses or Roadmap;
- viewing content;
- answering one individual Activity;
- abandoning an incomplete session.

### 2.3 Daily behavior

- Streak advances at most once per local learning day.
- Additional qualifying sessions on the same local day do not add more streak days.
- Backend event timestamps may remain UTC.
- The effective `learningDate` is derived using the applicable user timezone.
- A timezone change affects future learning-date derivation only; already-recorded learning dates are not retroactively rewritten.
- Streak, Daily Goal and missed-day evaluation operate from durable recorded learning dates rather than client-side counters.

Example:

```text
Sep 30: complete Lesson     -> streak becomes 12
Sep 30: complete Review     -> streak remains 12
Oct 01: complete UC         -> streak becomes 13
```

## 3. Streak Protector

The Streak Protector is the normal preventive streak utility.

### 3.1 Rules

- Consumable inventory item.
- Purchased with coins.
- Price: **50 coins**.
- Maximum stock: **2**.
- Each Protector covers exactly **one missed local learning day**.
- It is consumed automatically when a missed day would otherwise break the streak.
- The learner does not need to activate it on the missed day.
- Multiple consecutive missed days may consume multiple Protectors if sufficient stock exists.
- A protected day preserves streak continuity but does **not** become a real learning day.
- A protected day does not progress Daily Goal and does not grant rewards.

Example:

```text
Monday    studied
Tuesday   missed -> Protector consumed
Wednesday studied -> streak continues
```

If two consecutive days are missed and two Protectors are owned, both may be consumed. If only one is owned, the first missed day is protected and the next uncovered missed day breaks the streak.

## 4. Streak Repair

Streak Repair is an exceptional recovery action after the streak has already broken.

It is intentionally different from Protector:

- Protector is preventive and stored.
- Repair is contextual, corrective and more expensive.

### 4.1 Rules

- Repair is **not** an inventory item.
- Cost: **120 coins**.
- It appears only when the learner is eligible to restore a recently broken streak.
- Availability window: **24 hours** from the detected eligible break.
- Successful Repair cooldown: **14 days**.
- Repair is available only for a break caused by **one uncovered missed local learning day**.
- A longer uncovered absence is not repairable in v1.
- Repair restores streak continuity; it does not fabricate a learning session.
- Repair does not progress Daily Goal.
- Repair does not grant coins or other rewards.
- Repair does not alter historical learning dates.

A Repair should therefore feel like an occasional safety net, not a routine way to maintain streak.

## 5. Daily Goal

Daily Goal is distinct from streak:

- **Streak:** minimum consistency condition: at least one qualifying learning session in a local learning day.
- **Daily Goal:** a configurable, more demanding target that grants coins once per day.

### 5.1 Presets

Initial v1 presets:

| Preset | Required qualifying sessions | Reward |
| --- | ---: | ---: |
| Casual | 1 | 5 coins |
| Normal | 2 | 10 coins |
| Intense | 3 | 15 coins |

**Normal** is the default preset for a new learner unless onboarding later introduces an explicit choice.

### 5.2 What progresses Daily Goal

Each completed qualifying session contributes one unit:

- Lesson completion;
- Lesson Replay completion;
- Unit Challenge completion;
- Review session completion;
- Practice session completion once Practice exists.

Individual Activities do not count separately.

Example:

```text
Normal goal = 2 sessions

Lesson completion       -> 1 / 2
Review session complete -> 2 / 2 -> reward granted
```

### 5.3 Reconfiguration during the day

- The learner may change preset during the same day while that day's Daily Goal reward has not yet been granted.
- Existing qualifying-session progress is evaluated against the newly selected target.
- If the new target is already satisfied, that target's reward is granted once.
- After the Daily Goal has been completed and rewarded, later preset changes take effect on the **next local learning day**.
- Maximum: **one Daily Goal reward per local learning day**.

This prevents reward cycling such as Casual -> Normal -> Intense to collect multiple rewards.

### 5.4 Reward delivery

- Reward is granted automatically by the backend when the target is first satisfied.
- No required "Claim reward" state exists in v1.
- Reward mutation must be idempotent.
- The UI may celebrate the reward, but visual feedback is not the source of truth.

## 6. Coins

### 6.1 Role

Coins are a small secondary mechanic supporting the primary streak system.

Their v1 purpose is mainly:

- purchasing Streak Protectors;
- paying for an eligible Streak Repair;
- representing selected durable progress and consistency rewards.

Coins do **not** need a large Shop catalog to justify their existence.

If later product evidence shows that learners accumulate coins without meaningful use, the economy may be simplified rather than padded with artificial purchases.

### 6.2 Unique/progression rewards

Initial v1 values:

| Event | Reward | Repeatable? |
| --- | ---: | --- |
| First Lesson completion | +3 | No, per Lesson |
| Perfect first Lesson result | +2 bonus | No, per Lesson |
| First Unit Challenge pass | +8 | No, per Unit Challenge |
| Perfect first Unit Challenge completed run | +3 bonus | No, per Unit Challenge |
| Course completion | +20 | No, per Course |

Perfect-result bonuses apply only to the first relevant score-bearing completed attempt. Replays cannot farm perfect bonuses.

A Unit Challenge may be completed unsuccessfully and still count toward streak/Daily Goal. The **first-pass coin reward** is granted only when that Unit Challenge is first passed.

### 6.3 Streak milestones

Initial configured milestones:

| Streak | Reward |
| --- | ---: |
| 7 days | +10 |
| 14 days | +15 |
| 30 days | +30 |
| 60 days | +50 |
| 100 days | +75 |

Milestone rewards are unique and should be data/config driven so later milestones can be added without redesigning the core domain.

### 6.4 Renewable reward sources

The main renewable source in v1 is:

- Daily Goal reward.

Future controlled sources may include:

- Streak Challenges;
- selected Practice-related mechanics if the economy later needs them.

Practice and Review already contribute to Daily Goal, so they do not need direct coin rewards by default.

### 6.5 Actions with no direct coin reward

- Lesson Replay;
- repeated Unit Challenge runs;
- ordinary Review sessions;
- ordinary Practice sessions;
- individual Activity attempts;
- opening or navigating content;
- Protector use;
- Repair use.

Replay may contribute to streak and Daily Goal while granting no direct coins.

### 6.6 Anti-farming and idempotency

Required behavior:

- first-completion rewards are unique;
- first-pass rewards are unique;
- perfect bonuses are unique;
- Course and milestone rewards are unique;
- Daily Goal rewards at most once per local learning day;
- reward creation is tied to durable server-side events;
- repeated requests, callbacks or taps must not duplicate rewards;
- client navigation never directly grants currency.

## 7. Coin ledger

Coin history must be auditable.

The ledger, not a mutable UI counter alone, should explain balance changes.

Conceptual transaction reasons include:

```text
+ LESSON_FIRST_COMPLETION
+ LESSON_FIRST_PERFECT
+ UNIT_CHALLENGE_FIRST_PASS
+ UNIT_CHALLENGE_FIRST_PERFECT
+ COURSE_COMPLETION
+ DAILY_GOAL
+ STREAK_MILESTONE

- STREAK_PROTECTOR_PURCHASE
- STREAK_REPAIR
```

The final schema may use different enum names, but equivalent durable attribution is required.

A cached balance may exist for efficiency if technical design justifies it, but reward/spend history remains auditable.

## 8. Pedagogical boundary

Gamification must not interfere negatively with learning.

### 8.1 Coin-gated learning support

Do **not** require coins for:

- explanations of why an answer is correct or incorrect;
- essential feedback;
- translations;
- normal pedagogical hints;
- Review;
- access to already-entitled learning content;
- Unit Challenge result explanations.

A future optional power-up may be considered only if it provides convenience without withholding the learning support needed to understand the material.

Example of a possible future power-up:

- eliminate one incorrect multiple-choice option.

Even such power-ups are **not part of Gamification v1**.

### 8.2 Unit Challenge feedback

Unit Challenge v1 remains without immediate correct/incorrect feedback during the challenge.

A future Result-level action such as **Review answers** may show concise explanations after the run. That is a pedagogical Unit Challenge enhancement, not a coin mechanic and not part of this vertical.

## 9. Monetization boundary

Gamification v1 is not a monetization layer.

Explicitly outside v1:

- buying coins with real money;
- paid pedagogical help;
- loot boxes;
- randomized paid rewards;
- hearts/lives that block learning;
- reward multipliers whose primary purpose is to generate more currency.

Current monetization direction remains separate:

- subscription/Premium access;
- potentially controlled Ads for eligible free users in a dedicated monetization vertical.

Individual course sales are not assumed by Gamification v1.

## 10. Streak Challenges

A 7-day streak challenge has existing visual exploration, but it is **deferred from the initial Gamification v1 implementation**.

Future direction:

- optional habit challenge;
- maintain qualifying learning days for the configured duration;
- successful completion may grant coins or another lightweight reward;
- no coin wager is required for initial implementation.

Do not implement a circular "spend coins mainly to earn more coins" loop merely to create another sink.

## 11. Cosmetics and broader Shop

Roadmap vehicle cosmetics, profile cosmetics and global themes are not required for Gamification v1.

Reasons:

- current product feedback does not indicate strong value in vehicle cosmetics;
- Profile does not yet need a cosmetic system;
- themes add disproportionate visual/accessibility scope;
- artificial cosmetics should not be invented solely to justify the currency.

The domain does not need a large permanent Shop catalog in v1.

## 12. UI ownership

Gamification is a cross-cutting layer, not a standalone primary navigation section.

### 12.1 Home

Home is the daily-status surface.

It should eventually be able to present:

- current coin balance;
- current streak;
- Daily Goal progress and preset;
- Continue Learning;
- Review availability when relevant;
- Practice when available.

The Daily Goal card should use qualifying-session semantics such as:

```text
Meta diaria - Normal
1 de 2 sesiones
```

rather than counting internal exercises.

### 12.2 Lesson / Unit Challenge Result

Result screens may present server-backed reward feedback such as:

- coins earned in the completed event;
- perfect bonus when applicable;
- current streak;
- whether streak advanced on this learning day;
- Daily Goal completion/reward if triggered.

A second session on the same day must not imply that streak increased again.

### 12.3 Progress

Progress is the natural deeper gamification/progress surface.

Candidate data includes:

- current streak;
- longest streak;
- weekly learning-day view;
- current Protector stock;
- next streak milestone;
- earned milestones/achievements;
- course progress;
- Review/strength information as supported by their own domains.

### 12.4 Profile

Profile is the likely configuration surface for:

- Daily Goal preset;
- basic account information;
- later learning preferences such as translation behavior;
- future preferences as formally defined.

A dedicated Settings screen is not required solely for Gamification v1.

### 12.5 Shop / protection screen

Shop does **not** receive a primary bottom-navigation tab in v1.

The existing visual Shop exploration can be reused as a nested screen opened, for example, by tapping the coin balance or a protection action.

Initial useful content can be intentionally small:

- coin balance;
- Streak Protector purchase and current stock;
- streak/protection explanation.

Streak Repair is contextual and appears only after an eligible break rather than as a permanently purchasable Shop item.

A large store is not required.

## 13. End-of-content behavior

Gamification must remain usable when the learner temporarily has no new course content.

Legitimate Replay, Review and future Practice can still:

- maintain streak;
- progress Daily Goal;
- enable the renewable Daily Goal reward.

They do not directly print additional progression coins.

This is particularly important while the product initially contains a small course catalog.

## 14. Explicitly outside Gamification v1

Do not implement as side effects of this vertical:

- Ads / sponsors;
- real-money coin purchases;
- individual course monetization logic;
- competitive leagues or leaderboards;
- social/friends systems;
- global themes;
- vehicle/cosmetic Shop catalog;
- complex avatar builders;
- mascot customization;
- paid essential hints or explanations;
- a separate XP currency;
- hearts/lives penalties;
- the 7-day challenge unless explicitly promoted into scope later;
- a dedicated Shop bottom-tab item.

## 15. Technical requirements to preserve in contract design

The upcoming domain/database/API design must preserve these semantic properties:

- backend authority for streak, Daily Goal, rewards, inventory and spending;
- UTC event timestamps plus durable local-learning-date semantics;
- idempotent event/reward processing;
- auditable coin ledger;
- unique reward constraints;
- Protector stock cap;
- automatic Protector consumption;
- contextual Repair eligibility, 24-hour window and 14-day cooldown;
- one Daily Goal reward per local learning day;
- safe preset changes;
- no client-calculated authoritative balance or streak;
- no reward revocation merely because a later replay has a worse score.

## 16. Remaining work before implementation

Product semantics are sufficiently refined to begin technical design.

The next pass should define:

1. domain entities and invariants;
2. Prisma/database schema;
3. timezone representation and learning-date derivation mechanics;
4. ledger and idempotency keys;
5. event integration with Lesson, Review and Unit Challenge completion;
6. Protector auto-consumption timing;
7. Repair eligibility evaluation;
8. Daily Goal state/read model;
9. API contracts;
10. minimum mobile data contracts for Home, Result, Progress, Profile and nested Shop/protection surfaces.

Profile does not yet have a finalized mockup. That does not block backend/domain work because only its configuration responsibilities are defined here.

## 17. Implementation sequence

1. Define domain model and invariants from this document.
2. Define database schema and migration strategy.
3. Define API/read contracts and idempotency behavior.
4. Implement and test Gamification backend.
5. Integrate reward/streak events with existing Lesson, Review and Unit Challenge flows.
6. Implement mobile gamification primitives and nested protection/Shop screen.
7. Integrate real gamification data into Result surfaces.
8. Integrate Home / Progress / Profile as those verticals are implemented or refined.
9. Physically validate streak, Daily Goal, Protector, Repair and reward UX.
10. Evaluate deferred additions only after the core system is proven.
