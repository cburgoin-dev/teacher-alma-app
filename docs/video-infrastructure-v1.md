# Video Infrastructure v1

Status: **APPROVED DIRECTION / PRE-IMPLEMENTATION DESIGN**.

This document defines the first production-oriented video capability for Teacher Alma Lessons. It is intentionally scoped to reliable short-form lesson video playback and does not attempt to build an interactive-video platform, CMS, DRM system or long-form course-video product.

## 1. Product purpose

Teacher Alma Lessons may contain short instructional videos recorded by Alma, typically around **1–3 minutes** and occasionally somewhat longer. Video is treated as part of the learning flow, not as a separate media library.

The target experience is:

1. the learner reads/uses normal Lesson content;
2. reaches a VIDEO block with an authored poster/thumbnail;
3. taps Play and watches inside the Lesson;
4. may enter fullscreen when desired;
5. satisfies the video's completion rule when the video is required;
6. continues the same non-resumable Lesson run.

Teacher Alma v1 should support high-quality video without serving production media directly from the Node/Express API server.

## 2. Provider direction

Preferred provider for v1: **Mux**.

Rationale:

- managed ingest/transcoding/streaming;
- HLS playback suitable for native mobile clients;
- signed playback support for paid/private content;
- posters/thumbnails and text tracks/captions;
- operational/video analytics without building a custom analytics platform;
- appropriate developer API surface for later automation;
- cost is expected to be low at Teacher Alma's initial scale, where the first commercial release is expected to contain substantially less than a large video catalog.

Bunny Stream remains a valid future fallback if economics or operational needs materially change. Do not spread Mux-specific behavior throughout Lessons; keep a narrow provider boundary so a future provider replacement is possible without rewriting the learning domain.

## 3. Mobile playback direction

Preferred mobile playback library: **expo-video**, subject to compatibility validation with the project's Expo version during implementation.

Default UX:

- Lesson remains portrait-first;
- VIDEO renders inline in the normal Lesson flow;
- poster/thumbnail appears before playback;
- tapping Play starts inline playback rather than forcing fullscreen;
- fullscreen is user-controlled;
- 16:9 content may use landscape naturally in fullscreen if the learner rotates the device;
- vertical content remains supported without making the app TikTok-first;
- media uses contain/respect-original-aspect-ratio behavior; do not crop instructional content merely to fill a frame.

The player must handle at least:

- initial loading;
- play/pause;
- buffering;
- replay;
- fullscreen enter/exit;
- network/playback failure;
- retry;
- captions toggle when a text track exists;
- return from fullscreen without losing the current in-run playback position.

## 4. Video completion modes

V1 supports two authored semantic modes:

### REQUIRED_WATCH

The video is pedagogically required for the Lesson run.

Direction for v1:

- completion threshold: approximately **90% of real playback**;
- do not require mathematically exact 100% playback;
- pausing is allowed;
- rewinding/replaying already watched content is allowed;
- forward seeking into content not yet watched should be prevented while the video remains incomplete, if this can be implemented reliably with the chosen player;
- after video completion, seeking becomes unrestricted;
- reaching a timestamp near the end without actually consuming the intervening video must not satisfy the requirement.

The 90% rule is intended to avoid making harmless outros, final seconds, event timing and platform differences block a learner who effectively watched the lesson.

### OPTIONAL

Supplementary video that does not block Lesson progression.

It may be played, paused, skipped or ignored without affecting required Lesson completion.

Do not add more completion modes in v1 unless implementation exposes a real requirement.

## 5. Lesson-run and resume semantics

Existing Lesson semantics remain authoritative: incomplete normal Lessons are intentionally **non-resumable** across runs.

Video must not accidentally create a hidden Resume feature.

Therefore:

- while the current Lesson run remains mounted/alive, the player may preserve its current position naturally;
- entering/exiting fullscreen must preserve the current position;
- abandoning the Lesson and later starting a fresh normal Lesson run does **not** restore the previous run's video position;
- no cross-run persistent `resumeAtSecond` behavior is introduced in Video Infrastructure v1.

This decision is appropriate for the expected short 1–3 minute instructional videos. Revisit only if future product content becomes materially longer.

## 6. VideoAsset as a first-class media resource

Prefer a dedicated `VideoAsset` model/resource rather than embedding provider IDs throughout arbitrary Lesson JSON.

Conceptually:

```text
Lesson VIDEO block
    -> videoAssetId
         -> VideoAsset
              provider
              providerAssetId
              providerPlaybackId
              status
              durationSeconds
              aspectRatio / dimensions where useful
              poster metadata
              text tracks/captions metadata
```

Exact physical fields remain an implementation decision, but the ownership boundary is intentional:

- Lessons reference a Teacher Alma video resource;
- Video infrastructure owns provider-specific identifiers and playback resolution;
- Mobile should not need Mux API credentials or provider secrets;
- replacing provider metadata should not require rewriting unrelated Lesson content.

Do not create an oversized media-management domain in v1. `VideoAsset` exists to give clean ownership, lifecycle and provider abstraction, not to build a CMS.

## 7. Playback authorization and signed playback

V1 should use **signed playback** rather than treating production videos as permanently public URLs.

Conceptual flow:

```text
Mobile requests/accesses a Lesson VIDEO
        -> Teacher Alma Backend verifies learner/content access
        -> Backend resolves VideoAsset
        -> Backend creates/returns short-lived authorized playback information
        -> Mobile plays through expo-video
```

Rules:

- Mux API credentials and signing private keys live only in Backend/server configuration;
- secrets are never committed and are never shipped in the mobile bundle;
- Mobile receives only the playback information/token needed for that learner/session;
- this must compose with existing Course/Lesson access truth rather than create a second entitlement system;
- later Premium/subscription work should be able to reuse this boundary without redesigning video playback.

V1 does **not** require DRM. Screen-capture-resistant/Netflix-grade protection is out of scope.

## 8. Captions / subtitles

V1 infrastructure supports optional captions/text tracks.

Product direction:

- captions are not mandatory for every initial video;
- show a CC/captions control only when a usable track exists;
- authored/provided tracks may be used;
- provider-generated captions may be used as a draft/input;
- automatically generated captions should be reviewed before being treated as pedagogically authoritative, especially for mixed Spanish/English explanations;
- absence of captions does not make a VIDEO block invalid in v1.

Do not invent translations automatically in the learner UI.

## 9. Academic completion ownership

Provider analytics are not Teacher Alma's academic source of truth.

Mux may supply operational viewing analytics, but Lesson completion semantics remain inside Teacher Alma.

Implementation should track only the minimum state required to enforce REQUIRED_WATCH inside the current Lesson run and consolidate the Lesson correctly. Avoid persisting per-second viewing history unless a concrete requirement proves it necessary.

The implementation must distinguish:

- current playback position;
- maximum/actually consumed required playback needed to enforce no-forward-skip;
- video requirement satisfied for this Lesson run;
- overall Lesson completion.

Do not introduce persistent video resume merely because some watch state is required during the run.

## 10. Content ingestion without a CMS

A production CMS/admin application is explicitly **out of scope** for the first commercial version.

Alma provides content to the developer. The developer remains the operator who validates and publishes application content.

However, v1 should avoid making video ingestion unnecessarily manual.

Video Infrastructure v1 should include a small developer-oriented ingestion workflow/script if practical. Its responsibilities may include:

- accept a local source video path and required metadata;
- upload/create the video asset through the provider API;
- poll/read processing status as needed;
- obtain provider asset/playback identifiers;
- obtain stable technical metadata such as duration/dimensions when available;
- create/update the local/demo/content representation of `VideoAsset` or output the exact structured data needed to do so;
- fail safely and clearly without printing secrets;
- be idempotent or explicitly refuse ambiguous duplicate creation where reasonable.

This is a developer tool, not a learner/admin UI.

Initial provider-dashboard upload remains an acceptable fallback during setup and debugging.

## 11. Future content-authoring automation

Generating whole Lessons or Activities from Alma's source material is valuable but is **not** part of Video Infrastructure v1.

Future `Content Authoring Automation` may support a workflow such as:

```text
Alma material
    -> assisted import/generation
    -> proposed TEXT / EXAMPLE / VIDEO / ACTIVITY / SUMMARY blocks
    -> deterministic validation
    -> developer review/approval
    -> publication
```

Do not let this future possibility expand the Video v1 implementation into an AI authoring system or visual CMS.

## 12. Interactive video

Interactive/branching scenarios are explicitly deferred.

Examples outside v1:

- pause at authored timestamps and ask a question;
- choose a response and continue a conversation;
- branching clips;
- speaking interaction synchronized to video;
- TEUIDA-style scenario playback;
- embedded assessment timelines.

These are promising future product capabilities, but they require a separate activity/content contract and authoring model. V1 first establishes reliable instructional video playback.

## 13. Expected account/credential ownership

Some provider setup requires explicit human/account-owner action.

Human responsibilities:

- create/own the external provider account;
- accept provider terms/billing;
- create/revoke root/API credentials or signing keys when required;
- store/copy initial secrets into the local/deployment secret environment;
- eventually ensure production infrastructure ownership is appropriate for Alma/her business.

Repository/agent responsibilities:

- environment variable contract and examples;
- provider adapter;
- signed playback implementation;
- ingestion script;
- API/mobile integration;
- tests/fakes;
- documentation;
- ensuring secrets are never committed.

Development may initially use a developer-owned Mux account with an explicit future production handoff, provided irreplaceable production ownership is not accidentally tied to that account.

## 14. Security scope

Required:

- no provider secrets in Mobile;
- no secrets in Git;
- backend-authoritative access before protected playback;
- short-lived signed playback/token where applicable;
- production media not served directly by Express;
- sanitize errors so credentials/tokens are not logged unnecessarily.

Deferred:

- DRM;
- anti-screen-recording guarantees;
- forensic watermarking;
- offline encrypted downloads.

## 15. Cost/scale assumptions

The first commercial release is expected to contain short videos, likely well under several hours of total media. At this scale, provider cost is expected to be a minor operating expense relative to other release costs.

Do not optimize architecture around hypothetical massive streaming volume before real usage exists. Keep provider billing observable and document production ownership, but optimize first for reliable playback, maintainability and learner experience.

## 16. Testing strategy

Automated tests should not require live Mux calls by default.

Use a narrow provider interface/fake for:

- signed playback/source generation;
- asset lookup/status;
- ingestion behavior where practical;
- authorization failures;
- expired/invalid playback information;
- Lesson completion logic.

Use one or a few real provider assets only for integration/physical acceptance.

Physical acceptance should cover at least:

- Android inline playback;
- fullscreen enter/exit;
- rotation/landscape for 16:9 content;
- REQUIRED_WATCH gating;
- rewind and forward-seek restriction before completion;
- seek freedom after completion;
- OPTIONAL behavior;
- buffering/network loss/retry;
- captions when present;
- abandonment/new Lesson run does not restore old video position;
- playback remains inaccessible when Course/Lesson access denies it.

Before commercial iOS release, the same core player flow must also be accepted on iPhone/TestFlight.

## 17. Explicitly out of scope for v1

- CMS/admin portal;
- automatic full Lesson/Activity generation;
- interactive/branching video;
- persistent video resume across Lesson runs;
- offline downloads;
- DRM;
- custom video analytics dashboard;
- social/live video;
- long-form streaming platform features;
- mandatory captions for all content;
- video-specific payment/entitlement model separate from Courses.

## 18. Implementation sequencing

Recommended order:

1. validate current Lesson VIDEO contract/placeholder and Expo compatibility;
2. finalize `VideoAsset` persistence/API shape;
3. create provider abstraction and Mux adapter;
4. define secret/env contract;
5. create first real development Mux account/credentials and one test asset;
6. implement signed playback resolution;
7. implement developer ingestion script;
8. integrate expo-video player into the existing Lesson VIDEO block;
9. implement REQUIRED_WATCH / OPTIONAL run semantics;
10. add captions/state/error/fullscreen handling;
11. run backend/mobile regression tests;
12. perform Android physical acceptance;
13. perform iPhone/TestFlight acceptance before commercial release.

Do not create a separate video-oriented Lesson engine. Extend the existing Lesson content/run semantics with the smallest coherent video capability.

## 19. Decision summary

Approved direction for Video Infrastructure v1:

- Mux preferred provider;
- expo-video preferred mobile player;
- short 1–3 minute instructional videos are the primary use case;
- inline portrait-first playback with optional fullscreen;
- original aspect ratio preserved;
- REQUIRED_WATCH and OPTIONAL modes only;
- REQUIRED_WATCH target approximately 90% real playback;
- no forward seeking into unseen content before completion, subject to reliable player support;
- no persistent cross-run video resume;
- dedicated VideoAsset ownership;
- signed backend-authorized playback;
- optional captions support;
- lightweight developer ingestion/upload automation;
- no CMS, DRM, offline or interactive branching in v1;
- future Content Authoring Automation and Interactive Video remain separate product slices.
