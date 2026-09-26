# Lessons Content Contract v2

This document defines the next evolution of lesson/content payloads required to support a higher-fidelity mobile learning experience without coupling business rules to one screen layout.

It refines Lessons v1 rather than replacing its core progression rules.

## Goals

- Preserve the current Course -> Topic -> Lesson model.
- Preserve existing lesson progression, completion, scoring, Review and access semantics.
- Give the mobile client enough semantic content to reproduce the approved lesson/activity mockups with high visual fidelity.
- Prefer extending existing JSONB-backed content/configuration before introducing new relational tables.
- Keep new fields backward-compatible and optional where practical.
- Add media metadata now, while deferring actual audio/TTS generation/provider decisions.

## Non-goals

This contract does not define:

- speaking/pronunciation recognition;
- real-time AI audio generation;
- payment/billing behavior;
- Review-session behavior;
- gamification rewards;
- restart-vs-resume lesson semantics;
- admin/CMS workflows.

## Storage strategy

The current PostgreSQL model already supports this evolution:

- `lesson_blocks.content jsonb`
- `activities.config jsonb`

The preferred implementation is therefore to enrich validated JSON shapes and API sanitization/serialization first.

A schema migration is not required solely to add the structures below unless implementation later proves that relational querying/indexing is needed.

## Shared media shape

Where audio is supported, use a simple optional media descriptor rather than hard-coding a provider:

```json
{
  "audioUrl": "https://...",
  "audioAlt": "Pronunciation of Nice to meet you"
}
```

`audioUrl` is optional. The mobile client must not render a dead audio control when no playable URL exists.

The future source may be:

- Alma-provided recordings;
- pre-generated TTS;
- curated third-party/licensed media.

Do not call an AI/TTS service on every playback request as part of this contract.

---

## TEXT v2

Lessons v1 allows:

```json
{
  "type": "TEXT",
  "title": "En resumen",
  "body": "Usa Nice to meet you cuando conoces a alguien."
}
```

V2 preserves `body` for backward compatibility and adds optional structured runs when pedagogical emphasis matters:

```json
{
  "type": "TEXT",
  "title": "En resumen",
  "body": "Usa Nice to meet you cuando conoces a alguien.",
  "segments": [
    { "text": "Usa " },
    { "text": "Nice to meet you!", "emphasis": "KEY" },
    { "text": " cuando conoces a alguien." }
  ]
}
```

Supported initial emphasis:

- `KEY`

Rules:

- `segments` controls rich rendering when present.
- `body` remains the plain-text fallback/accessibility representation.
- The client must not infer key phrases through regex/string matching.

---

## EXAMPLE v2

The current generic fields remain valid:

- `title`
- `primaryText`
- `secondaryText`
- `note`

V2 adds optional variants.

### DIALOGUE variant

```json
{
  "type": "EXAMPLE",
  "title": "Ejemplos",
  "variant": "DIALOGUE",
  "turns": [
    {
      "speakerLabel": "A",
      "text": "Hi, I'm Sofía. Nice to meet you!",
      "translation": "Hola, soy Sofía. Mucho gusto.",
      "audioUrl": "https://..."
    },
    {
      "speakerLabel": "B",
      "text": "Hello, I'm Daniel. Nice to meet you too!",
      "translation": "Hola, soy Daniel. El gusto es mío.",
      "audioUrl": "https://..."
    }
  ]
}
```

Initial rules:

- `turns` must contain at least one turn when `variant = DIALOGUE`.
- `speakerLabel` is learner-facing content and must be supplied by content configuration; the client must not invent A/B labels.
- `translation` is optional.
- `audioUrl` is optional per turn.
- The mobile client may render dialogue rows/cards closely matching the approved mockup.
- Existing non-dialogue EXAMPLE blocks continue to use the generic v1 renderer.

This avoids incorrectly assuming that every `secondaryText` represents another speaker.

---

## VIDEO v2

The current fields remain sufficient:

- `url`
- `title`
- `posterUrl`
- `caption`

V2 clarifies:

- mobile should use a compact media-card layout when appropriate;
- poster/media preview should receive more visual width than metadata on normal phone layouts;
- no learner-facing copy such as "video not available" is required for development-only demo fixtures;
- if `url` is absent in demo content, a neutral non-interactive preview is acceptable;
- actual playback integration remains a separate media implementation task.

---

# Activity presentation context

The v1 `Activity` contract exposes the exercise prompt/options but is too generic to recreate context-rich mockups.

V2 adds an optional public `context` field to activities.

Supported initial context types:

- `TEXT`
- `DIALOGUE`
- `IMAGE`

The context is presentation/pedagogical content, not the private answer key.

## TEXT activity context

```json
{
  "context": {
    "type": "TEXT",
    "text": "Read the sentence and choose the best answer.",
    "audioUrl": "https://..."
  }
}
```

## DIALOGUE activity context

```json
{
  "context": {
    "type": "DIALOGUE",
    "speakerLabel": "D",
    "text": "Hi, I'm Daniel.",
    "translation": "Hola, soy Daniel.",
    "audioUrl": "https://..."
  }
}
```

This supports the preferred Multiple Choice composition:

- speaker circle/label;
- dialogue bubble;
- optional audio button;
- exercise title/instruction below or above according to the validated mobile composition.

The client must not invent a speaker label if none is configured.

## IMAGE activity context

```json
{
  "context": {
    "type": "IMAGE",
    "url": "https://...",
    "alt": "Two people meeting",
    "caption": "..."
  }
}
```

This allows future Fill Blank activities to display a real contextual image above the sentence, as shown in visual references, without fabricating media.

---

## MULTIPLE_CHOICE v2

Existing fields remain:

- `id`
- `type`
- `prompt`
- `options`

Optional additions:

- `instruction`
- `context`
- `hint` only if pedagogically useful

Example:

```json
{
  "id": "activity-uuid",
  "type": "MULTIPLE_CHOICE",
  "prompt": "¿Qué responderías?",
  "instruction": "Elige la mejor respuesta.",
  "context": {
    "type": "DIALOGUE",
    "speakerLabel": "D",
    "text": "Hi, I'm Daniel.",
    "audioUrl": "https://..."
  },
  "options": [
    { "id": "a", "text": "Nice to meet you!" },
    { "id": "b", "text": "Goodbye!" },
    { "id": "c", "text": "Good night!" }
  ]
}
```

The private correct option remains server-side.

---

## Fill Blank v2

Both `FILL_BLANK_OPTIONS` and `FILL_BLANK_TEXT` may use:

- `instruction`
- `context`
- existing `hint`

The contextual image/dialogue is optional. Do not require every Fill Blank activity to have media.

The visual family should remain consistent with Multiple Choice and Matching even when its central interaction layout differs.

---

## MATCH_WORD_IMAGE v2

No domain-shape change is required for the core matching logic.

Visual/content guidance:

- real/colorful lesson assets are preferred over monochrome development icons when representative imagery is available;
- `images[].url` remains the source;
- `alt` remains mandatory learner/accessibility content;
- demo fixtures may use richer local assets to validate fidelity;
- TAP remains the required MVP interaction.

---

# SUMMARY v2

The v1 SUMMARY shape is too limited for the approved visual direction.

Existing fields remain valid:

- `title`
- `points`

V2 adds:

- `subtitle`
- structured `takeaways`
- `keyPhrases`

Example:

```json
{
  "type": "SUMMARY",
  "title": "Resumen de la lección",
  "subtitle": "Muy bien, aquí tienes lo más importante de esta lección.",
  "takeaways": [
    {
      "text": "Hello inicia una conversación.",
      "segments": [
        { "text": "Hello", "emphasis": "KEY" },
        { "text": " inicia una conversación." }
      ]
    },
    {
      "text": "I'm + tu nombre sirve para presentarte."
    }
  ],
  "keyPhrases": [
    {
      "text": "Nice to meet you!",
      "translation": "Mucho gusto.",
      "audioUrl": "https://..."
    }
  ]
}
```

Rules:

- v1 `points` remains a fallback.
- `takeaways` allows rich emphasis without string heuristics.
- `keyPhrases` is content-author supplied; the frontend must not manufacture phrases from arbitrary lesson text.
- audio controls render only when `audioUrl` exists.

## Activity completion metadata

A Summary screen may show a compact activity-completion indicator only when the backend can derive it reliably for the current lesson state.

Preferred future read payload:

```json
{
  "activityProgress": {
    "completed": 2,
    "total": 2
  }
}
```

Do not infer this from array position or current pointer alone.

The implementation may derive this from lesson blocks/progress/attempts without adding a new persistence table.

---

# Lesson Result v2 metadata

The current completion endpoint already returns academic result, course progress and next lesson.

For high-fidelity Result rendering, extend the response with course metadata:

```json
{
  "course": {
    "id": "course-uuid",
    "title": "Inglés A1",
    "level": "A1"
  }
}
```

This is read/derived metadata only.

It does not alter completion semantics.

Future `Ver mi progreso` navigation should only be exposed once the real Progress destination exists.

---

# Mobile visual-family decision

The preferred shared activity language for the MVP is based on the current Multiple Choice / Matching direction:

- large clear activity title;
- concise instruction;
- strong contextual learning area;
- generous answer targets;
- stable bottom/primary action region;
- consistent blue selection state;
- immediate feedback;
- same iconography/spacing family.

Fill Blank remains interaction-specific in its center stage but should no longer feel like a separate design system.

The frontend should not add arbitrary vertical whitespace merely to fill the viewport. Use flexible layout/breathing room deliberately while preserving a predictable action region.

---

# Backward compatibility

The backend should accept/sanitize existing v1 demo/content shapes while v2 is introduced.

Mobile behavior:

- prefer v2 fields when present;
- fall back to v1 fields;
- never fabricate v2-only semantics from ambiguous v1 fields.

This allows content to migrate incrementally.

---

# Implementation sequence

1. Update contracts and public types/serializers.
2. Extend demo fixtures with v2 content.
3. Add/adjust backend sanitization tests.
4. Verify GET lesson and completion payloads.
5. Keep existing learning-state tests passing.
6. Only then perform the next high-fidelity mobile iteration.

The high-fidelity mobile pass should not begin by hard-coding mockup-only content that the API still cannot represent.

## Implemented API behavior (Content Contract v2)

The v2 fields above are now supported by the backend allowlist serializers. No schema migration, new persistence table or media provider is needed.

- New optional fields may be omitted or null in stored JSON; null optional additions are omitted in the public DTO. Existing v1 field validation remains unchanged.
- Invalid known v2 shapes fail closed as an internal content/configuration error. Unknown keys are discarded at every public nesting level; no config object is spread into the response.
- `segments` is a nonempty array of nonempty strings with optional `emphasis: KEY`. Whitespace-only runs are preserved. Dialogue requires at least one turn with nonblank text. Labels/translations/audio are never inferred.
- New audio URLs and IMAGE context URLs must be absolute HTTP(S) URLs without embedded credentials. These are metadata references only; the server neither fetches them nor guarantees availability. Existing v1 IMAGE/VIDEO/Matching URL handling is unchanged.
- Audio metadata is supported on dialogue turns, key phrases, and TEXT/DIALOGUE activity context. No audio is fabricated in the demo.
- `GET /lessons/:lessonId` always includes `activityProgress: { completed, total }`. The unit is an ACTIVITY block (derived activity step), including required and optional blocks. Completion comes exclusively from that user's `lesson_block_progress.status = COMPLETED` on the blocks in this lesson. An incorrect submitted answer traverses a block; retries do not increment the count. Skipped optional activities remain in total and incomplete even if the lesson is completed. This is traversal metadata, not score, required progress or a new completion condition. If an activity is reused in two blocks, each block is counted separately, unlike Result's distinct-activity score denominator.
- GET is read-only and reads the counters with the existing repeatable-read lesson snapshot. Resume/current pointer and historical first-attempt correctness do not determine these counters. No backfill is fabricated for legacy progress without block traversal rows.
- `POST /lessons/:lessonId/complete` additionally returns `course: { id, title, level }` (`level` may be null), including repeated completion calls. Existing result/courseProgress/nextLesson semantics are unchanged.
- Demo lesson 3 carries rich TEXT, two explicit dialogue turns and SUMMARY v2 alongside all v1 fallbacks. The Multiple Choice prompt retains its v1 contextual wording for Mobile V3, while also publishing instruction and structured DIALOGUE context. Lesson 4 retains v1 blocks and demonstrates optional TEXT activity context. Matching uses three colorful local illustrations.

### Local validation commands

From `backend` in PowerShell (existing guarded development configuration):

```powershell
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc -p scripts/tsconfig.json
node --import tsx --test src/modules/courses/*.test.ts src/modules/lessons/*.test.ts scripts/courses-demo.test.ts scripts/lessons-demo.test.ts
$env:RUN_LESSONS_DB_TESTS = '1'
try { node --import tsx --test src/modules/courses/*.test.ts src/modules/lessons/*.test.ts scripts/courses-demo.test.ts scripts/lessons-demo.test.ts } finally { Remove-Item Env:RUN_LESSONS_DB_TESTS }
node --import tsx scripts/check-lessons-demo.ts --run
node --import tsx scripts/seed-courses-demo.ts --reset --lessons
node --import tsx scripts/seed-courses-demo.ts --check
```

The demo check exercises real HTTP/PostgreSQL payloads and ends at A1 2/8 + A2 unstarted, with demo attempts/reviews reset. Use `--reset` without `--lessons` to restore A1 3/8 + A2 unstarted. No other users' learning data is reset.

Mobile public types include optional v2 fields for incremental API compatibility. Components still use v1 rendering; Mobile V4, media playback and final visual acceptance are separate work.

## V8 presentation refinement: dialogue segments

Dialogue turns (EXAMPLE and activity DIALOGUE context) optionally accept the existing
`segments: { text: string; emphasis?: 'KEY' }[]` shape. Each segment is an authored
phrase unit; mobile may place units on separate naturally wrapping lines. KEY has
stronger emphasis. `text` remains required as the plain legacy fallback. No splitting
or emphasis is inferred from punctuation, names or answer configuration. The public
projection validates and allowlists each segment exactly like TEXT/SUMMARY.

VIDEO already supports `posterUrl`; V8 needs no additional media contract.
Fill manual uses a mobile presentation fallback limit of 40 characters, independent
of accepted answers. No maxLength metadata, answer-length inference or schema change.
