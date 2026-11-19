# PR quiz workflow

The `pr-quiz` skill lives in `skills/pr-quiz`. It directs the existing coding agent to
prepare a comparison, generate code-grounded questions, validate them, and launch the
local browser. It does not open a PR or enforce a merge gate. Product setup and caches
are not involved.

During development, build the runtime with `pnpm build`, then use its absolute entry
path from any consuming repository:

```sh
node /path/to/code-comprehension/packages/cli/dist/index.js --prepare-pr --repo /path/to/project --target origin/main
```

The JSON response gives `directory`, `diffPath`, and `quizPath`. Read the diff and
surrounding implementation, then write a PR quiz to `quizPath` using the generation
and format references linked from the skill. The runtime's diff includes committed,
staged, unstaged, and non-ignored untracked changes as the final working-tree state.
It does not stage or modify project files. Resolve conflicts before preparing.

```sh
node /path/to/code-comprehension/packages/cli/dist/index.js --validate-pr /returned/session/directory
node /path/to/code-comprehension/packages/cli/dist/index.js --pr-session /returned/session/directory
```

Use `--baseline REF` with preparation for an explicitly confirmed comparison commit,
particularly when working directly on the target branch. Otherwise the merge base is
used. Missing refs and unresolved Git comparisons produce actionable failures; the
runtime does not silently fetch or choose a previous commit. No changes returns a
`no_changes` result without creating a session. Meaningless/trivial changes are an
agent judgment: explain and discard, without generating filler or a perfect score.

The runtime checks the comparison fingerprint again during validation and launch.
Changed code requires a new session and regenerated questions. The browser shows the
baseline commit, target, and inclusion of uncommitted changes. Changes after launch
are not watched; launch a fresh quiz to assess subsequent edits.

Invalid question data remains available for repair. The skill permits two repair
attempts after the initial failure and never launches invalid data. Explanation
quality is reviewed by the generating agent, not established by a schema/word-count
check. Concise gives the answer and reason; explanatory adds useful context.

Sessions use private temporary directories outside the project. Normal SIGINT/SIGTERM
shutdown removes the session, including its diff and questions. Abandoned sessions
and leftovers from a crash can be removed with `--discard-pr DIRECTORY`. Do not
supply unrelated directories. A launch failure retains the session for retry or
explicit discard. Force termination cannot guarantee cleanup.

PR selection state uses browser **session storage**, surviving a reload in that tab
without creating a local-storage question bank. Close the quiz tab when finished.
Runtime-assigned session IDs prevent a new invocation from restoring an old attempt.
Product quiz reload state continues to use local storage. There is no score history.

The pre-release skill expects an available built runtime. Published npm installation
and versioned automatic bootstrap remain ticket #11; do not assume a package exists.
