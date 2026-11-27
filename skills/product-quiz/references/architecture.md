# General system architecture

Read this when generating or semantically reviewing a `general` product bank.
First follow [architecture-evidence.md](architecture-evidence.md) for the shared
architecture meaning used by both product quizzes and explainers.
Author a dedicated assessment of how the system fits together. Read current code
and relevant tests; map responsibilities and boundaries, then trace a representative
end-to-end flow through the participating modules and external dependencies.

Cover the architecture that actually exists: module integration, data/control flow,
state ownership, consequential failure boundaries, and evidenced architectural
patterns. Ask what would happen if a boundary failed or a responsibility moved,
why a flow requires coordination, or how one module's behaviour affects another.
Use plausible codebase-specific alternatives for MCQs and causal criteria for
written answers. Cite the implementation that supports each answer, not merely a
document naming a pattern. Distinguish documented intent from inferred rationale.

Choose useful coverage for this system's size. A small system need not demonstrate
every category. Generate an architecture bank directly from this evidence rather
than randomly pooling module questions. Include relevant shared implementation,
configuration and tests in its source inventory. The requested question count and
format remain authoritative; a short sitting need not cover every concept.

For a newly generated bank use `scope.kind: "general"` and
`scope.focus: "system_architecture_v1"`. This is a semantic declaration, not proof
that the questions are true. The CLI validates structure; the agent checks meaning.
The browser labels this scope **General system architecture** independently of the
bank's generated title or historic name. Module banks do not carry `focus`.

## Reviewing a legacy general bank

`--check-product` reports `review_required` with reason `architecture_focus` and
`requiredFocus: "system_architecture_v1"` when a cache lacks the declaration.
This happens even if `changedFiles` is empty. Review the entire bank against the
requirements above and its current source evidence, including any changed inputs.

- If the bank already assesses system architecture accurately, retain it through
  the normal receipt with `reviewedFocus: "system_architecture_v1"` in addition to
  `confirmed: true`, the current token, and reference-line corrections.
- If it is a collection of disconnected module facts, has unsupported architecture
  claims, or its validity is uncertain, generate and validate a replacement bank
  under the same identifier instead. Keep unrelated module banks unchanged.

Use the [source-review workflow](source-review.md) for receipt creation and source
checks. Never add the marker directly to a saved bank to bypass review. Retention
preserves the questions while recording the reviewed focus; it does not turn
unsuitable questions into architecture questions. Explicit refresh regenerates.
