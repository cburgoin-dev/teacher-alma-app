# Design Direction

This document records the current visual direction and client feedback. It is intentionally provisional: the product should preserve stable UX/business rules even when visual composition changes during implementation.

## Global visual system

Current direction established across Home, Courses, Lesson and Activities:

- White/light base.
- Blue as the main structural color.
- Red as the primary CTA/accent color.
- Rounded cards and controls.
- Soft shadows and clean spacing.
- Friendly and visually appealing without becoming excessively childish.
- Gamification should come mainly from progress, unlocking, rewards and interaction, not from decorative clutter.
- Avoid unnecessary slogans and repeated motivational phrases.
- Avoid flags as a recurring visual device.
- Prefer Alma's real brand assets as they become available: logo, custom illustrations and potentially a digitalized version of her physical doll/character.

## Navigation chrome

Navigation chrome should support orientation without forcing the same header on every screen.

Current direction:

- Keep the primary bottom navigation visible across the main browsing hierarchy, including Courses, Course Detail and Roadmap.
- Use a richer section/global header on top-level areas when useful.
- Use a simpler contextual header on nested screens, prioritizing back navigation and screen/course context.
- Do not repeat the full logo, notification control, coin counter and streak counter on every nested screen by default.
- Global counters/actions should only be rendered when their real state is available; mockup values are illustrative and must not be fabricated for visual fidelity.
- Lesson/Activity/Summary/Result belong to a more focused learning flow and may intentionally reduce or hide global chrome.

This chrome model should remain consistent even if individual mockups show slightly different combinations of logo, counters or bottom navigation.

## Home

Home is currently one of the most mature visual directions.

Client feedback has been positive overall. The current visual family should act as an anchor for the rest of the product.

Important qualities to preserve:

- Strong visual hero.
- Images/illustrations are welcome when they support the content.
- Clear hierarchy.
- One primary next action.
- Repaso and Meta diaria remain secondary.

## Learning Route / Roadmap

### Current client feedback

The roadmap remains one of the least visually settled screens.

Alma prefers a more clearly **gamified learning path** and referenced:

- Lingopanda.
- Duolingo.
- LingoDeer as an additional useful reference.

Earlier, more roadmap-like/gamified concepts were preferred over the later card/list-heavy variant.

### Stable functional requirements

Visual layout can change, but the roadmap still needs to communicate:

- Course progress.
- Topic/unit grouping.
- Completed lessons.
- Current/recommended lesson.
- Accessible upcoming content.
- Prerequisite locks.
- Commercial/premium locks.
- Clear next action.

Conceptual lesson-node states remain:

- `COMPLETED`
- `CURRENT`
- `AVAILABLE`
- `LOCKED_PREREQUISITE`
- `LOCKED_ACCESS`

### Current preferred visual direction

The roadmap should move closer to the spirit of Lingopanda/Duolingo/LingoDeer while keeping the established Teacher Alma visual system.

Preferred qualities:

- Vertical or zig-zag path.
- Prominent, recognizable nodes.
- Strong sense of progression and unlocking.
- The current node should immediately answer: **what do I do next?**
- Topic/unit sections should remain understandable without turning the route into a conventional list of cards.
- Cards may be used selectively for the current node or expanded information, but should not dominate the entire roadmap.
- The screen should feel visually attractive, playful and motivating enough to encourage repeated use.

### Avoid on the roadmap

- A long conventional list of lesson cards as the primary structure.
- Decorative slogans such as motivational phrases placed around the route.
- Flags as decoration.
- Excessive secondary explanatory text.
- Decorative illustrations that reduce usable path space without helping orientation.
- Making every lesson a large information card.

### Current mockup status

No single roadmap mockup should currently be treated as final.

The latest exploration produced several useful directions. The more gamified alternatives are preferred for future refinement, but the final composition should be validated during frontend implementation with Alma.

The frontend should therefore avoid coupling business logic to one particular path geometry or card layout.

## Lesson and learning flow

Lesson, Activity, Summary and Result are high-priority experience areas because learners are expected to spend a large share of their time there.

Current principles:

- Focused learning UI.
- Minimal distractions/global chrome.
- Hybrid lesson consumption: grouped explanatory content plus focused activities.
- Strong feedback and progress visibility.
- Visual polish matters more here than in low-frequency utility screens.

## Implementation principle

Backend/domain models should describe stable product facts, not visual layout.

For example, the backend can expose:

- lesson state;
- order;
- progress;
- access entitlement;
- current lesson;
- completed lessons;
- locked lessons.

The frontend decides whether those facts are rendered as:

- circular nodes;
- zig-zag path;
- roadmap sections;
- temporary cards;
- another validated layout.

This separation should allow Alma-driven visual changes without forcing major backend rewrites.
