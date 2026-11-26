# Silent architecture explainer prototype

A 90-second Motion Canvas walkthrough inside a Vue 3 page, followed by a short
illustrated explanation and code references. Content is authored from this repo;
this does not implement the proposed explainer skills or change quiz scopes.

## Run

From this directory:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5199. `npm run build` builds the standalone page.
No audio, text-to-speech runtime, voice model, account, or API key is required.
The initial npm installation needs internet access. Playback uses local assets.

## Responsibilities

- `src/content.json`: grounded chapter text, evidence, and timing.
- `src/architecture.tsx`: Motion Canvas diagram and progressive text reveals.
- `src/useWalkthrough.ts`: player lifecycle, rendering, and transport controls.
- `src/Walkthrough.vue`: accessible playback controls and chapter navigation.
- `src/App.vue`: Vue page, companion explanation, and evidence links.
- `src/messages.ts`: application-owned copy.

The three-minute ceiling is checked when Vite loads its configuration. The
companion explanation is under 500 words. Playback starts only on user action;
reduced-motion mode removes movement and fades. The text version is always
available. Evidence links are pinned to the inspected commit, not moving main.

## What this proves, and what it does not

Motion Canvas can run alongside Vue without React or a video-rendering service.
A local production build took approximately 1.4 seconds on the development Mac.
That is bundling time, not future agent authoring time or MP4 rendering time.

This is a browser animation, not an encoded video file. It is a deliberately
small prototype: no content-generation pipeline, reusable explainer schema,
cache invalidation, or slash commands have been added. Windows/Linux execution
has not been tested. The final silent runtime has no OS-specific speech tools.

A local Kokoro narration experiment was stopped following the decision to use
silent walkthroughs. Its runtime, model cache, and audio are not dependencies
or deliverables of this prototype.

Browser checks covered playback, pause, chapter seeking, replay, mobile overflow,
reduced-motion startup, and absence of browser errors. Review the pacing and
clarity manually before choosing a production implementation.
