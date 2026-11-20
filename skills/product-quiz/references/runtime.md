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
  metadata when source content matches, otherwise `generation_required` with a reason
  (`missing`, `incompatible`, `changed`, `sources_unavailable`, or `refresh`) and changed
  paths where available. Explicit refresh always requests generation without deleting
  the old bank. Unknown/old cache formats require regeneration.
- `--validate-product INPUT`: validates a bank without saving or launching; success
  returns `{"status":"valid"}`. Errors identify fields for repair.
- `--save-product INPUT --repo PATH`: requires configured project; validates and saves
  `.comprehension/cache/BANK_ID.json`, replacing the same bank ID. Returns `saved`,
  its project-relative path, and tracking conflicts.
- `--product-bank BANK_ID --repo PATH [--no-open] [--port NUMBER]`: rechecks source fingerprints, then loads a valid saved bank
  into the shared local browser. Its scope label is the resolved bank scope name. The browser selects
  up to eight questions, redraws on product retakes, and preserves the current draw
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
