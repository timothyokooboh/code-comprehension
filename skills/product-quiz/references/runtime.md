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
- `--validate-product INPUT`: validates a bank without saving or launching; success
  returns `{"status":"valid"}`. Errors identify fields for repair.
- `--save-product INPUT --repo PATH`: requires configured project; validates and saves
  `.comprehension/cache/BANK_ID.json`, replacing the same bank ID. Returns `saved`,
  its project-relative path, and tracking conflicts.
- `--product-bank BANK_ID --repo PATH [--no-open] [--port NUMBER]`: loads a saved bank
  into the shared local browser. Its scope label is the resolved bank scope name.

`--repo` resolves to the Git project root, including from subdirectories. Both local
and global skill installations use that project's data. No setup command is required
before skill invocation; the agent handles the first-run question.

Local-only adds only a marked `/.comprehension/cache/` rule. Switching to Git tracking
removes that managed block, preserving other rules. Existing rules that ignore config
or Git-tracked banks, and already-tracked files under a local-only cache, are reported
rather than silently overridden or removed from Git. Review reported rules with the
engineer. Tracking preference makes banks eligible for developer commits; it does
not create commits. The runtime does not certify saved-bank freshness in this ticket.
