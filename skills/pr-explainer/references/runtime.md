# Runtime

`RUNTIME` means a resolved executable. Use an installed `code-comprehension` only
when its `--help` lists `--pr-explainer` and `--validate-pr-explainer`.
For this pre-release source checkout, build in the code-comprehension repository with
`pnpm install` and `pnpm build`, then invoke its absolute `packages/cli/dist/index.js`
with Node. Use `--repo` to target the consuming project; install no Vue, Motion Canvas,
or other dependencies there. A global skill location is not the consuming project.
If no compatible runtime is available, request its location or explain the remaining
npm distribution work (#11); never invent a published version.

- `--prepare-pr --repo PATH --target REF [--baseline REF]`: returns `prepared` with
  `directory`, `diffPath`, `explainerPath`, `comparison`, `snapshot`, or `no_changes`.
- `--validate-pr-explainer DIRECTORY`: validates `explainer.json`, its preparation
  metadata, and unchanged comparison. Nonzero status includes actionable field paths;
  repairable content stays available.
- `--pr-explainer DIRECTORY [--no-open] [--port NUMBER]`: revalidates and launches
  the loopback viewer. Graceful shutdown/expiry removes temporary prepared content.
- `--discard-pr DIRECTORY`: removes a valid managed preparation directory.

Use one action at a time; comparison flags apply only to preparation. The generic
`--explainer FILE` path cannot replace the prepared PR workflow: it does not check
current Git evidence. Browser playback needs no active agent turn after launch.
