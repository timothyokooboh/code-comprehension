# Product runtime

This pre-release workflow requires the built runtime from a code-comprehension
checkout. Build there with `pnpm install` and `pnpm build`, then use
`node /absolute/path/to/code-comprehension/packages/cli/dist/index.js` as RUNTIME.
An installed `code-comprehension` executable is also usable if its help lists the
product commands. Do not invent an npm release or install UI dependencies into the
consuming project. Published bootstrap is tracked in #11.

Quote paths and identifiers. Use one action per invocation:

- `--product-status --repo PATH`: returns `setup_required` without creating files,
  or `ready` with configuration and tracking conflicts. Reconciles managed ignore rules
  for an existing preference, including manual configuration edits.
- `--configure-product git|local --repo PATH`: saves the explicit preference in
  `.comprehension/config.json`, reconciles the managed cache rule, and reports conflicts.
- `--check-product BANK_ID --repo PATH [--refresh]`: returns `reusable` and scope
  metadata when source content matches, or `review_required` with changed input paths and a review token. Missing/incompatible
  data, unavailable inputs, or explicit refresh return `generation_required` with a reason
  (`missing`, `incompatible`, `sources_unavailable`, or `refresh`). Changed inputs
  retain their stored fingerprints pending a review decision. Explicit refresh always requests generation without deleting
  the old bank. Unknown/old cache formats require regeneration.
- `--retain-product RECEIPT --repo PATH`: explicitly confirm a reviewed bank using
  the JSON contract in [source-review.md](source-review.md). Updates only reference
  line corrections and fingerprints, returning `retained`. Missing confirmation,
  stale tokens, unknown questions/references, and out-of-range lines fail without
  replacing the bank. `--refresh` cannot be combined with this action.
- `--validate-product INPUT`: validates a bank without saving or launching; success
  returns `{"status":"valid"}`. Errors identify fields for repair.
- `--save-product INPUT --repo PATH`: requires configured project; validates and saves
  `.comprehension/cache/BANK_ID.json`, replacing the same bank ID. Returns `saved`,
  its project-relative path, and tracking conflicts.
- `--product-bank BANK_ID [OTHER_BANK_IDS...] --repo PATH [--no-open] [--port NUMBER]`: rechecks source fingerprints, then composes valid saved banks
  into one shared local assessment. Any bank requiring review or generation blocks
  launch. Each bank is checked independently with `--check-product`; a failure never
  changes the others. Repeated IDs are ignored and ID order does not change identity.
  General overview must be launched alone. Scope labels use resolved bank names.
  The browser targets eight questions, increasing to the bank count when needed to
  cover every bank. It redraws on product retakes and preserves the current draw
  and answers on reload. PR retakes retain their questions.

`--repo` resolves to the Git project root, including from subdirectories. Both local
and global skill installations use that project's data. No setup command is required
before skill invocation; the agent handles the first-run question.

Local-only adds only a marked `/.comprehension/cache/` rule. Switching to Git tracking
removes that managed block, preserving other rules. Existing rules that ignore config
or Git-tracked banks, and already-tracked files under a local-only cache, are reported
rather than silently overridden or removed from Git. Review reported rules with the
engineer. Tracking preference makes banks eligible for developer commits; it does
not create commits. The runtime hashes the working-tree content of scoped files, supporting inputs,
and question references. It checks additions/deletions as well as content edits;
modification times and absolute checkout locations are not cache identity.

Source patterns use Node path.matchesGlob syntax (for example `src/**/*.ts`); a literal
directory includes descendants, and `.` covers the project. Git supplies tracked and
non-ignored untracked paths. `.git`, `.comprehension`, `node_modules`, `dist`, `build`,
`coverage`, `.next`, and `.nuxt` directories are excluded. Explicit supporting files
and references must be existing regular files within the project and outside those
directories; add relevant ignored configuration explicitly as supporting files.
Keep temporary generation input outside the source scope (prefer the OS temp directory).
This is scoped file validation, not a transitive dependency graph.

## Active assessment revisions

- `--active-assessment LOCAL_URL`: read the current pool, source context, revision,
  and the browser's latest displayed-number-to-ID mapping, without answers or scores.
- `--revise-assessment RECEIPT --runtime LOCAL_URL`: validate a proposed replacement
  against the current revision/display token and workflow. On success, tell the
  engineer to reload to start a new attempt; invalid/stale proposals leave it usable.

Use the shared PR skill's `references/revisions.md` for receipt shape, grounding,
per-workflow preparation, and temporary-file cleanup. URLs must be the running
`http://127.0.0.1:PORT` origin, without paths, credentials, queries, or fragments.
