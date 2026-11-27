# Browser narration prototype

An isolated experiment that reuses the production Motion Canvas scene renderer.
It uses the native SpeechSynthesis API (the browser API wrapped by VueUse's
useSpeechSynthesis), rather than adding a VueUse dependency for this experiment.
No model is downloaded, no remote voice is selected, and no API key is required.

From the repository root, with workspace dependencies installed:

```sh
node apps/web/node_modules/vite/bin/vite.js prototypes/narrated-explainer --host 127.0.0.1 --port 5178 --strictPort
```

Enable narration, select an installed local voice, and press Play. The silent script
is 26 seconds. Spoken timing follows utterance completion and has no total-duration
cutoff. Voices depend on browser/device availability; this prototype only lists
voices marked localService. Unsupported/missing voices fall back to silent playback.
Speech failure or a stalled utterance also switches to silent playback with guidance.

The seek control selects a reading beat, not an exact audio timestamp. Seeking,
changing voice/mode, replaying, and leaving the page cancel old speech. Pause stops
speech; Resume restarts the current beat. This deliberate prototype limitation avoids
assuming consistent native pause/resume behaviour across platforms. Silent playback
also restarts the beat after a pause. An utterance startup watchdog is 10 seconds;
a single-utterance completion watchdog is 60 seconds, separate from total duration.

The renderer stays paused while this controller advances its reading beats. Speech
is not exported or embedded in a video file. Production schemas, player controls,
quiz workflows and skills are unchanged. Automated browser checks use simulated
speech events; real voice quality and audibility require a listener on the target
browser/device.
