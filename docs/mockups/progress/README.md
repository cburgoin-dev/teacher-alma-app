# Progress v1 mockup references

These files are the visual source of truth for Progress Mobile v1. Product behavior and data semantics remain authoritative in `docs/progress-semantics-v1.md` and `docs/progress-api-contract-v1.md`.

## Primary references

Use exactly two primary visual targets:

- `progress-dashboard-primary.png` — main Progress Dashboard.
- `progress-calendar-primary.png` — secondary Activity Calendar screen.

Secondary supporting references (never override the corresponding primary):

- `progress-dashboard-secondary.png` — supporting Dashboard density and real Review copy.
- `progress-calendar-secondary.png` — supporting Calendar navigation, layout and legend.

Do not treat older combined/comparison mockups as an additional contract. If a historical combined image is available to the agent, it is secondary inspiration only. When references disagree, this README plus the semantics/API contract wins.

## Dashboard visual priority

`progress-dashboard-primary.png` is the primary reference for:

- overall hierarchy and card rhythm;
- light/blue/red Teacher Alma visual language;
- course-progress hero treatment;
- reinforcement card composition;
- compact weekly consistency card;
- rounded cards, spacing, icon weight and restrained shadows.

Approved v1 adaptations that override literal mockup copy/data:

- The reinforcement card is real **Review**, not the future Practice engine. Its dominant action is `Ver repaso` and routes to the existing Review flow.
- Review Topic rows are informational in Progress v1; use the real groups/counts returned by `GET /me/progress`.
- Course progress must use the real `completedRequiredNodes`, `totalRequiredNodes` and `percentage` returned by the API. Do not invent lesson/topic totals only because the mockup shows them.
- The weekly strip may use a compact flame treatment for `LEARNED`; `PROTECTED`, `REPAIRED`, `BROKEN` and neutral/future days must remain semantically distinguishable when present.
- Current streak, coins and inventory come from the existing shared Gamification resource, never from Progress-owned duplicated state.
- `Tus fortalezas`, `Tus logros`, achievements, mastery, XP and ranking are not Progress v1 requirements.
- The avatar/character is visual direction only until a real Profile/avatar source exists.

## Calendar visual priority

`progress-calendar-primary.png` is the primary reference for:

- monthly grid density and hierarchy;
- expressive learned-day flame treatment;
- visually connected consecutive continuity days where it improves streak storytelling;
- distinct Protector, Repair and Broken-day treatments;
- today emphasis, subdued future/out-of-month cells and optional compact legend;
- the same Teacher Alma light/blue/red visual family as the Dashboard.

Approved v1 adaptations:

- Activity Calendar is a secondary screen reached from Progress, so Mobile must provide an obvious back affordance and preserve the Progress navigation context. The exact top-header composition may adapt to the app's shared navigation/header primitives rather than copying the mockup literally.
- Calendar business states are exactly `LEARNED`, `PROTECTED`, `REPAIRED`, `BROKEN`; neutral/today/future/out-of-month are presentation concerns defined by the contract.
- Connected streak visuals never merge semantics: a protected or repaired date remains visibly distinct and does not count as a learning day.
- Protector/Repair visuals should reuse existing Gamification/Shop icon language when practical.
- The mockup's streak/inventory summary is optional presentation, not a new Progress API requirement. If shown, it must consume the existing shared Gamification resource and must not add purchase/use controls to Calendar.
- Future-month navigation is disabled beyond the learner's authoritative current local month.

## Fidelity rule

Mockups are visual targets, not business-rule contracts. Aim for high visual fidelity while preserving:

- real API data and null/empty states;
- shared header/navigation behavior;
- accessibility and Android safe areas;
- existing Courses/Roadmap, Review and Gamification ownership boundaries;
- no dead learner-facing controls.

For implementation prompts, explicitly ask the agent to inspect these two image files in addition to the semantics/API docs rather than relying on textual recollection alone.
