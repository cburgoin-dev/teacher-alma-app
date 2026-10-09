# Progress v1 closure

Status: **closed for the current MVP pass** after backend implementation, Mobile implementation, repeated Android visual iterations and final physical acceptance on 2026-10-09.

This closure note supersedes older per-iteration wording in `mobile/PROGRESS.md` that says physical acceptance is still pending. Product semantics remain canonical in `docs/progress-semantics-v1.md` and the HTTP/read-model contract remains canonical in `docs/progress-api-contract-v1.md`.

## Accepted scope

Progress v1 contains two learner-facing surfaces:

- **Progress Dashboard** in the `Progreso` tab.
- **Activity Calendar** reached from `Tu constancia`.

Accepted behavior includes:

- learner-visible active/recent-completed course projection with required-node progress and `Ver ruta`;
- real Review summary with zero/pending states, at most two Topic groups and `Ver repaso`;
- Monday-Sunday weekly consistency using the shared Progress day-state semantics;
- current streak displayed from the shared Gamification resource rather than Progress-owned state;
- monthly Activity Calendar with `LEARNED`, `PROTECTED`, `REPAIRED` and `BROKEN` states;
- learned-only continuity bands, authoritative timezone/today, previous-month navigation and no future-month navigation;
- DEV-only Dashboard/Calendar presets for physical regression checks without mutating real data;
- shared/canonical Gamification flame, Protector and Repair visual language;
- read-only backend composition with no Progress-specific persistence or migration.

## Accepted implementation boundaries

Progress remains a read-oriented composition. It does not own or duplicate:

- course progression/frontier logic;
- Review state/session logic;
- current streak, Daily Goal, coins or inventory;
- timezone settings;
- Practice;
- Strengths/mastery;
- Achievements/XP/ranking/social systems.

The backend remains read-only for both Progress endpoints and does not reconcile or mutate Gamification merely to render history.

## Validation recorded during v1

Backend validation included TypeScript, focused HTTP/service tests, PostgreSQL integration and Home/Review regression coverage. Mobile validation across the implementation and visual passes included TypeScript, focused Progress/navigation tests, Android production export and `git diff --check`.

DEV preview identifiers were repeatedly checked to remain absent from the production bundle.

## Known post-v1 debt

These items are intentionally deferred and are **not blockers for Progress v1 closure**:

1. **Topic visual identity / icon metadata.** Review groups currently use deterministic decorative fallback icons because Topic has no canonical icon/visual metadata. A future cross-vertical solution should cover Courses, Roadmap, Review, Progress and Practice rather than adding Progress-only heuristics.
2. **Transversal loading/skeleton system.** Dashboard-style screens can still expose plain loading/partial-header states. A shared skeleton/stale-while-refresh treatment should be implemented across Home, Progress and other read-heavy surfaces rather than as a Progress-only patch.
3. **Additional accessibility/release QA.** Large system fonts, TalkBack, very narrow Android devices and unusual locale/device combinations should remain part of broader release QA even though the accepted physical Android layout is sufficient for the current MVP development pass.
4. **Minor icon polish.** Protector/Repair/Broken and decorative Review icon treatment may receive future visual polish, but their current semantics and recognizability are accepted.
5. **Future Practice integration.** Progress remains the preferred permanent entry point once Practice is implemented as a real vertical; Home may keep a shortcut.
6. **Future Gamification v2 concepts.** Strengths, Achievements, richer statistics and related concepts remain outside Progress v1.

## Do not reopen casually

Future work should not reopen Progress v1 architecture or semantics merely for cosmetic experimentation. Prefer a clearly scoped Progress v2/polish task when a deferred item has enough product value to justify implementation.
