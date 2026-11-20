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
- `quiz`: the shared schemaVersion 1 quiz with `type: "product"` and no `comparison`.

Quiz fields: `schemaVersion: 1`, `id`, `type`, `title`, `scope` (nonempty string array),
and nonempty `questions`. Each question contains:

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
alongside scoped and supporting inputs. Runtime assessments add `selectionSize: 8` to
the shared quiz contract, retaining the full question pool for browser retakes.
No machine-specific paths or timestamps are used in saved cache identity.
