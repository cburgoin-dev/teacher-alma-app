# Activities

This document records the current MVP activity types and their interaction rules. The goal is to keep the activity engine reusable while allowing Alma to choose the pedagogically appropriate variant for each exercise.

## Shared interaction model

Normal practice activities follow this general flow:

`Show activity -> learner answers -> Comprobar/Verificar -> feedback -> save attempt -> continue`

Shared rules:

- Practice activities may be retried.
- Correct/incorrect feedback is normally immediate.
- Incorrect attempts are preserved so they can feed Review.
- Incorrect answers do not trap the learner until they answer correctly.
- Explanations may be shown when pedagogically useful.
- Activity completion and answer correctness remain separate concepts.

## 1. Multiple choice

The learner selects one option from a small set and checks the answer.

Conceptual states:

- `UNANSWERED`
- `ANSWERED`
- `CHECKED_CORRECT`
- `CHECKED_INCORRECT`

Typical UI:

- Prompt or short conversational context.
- 3-4 answer options.
- `Comprobar` CTA.
- Correct/incorrect feedback after submission.
- Optional explanation.

## 2. Fill in the blank - guided options

Conceptual type: `FILL_BLANK_OPTIONS`.

The learner completes a sentence by choosing from a small answer bank.

Use this variant when the pedagogical goal is guided recognition/practice, especially when introducing or reinforcing newer material.

Conceptual states:

- `UNANSWERED`
- `ANSWERED`
- `CHECKED_CORRECT`
- `CHECKED_INCORRECT`

Typical UI:

- Sentence with a visible blank.
- Small bank of predefined options.
- Optional `Pista` action.
- `Comprobar` / `Verificar` CTA.

The presence of predefined options is part of the activity configuration, not a user preference.

## 3. Fill in the blank - typed answer

Conceptual type: `FILL_BLANK_TEXT`.

The learner types the missing word or phrase.

Use this variant when the pedagogical goal is recall/production rather than recognition.

Conceptual states:

- `UNANSWERED`
- `ANSWERED`
- `CHECKED_CORRECT`
- `CHECKED_INCORRECT`

Typical UI:

- Sentence with a blank.
- Text input such as `Escribe tu respuesta`.
- Optional `Pista` action.
- `Comprobar` / `Verificar` CTA.

Answer comparison rules:

- Trim leading/trailing whitespace.
- Ignore case when case is not pedagogically relevant.
- Allow multiple accepted answers where needed.
- More advanced normalization should be added only when a real content requirement appears.

## Why both fill-in-the-blank variants exist

The learner does not choose between the two modes and the app should not automatically decide only from CEFR level.

**Alma/content configuration decides the variant for each activity.**

General pedagogical guideline:

- `FILL_BLANK_OPTIONS`: guided practice / recognition.
- `FILL_BLANK_TEXT`: recall / production.

Both can appear in the same course or even the same lesson when appropriate.

## 4. Match word with image

Conceptual type: `MATCH_WORD_IMAGE`.

The learner pairs words with corresponding images.

Preferred mobile interaction:

1. Tap a word.
2. Tap the corresponding image.
3. The pair becomes visually connected/selected.
4. The learner may modify pairs before checking.
5. Tap `Comprobar`.

Conceptual states:

- `UNANSWERED`
- `MATCHING_IN_PROGRESS`
- `CHECKED_CORRECT`
- `CHECKED_WITH_ERRORS`

Rules:

- Prefer tap-to-match over mandatory drag-and-drop.
- Do not show a permanent hint panel by default; the interaction should be self-explanatory and screen space is more valuable for matching items.
- First-use guidance may be shown briefly if usability testing indicates it is necessary.
- After checking, clearly distinguish correct and incorrect pairs.
- Incorrect pairs feed Review like other incorrect attempts.

## Content ownership

The activity engine defines interaction and validation behavior. Alma determines the actual educational prompt, accepted answer(s), images, distractors, explanations and which activity variant is appropriate for the learning objective.

## Visual direction

Activities belong to the focused lesson flow and should remain cleaner than Home/Roadmap:

- White/light base.
- Blue structure/selection states.
- Red primary CTA/accent.
- Rounded cards and subtle shadows.
- Clear lesson progress.
- Minimal global navigation/chrome while actively learning.
- Content and interaction take priority over decorative elements.
