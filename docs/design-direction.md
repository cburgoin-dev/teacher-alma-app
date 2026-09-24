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

A newer gamified roadmap reference is now the preferred **art-direction reference** for future Roadmap refinement and should be stored at:

```text
docs/mockups/courses/roadmap-gamified-reference.png
```

It should guide visual richness, stronger differentiation between lesson states, ambient illustration and emphasis of the current lesson. It is a visual reference rather than a rigid screen specification: existing business rules, progression/access semantics and responsive path geometry remain authoritative.

The earlier roadmap mockup remains useful as historical context and should not be deleted solely because this newer direction is preferred.

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
- Keep the contextual header compact: blue back chevron, topic/unit context and lesson position should consume less vertical space than the learning content.
- Prefer one dominant action per state and avoid stacking several navigation/learning CTAs below the same activity.
- Content blocks should have stronger visual identity instead of rendering every pedagogical element as the same generic card: summaries, examples, video and activities may use specialized compositions while staying inside the same visual system.
- Example/dialogue content may prepare for optional audio controls, but dead/nonfunctional audio controls should not be rendered before real audio data/behavior exists.
- At least one demo lesson should exercise a VIDEO block/placeholder so layout is validated against a more realistic lesson composition.
- Matching should preserve reliable TAP behavior while moving visually toward the connector/node language of the mockup; DRAG can remain deferred until it is stable and worth the complexity.
- Summary and Result should move closer to the existing mockups using only data that is actually available. Do not fabricate rewards, audio, Review actions or other unsupported features for visual parity.
- Result should feel like a deliberate completion moment, not a stack of administrative cards. Premium/access state should be framed as the next lesson/next step being blocked.

## Lessons V3 visual acceptance direction

Physical Android review of Lessons Mobile V2 confirmed the functional flow but also showed that the learning screens still need another dedicated visual-fidelity pass before the vertical is considered visually mature.

The next visual iteration should prioritize fidelity and composition rather than new domain behavior.

### Motion and transitions

- Roadmap initial positioning should preserve the current one-time positioning behavior but avoid a visually abrupt teleport. Prefer a short animated scroll after layout measurement so the learner perceives movement toward the current lesson.
- The lesson loading state should remain lightweight. Avoid showing a prominent `Volver a la ruta` action during a very short loading state.
- A richer branded lesson-entry transition may be explored later, but V3 should not add a fake or over-engineered animation solely for decoration.

### Lesson header

- The lesson header should use a visually deliberate blue chevron/back glyph rather than a generic-looking arrow.
- Topic context, lesson position and progress should remain compact and aligned.
- Do not let header chrome dominate the learning content.

### Content composition

- Use `lesson.description` when available to provide a short supporting description beneath the lesson title instead of inventing copy.
- The current generic lightbulb treatment is not sufficient as a final visual. Icons should be consistent, clean and closer to the mockup language.
- Summary/text blocks should align icon and title as one visual unit rather than making the title appear vertically detached from the icon.
- Example/dialogue content should feel more like a conversation. When the existing payload can support it honestly, use stronger visual differentiation between primary and secondary lines; do not falsely label translation/note content as a second speaker when the contract does not guarantee that meaning.
- VIDEO inside content should use a more compact horizontal media-card composition when practical: preview/poster area plus title/caption information, rather than consuming a large vertical region for an unavailable placeholder.
- Real playback remains a later media capability; V3 may improve the placeholder composition without pretending a player exists.

### Activity density and visual fidelity

- Multiple-choice and fill-blank activities should make better use of the viewport. Increase intentional spacing, tap-target size, radio/selection affordances and visual hierarchy rather than leaving large unused empty regions.
- Hint presentation should feel like a learning aid, with a small visual cue/icon when appropriate, while remaining conditional on a real hint.
- Feedback V2 is considered directionally good; prioritize refinement rather than redesign unless a concrete usability issue appears.
- Matching V2 is close to the desired direction, but connector geometry should visually terminate at the displayed anchor nodes and should avoid jagged/pixelated appearance.
- Demo matching may use at least three pairs when useful for realistic density testing, provided the content remains demo-only and backend contracts are unchanged.

### Summary

- Summary should feel richer than a single generic card.
- Add a concise supporting subtitle when it can be rendered as static interface copy without inventing lesson data.
- Key words/phrases inside real summary points may receive blue emphasis only when derived from the actual point text or known structured content; do not invent semantic labels that the payload does not provide.
- Future sections such as key phrases or completed-activity counts remain desirable, but must not be fabricated until reliable data supports them.

### Result

- Result should use more balanced vertical composition and feel less top-heavy.
- Course progress should use available horizontal space cleanly and avoid overly administrative copy.
- Future links such as `Ver mi progreso` should only appear once the real Progress destination exists.
- Preserve current first-attempt score wording and Premium/access semantics.

### Iconography

Lessons should stop accumulating one-off placeholder-looking icons. Reuse a small coherent icon set for:
- back;
- concept/summary;
- dialogue/example;
- fill blank;
- hint;
- matching;
- completion;
- video/media.

Prefer the project's existing icon capabilities or lightweight vector/SVG treatment over introducing a disproportionate dependency.

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


## Lessons high-fidelity implementation direction

Mobile Lessons V3 validated the interaction architecture but also confirmed that visual fidelity is now constrained by content semantics more than by basic component styling.

Before another broad visual-only pass:

1. implement/sanitize the richer content structures in `docs/lesson-content-contract-v2.md`;
2. seed representative dialogue/context/summary/media metadata;
3. verify public payloads;
4. then perform the next mobile high-fidelity pass.

Visual targets for that pass:

- reproduce approved mockup icon treatments closely instead of substituting generic placeholder-like glyphs when a custom/vector asset is justified;
- use structured dialogue rows, speaker labels and optional audio only from real payload data;
- use colorful/representative matching imagery rather than monochrome development assets;
- keep the shared activity family coherent across Multiple Choice, Fill Blank and Matching;
- make Summary and Result deliberate product moments, not generic data cards.

A small reusable contextual-header component should be preferred over duplicating Lesson-specific back-chevron code across nested screens.
