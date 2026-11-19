# Runtime commands

`RUNTIME` below means an already located executable, not a literal command.
Use `code-comprehension` if installed and its `--help` lists the PR options.
For this pre-release repository, build the runtime in the code-comprehension checkout
with `pnpm install` and `pnpm build`, then invoke
`node /absolute/path/to/code-comprehension/packages/cli/dist/index.js`.
Run the quiz against the consuming repository using `--repo`; do not build inside it.
If the built runtime is unavailable, ask for its location or explain that the npm
bootstrap/distribution is still tracked in ticket #11. Skill installation alone does
not supply a runtime in this milestone.

- `--prepare-pr --repo PATH --target REF [--baseline REF]`: outputs JSON with
  `status: "prepared"`, `directory`, `diffPath`, `quizPath`, and `comparison`, or
  `status: "no_changes"` and `comparison`. Requires an existing Git commit and refs.
- `--validate-pr DIRECTORY`: validates generated `quiz.json` and confirms scope has
  not changed. Outputs `{"status":"valid"}` on success; nonzero exit and actionable
  diagnostics on failure. Does not start a server or delete repairable data.
- `--pr-session DIRECTORY [--no-open] [--port NUMBER]`: revalidates, serves the quiz
  on loopback, and removes the temporary directory after graceful shutdown.
- `--discard-pr DIRECTORY`: removes an abandoned, valid managed session directory.

Use one action at a time. Comparison flags only apply to preparation. The runtime
assigns the session quiz ID and comparison metadata; the agent supplies question data.

Comparisons use the merge base of HEAD and TARGET unless BASELINE is supplied, in
which case that exact commit is used. Staged and unstaged versions are collapsed into
the final working-tree state. Untracked non-ignored files are included. No index or
working-tree changes are made. Resolve merge conflicts before preparing a quiz.
