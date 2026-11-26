# Silent explainer runtime

Validate a presentation with `code-comprehension --validate-explainer presentation.json`;
launch it with `code-comprehension --explainer presentation.json`. `--no-open`,
`--port`, and the existing `--dev-ui` development option also work. This runtime
accepts prepared content; generation through the explainer skills is separate work.

The shared `explainerSchema` is the source of truth. See
`tests/fixtures/explainer.json` for a complete example. Supply scope, a dated source
snapshot, ordered scenes, and companion prose with code references. PR presentations
also require the comparison context, matching the snapshot revision and dirty state.

Each scene contains up to four labelled nodes, six directed edges, and three text
beats. Every beat gives its reading duration and highlighted node IDs. Durations
include all displayed time: scene changes are instantaneous, with no extra transition
time. The combined presentation must be at most 180 seconds, and all companion
paragraphs together at most 500 whitespace-separated words. These are ceilings,
not targets. Keep content brief and choose durations for its complexity.

The renderer is static application code. Data cannot add scripts, HTML, remote
assets, or arbitrary animation operations. Diagram and reference handling use the
existing safe browser surfaces. The player starts paused, supports native keyboard
controls, and uses discrete scene changes without interpolated movement for all
motion preferences. A complete text equivalent includes beats, nodes, relationships,
and references. No narration, speech model, external service, or API key is used.

The input file is limited to 256 KiB and validated before a server starts. The
runtime retains one immutable in-memory presentation for the active process. It
uses the existing bounded session lifetime and shutdown cleanup; no explainer
history or bank is written. Changing the input file does not replace the active
presentation. Launch a new session explicitly to view a replacement. Source
metadata describes the captured evidence, not a guarantee that code remains current.
