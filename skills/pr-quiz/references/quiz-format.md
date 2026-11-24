# Quiz JSON format

Required top-level fields:

- `schemaVersion`: `1` for MCQ-only; `2` when any question is written.
- `id`: nonempty letters/numbers/underscores/hyphens; the runtime replaces this with
  a unique session ID when serving a PR quiz.
- `type`: `"pr"` for this skill.
- `title`: short assessment title.
- `scope`: nonempty array of scope descriptions.
- `questions`: nonempty array. MCQs have:
  - `id`: stable identifier, unique in the quiz.
  - `type`: `"single"` or `"multiple"`.
  - `prompt`: the reasoning question.
  - `options`: at least two `{ "id": "identifier", "text": "answer text" }` objects.
    IDs must be unique within the question.
  - `correctOptionIds`: option IDs, no duplicates; exactly one for single, at least
    two for multiple. Every ID must belong to this question.
  - `explanation`: `{ "concise": "...", "detailed": "..." }`, both nonempty.
  - `references`: nonempty array of `{ "path": "src/module.ts", "line": 12 }`.
    Paths are repository-relative. Line is optional, but must be a positive integer.
  - Optional `diagram`: `{ "format": "mermaid", "source": "flowchart LR\nA --> B" }`.

Objects reject unknown fields. Do not author `comparison`: the runtime supplies
verified target, baseline, HEAD, changed-file inventory, and working-tree inclusion.
Keep answer data out of the prompt text. Use `--validate-pr` as the authoritative
structural check, then inspect reported paths such as `questions.0.correctOptionIds`.

For written question fields and evaluation criteria, read
[written-review.md](written-review.md). MCQs may coexist in version 2 unchanged.
