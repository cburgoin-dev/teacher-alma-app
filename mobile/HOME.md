# Home Mobile v1

## Official visual references

The four original PNGs are archived byte-for-byte under `docs/mockups/home/`:

- `home-active-primary.png`: primary ACTIVE target (attachment #2, 11_37_57).
- `home-active-secondary-01.png`: secondary ACTIVE composition reference (#3, 11_37_49).
- `home-active-secondary-02.png`: secondary ACTIVE hierarchy reference (#4, 11_37_48).
- `home-new-primary.png`: primary NEW target (#1, 11_50_37).

Primary references win over secondary ones. Home semantics/API and real data win
when references imply unavailable features. Generated characters/avatars, example
counts and notifications are not extracted into application assets. All four copies
were verified against their source SHA256 hashes.

## Integration

`src/features/home/` owns only GET `/me/home`: types, a discriminated-envelope
parser, coalesced session resource, focus hook and components. The backend owns
state selection, current node, course ordering, access and progression. Percentage
labels use the returned value; only visual bar fill is clamped to its track.

The existing Inicio tab now hosts Home with its own safe-area/header. Existing
Courses stack destinations handle Course Detail, Roadmap, Lesson, Unit Challenge
and Review. Nested navigation uses `initial: false` so direct entry retains the
Courses landing route and existing completion/back behavior. No course is started
by reading Home or tapping its course cards. Lessons/Challenges keep their existing
start/confirmation flows. Locked current nodes remain visible and informational;
there is no payment route. COMING_SOON cards open existing Course Detail.

`useGamification` and `gamificationResource` remain the only shared source for
coins/streak/Daily Goal. MainAppHeader gains an opt-in Home logo size. Shared metrics
now retain last-known values during refresh/transient errors instead of flashing
placeholders. Shop spending validation is unchanged. No new cache or endpoint is
introduced for Gamification.

Home refreshes on focus (including return after learning), foreground transition
while focused, or explicit pull-to-refresh. Concurrent Home reads coalesce and
last-known data stays visible. Foreground/pull refresh also uses the shared
Gamification resource; its existing focus hook covers tab returns. There is no
polling or requirement to remount the app. Errors with cached data show a stale-data
notice and retry; first load shows a spinner or error, without inventing NEW state.

## Rendering and deliberate visual differences

White base, navy type, blue rounded hero, coral action, two secondary cards and up
to two cover-led featured cards follow the primary references. Existing course
artwork and simple book/trophy symbols replace generated Alma characters. Greeting
uses the real name or a neutral Hola; the avatar is a non-interactive outline.
Notifications are omitted. Header uses the official horizontal mark without changing
other screens' logo sizes.

- NEW: disabled, explicitly coming-soon Diagnostic CTA; real beginner course or
  catalog alternative plus shared Daily Goal.
- ASSESSED: real recommendation/level, nullable course and informational result card.
- ACTIVE: backend node and percentage, direct accessible Lesson/Challenge CTA;
  locked or missing content never creates a dead destination.
- COURSE_COMPLETED: real completion context and next-course recommendation, including
  COMING_SOON. Null legacy context renders neutral copy without fabricated progress.
- ACTIVE/COMPLETED secondary left: real pending Review, otherwise non-interactive
  Practice coming-soon. Daily Goal is informational and counts sessions, not invented
  lesson/exercise mixes. It follows the returned completion flag.

No course description is fabricated because HomeCourse does not provide one.
Featured cards show real access/progress metadata instead. At large font scales,
both two-card groups stack and hero artwork is omitted to protect readable copy.
There are no fixed text heights or forced single-line titles. Scroll and safe areas
remain enabled, and interactive controls have at least 48dp touch surfaces.

## Validation and remaining acceptance

From mobile:

```powershell
node node_modules/typescript/bin/tsc --noEmit
node --test tests/home.test.cjs tests/gamification.test.cjs tests/courses.test.cjs
node node_modules/expo/bin/cli export --platform android --output-dir dist/home-v1-check
```

Component tests execute TSX with native primitives stubbed. They cover all four
states, nulls, access locks, navigation handlers, actual goal/count data, ordering,
resource coalescing/stale data and focus/foreground cleanup. They do not establish
native layout, hardware Back, TalkBack or physical visual acceptance. Those checks
remain for Android, especially narrow widths and large fonts.

Session/account switching must clear/recreate Home and shared resources when a
real authentication lifecycle is added. The parser checks envelope/discriminants;
deep payload validation follows the existing typed API boundary. Diagnosis,
Practice, Notifications, avatar management, payment and Daily Goal settings remain
outside this iteration. No backend changes or dependencies were needed.

Validation result for this iteration: Mobile TypeScript PASS; full Mobile suite
154/154 PASS; Android production export PASS (1083 modules, 2.4 MB Hermes bundle)
at `dist/home-v1-check`; `git diff --check` PASS. The attempted ADB device listing
failed under the Windows sandbox before device discovery; no physical acceptance
or screenshot evidence is claimed.
