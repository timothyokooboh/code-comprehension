# Presentation contract

Write one JSON object, with no extra fields or executable code:

```json
{
  "schemaVersion": 1,
  "id": "pr-walkthrough",
  "type": "pr",
  "title": "A brief description of the actual change",
  "scope": ["Affected module"],
  "snapshot": { "revision": "COPY_PREPARATION_HEAD", "capturedAt": "COPY_PREPARATION_TIMESTAMP", "includesUncommitted": false },
  "comparison": { "target": "COPY_PREPARATION_TARGET", "baseline": "COPY_PREPARATION_BASELINE", "head": "COPY_PREPARATION_HEAD", "includesUncommitted": false, "files": ["COPY_PREPARATION_FILES"] },
  "scenes": [{
    "id": "changed-behaviour",
    "title": "What happens now",
    "nodes": [{ "id": "entry", "label": "Actual entry point" }, { "id": "result", "label": "Actual outcome" }],
    "edges": [{ "from": "entry", "to": "result" }],
    "beats": [{ "text": "Replace with a concise, evidence-grounded explanation.", "durationSeconds": 4, "activeNodes": ["entry", "result"] }],
    "references": [{ "path": "src/actual-file.ts", "line": 1 }]
  }],
  "companion": {
    "paragraphs": ["Replace with concise, self-contained prose about the actual change."],
    "references": [{ "path": "src/actual-file.ts", "line": 1 }],
    "diagram": { "format": "mermaid", "source": "flowchart LR\n Entry --> Result" }
  }
}
```

The example is a shape, not content to copy. Replace all placeholders and copy the
complete `comparison` and `snapshot` objects from preparation, including booleans.
Choose real, repository-relative references. Never represent an inferred intent or
unexecuted test as a verified fact.

Limits enforced by the runtime:
- IDs: 1–64 letters/numbers/underscores/hyphens; scene and node IDs are unique.
- Overall title: 120 characters; scope: 1–12 labels, up to 120 characters each.
- Scenes: 1–24; scene title: up to 80 characters.
- Nodes per scene: 1–4, labels up to 36 characters. Edges: 0–6, referencing distinct
  existing nodes in that scene. Empty edges are valid for a simple single-node change.
- Beats per scene: 1–3; text up to 120 characters; each duration 2–30 seconds.
  `activeNodes` references existing scene nodes without duplicates. Match reading time
  to complexity. Discrete scene changes add no hidden transition duration.
- Every scene and companion: 1–32 references, relative path up to 512 characters and
  optional positive line number. No absolute paths or parent traversal.
- Companion: 1–12 nonempty paragraphs, combined at most 500 whitespace-separated
  words. Optional Mermaid source up to 8,000 characters; include it only when useful.
- Whole file: at most 256 KiB; combined duration at most 180 seconds.

The renderer owns layout and controls. Author only text, nodes, edges, reading times,
highlights, evidence, and optional Mermaid. No HTML, scripts, remote assets, audio,
model downloads, or animation source files are needed.
