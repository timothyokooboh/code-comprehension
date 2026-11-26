---
name: pr-explainer
description: Generate and launch a silent, code-grounded walkthrough of proposed PR changes, including committed and uncommitted work. Use when an engineer requests an explanation of a PR; independent of PR quizzes and PR creation.
---

# PR explainer

Use the existing agent to author a silent walkthrough and concise illustrated text.
The local runtime validates and presents declarative data; it does not call a model.
This request authorizes explanation, not code edits, an assessment, or a PR gate.

## 1. Prepare current evidence

Read [runtime.md](references/runtime.md) and resolve a compatible executable before
preparing a session. Read and follow [pr-evidence.md](references/pr-evidence.md) for
repository/target selection, ambiguous baselines, combined diffs, empty comparisons,
and claim grounding. Complete preparation and inspect the code before drafting.
Keep the returned session directory, `explainerPath`, `comparison`, and `snapshot`.
No product setup, cache, or question-format choice is needed.

## 2. Author a proportionate walkthrough

Read [presentation.md](references/presentation.md) before writing JSON to the returned
`explainerPath`. Copy the runtime's comparison and snapshot exactly. Read relevant
surrounding code and tests; make every explanation traceable to the captured evidence.

Use short ordered scenes with progressive reading beats and useful diagrams. Keep
the entire silent presentation at most 180 seconds and all companion prose at most
500 words, across the whole comparison. These are ceilings, never targets. Give a
small meaningful change a short explanation; even a copy change can use one scene
that honestly describes its visible effect. Avoid padding with imagined complexity.

Inspect every claim and source reference before validation. Clearly distinguish
observed behaviour, documented intent, inference, tests present, and tests actually
run. Mention gaps, assumptions, or follow-ups only when supported. The text companion
must stand alone and complement the silent walkthrough.

## 3. Validate and repair

Run `RUNTIME --validate-pr-explainer SESSION`. Repair field-specific data errors in
the output file, with at most two repair attempts after the first failure. Keep
comparison/snapshot values tied to preparation. If code changed, discard the old
session and prepare/regenerate once from current evidence. If it changes again,
explain that a stable comparison is needed. Never launch invalid or stale content.
If repair remains unsuccessful, explain what needs attention and discard the session.

## 4. Launch and clean up

Run `RUNTIME --pr-explainer SESSION`. It checks current evidence again and opens the
production browser viewer. Keep the process running while the engineer watches.
Provide the local URL if opening fails; use `--no-open` where appropriate. The viewer
shows the baseline and inclusion of uncommitted work. Evidence is a snapshot, not a
promise that code remains unchanged while the viewer is open.

A fresh invocation prepares new evidence and a new session; it never silently replaces
an open explanation. Graceful stop removes the temporary PR content. If preparation
is abandoned or launch fails, run `RUNTIME --discard-pr SESSION`. After a crash or
forced termination, use the recorded directory with the same discard command.
Keep explanations out of the repository and product cache; no PR bank or history.
The engineer may separately request `/pr-quiz`; do not launch one automatically.
