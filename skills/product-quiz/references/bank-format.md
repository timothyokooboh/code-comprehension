# Product bank format, version 1

Write one JSON object with exactly these fields:

- `version`: `1` (bank format version).
- `id`: stable letters, numbers, underscores, or hyphens, used as the bank filename.
- `scope`: `{kind, name, description, sourcePatterns, supportingFiles}`.
  `kind` is `module` or `general`. Name and description are nonempty text.
  `sourcePatterns` is a nonempty array of repository-relative paths/globs;
  `supportingFiles` is an array of repository-relative paths, possibly empty.
  Avoid absolute paths, backslashes, or parent traversal. Include relevant shared
  implementation, configuration, and tests; do not include generated caches.
- `quiz`: the shared schemaVersion 1 (MCQ) or 2 (written/mixed) quiz with `type: "product"` and no `comparison`.

Quiz fields: `schemaVersion: 1|2`, `id`, `type`, `title`, `scope` (nonempty string array),
and nonempty `questions`. Each MCQ contains:

- Unique `id`; `type` of `single` or `multiple`; nonempty `prompt`.
- `options`: at least two `{id, text}` objects with unique IDs.
- `correctOptionIds`: exactly one ID for single, at least two for multiple;
  IDs must be unique and reference options in that question.
- `explanation`: `{concise, detailed}`, both nonempty strings.
- `references`: at least one `{path, line?}`, repository-relative path and optional
  positive integer line number.
- Optional `diagram`: `{format: "mermaid", source}`.

All identifiers accept letters, numbers, underscores, and hyphens. Objects reject
unknown fields, including scores and attempts. Keep IDs stable during validation
repairs. The browser uses the resolved bank scope name as its assessment scope label.
Keep agent-generated input at version 1. On saving, the runtime writes cache version 2
with `sources: [{path, hash}]`, using SHA-256 content fingerprints. Do not author or
copy fingerprints yourself. Old version-1 caches must be regenerated through saving.
All cited files must exist within the project; their content is automatically included
alongside scoped and supporting inputs. Runtime assessments add the resolved `selectionSize` (default 10) to
the shared quiz contract, retaining the full question pool for browser retakes.
For combined assessments, the runtime adds `selectionGroups` (arrays of question IDs)
to spread bank coverage within the question limit and prefixes question IDs with stable
bank identity. These are runtime fields; generate ordinary independent banks without
authored selection groups. Identical prompt/options/answers are presented once.
No machine-specific paths or timestamps are used in saved cache identity.

Written question fields and evaluation criteria follow the shared PR skill's
references/written-review.md (from the runtime checkout if the sibling is absent).
Use schemaVersion 2 and omit MCQ options/answer IDs for written questions.
The outer input bank version remains 1 and managed cache version remains 2.
selectionFormat and writtenCount are runtime metadata, not authored bank fields.
Banks may contain both types so later MCQ-only requests reuse the MCQs.
