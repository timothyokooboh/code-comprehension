# PR explainer workflow

Install `pr-explainer` from this repository with the skills installer, then invoke
`/pr-explainer` in the consuming project. It works independently of `pr-quiz` and
never starts an assessment or opens a PR automatically. During the pre-release
phase, use a built runtime from this checkout; see the skill's local runtime guide.

The agent resolves the target, prepares current Git evidence, reads the implementation,
and writes a silent presentation to the returned `explainerPath`. Preparation includes
feature commits, staged/unstaged final state, and non-ignored untracked files. An
ambiguous direct-to-target comparison needs an explicit baseline. Empty comparisons
stop with guidance; small changes get short, honest explanations.

```sh
node /path/to/code-comprehension/packages/cli/dist/index.js --prepare-pr --repo /path/to/project --target origin/main
# Author explainer.json at the returned path, using comparison/snapshot verbatim.
node /path/to/code-comprehension/packages/cli/dist/index.js --validate-pr-explainer /returned/session
node /path/to/code-comprehension/packages/cli/dist/index.js --pr-explainer /returned/session
```

Validation failures preserve repairable data and identify fields. A changed comparison
requires fresh evidence and regenerated content, not a metadata edit. The viewer shows
the captured baseline, target, revision, and uncommitted state. Stop the process
gracefully to remove temporary content; `--discard-pr` cleans up abandoned sessions.
Runtime expiry also cleans up the PR content. No product configuration or cache is used.

## Manual evidence review

For this implementation, the real branch walkthrough focuses on the new PR explainer
workflow. Check each generated claim against these source operations before launch:

- `packages/cli/src/pr/session.ts`: prepared output paths and captured source metadata.
- `packages/cli/src/pr/evidence.ts`: comparison recapture and fingerprint rejection.
- `packages/cli/src/pr/explainer.ts`: validation against preparation metadata.
- `packages/cli/src/commands.ts`: independent explainer validation/launch dispatch.
- `packages/cli/src/server.ts`: close-time cleanup, also used by expiry.

Distinguish this focused scope from unrelated pre-existing working-tree edits included
in the comparison. Check that the text does not claim validation proves factual
correctness, or that playback needs an active agent. Inspect the same generated JSON
through validation and the browser, then verify its temporary directory is removed.
Automation separately covers committed-only and mixed final-state evidence, invalid
content repair, forged metadata, stale launch rejection, and a four-second small-change
browser walkthrough. Existing PR comparison tests cover ambiguity and empty diffs.

Manual run result: a three-scene, 30-second walkthrough was validated, launched,
visually inspected at 1366×768, and checked against the source operations above.
Graceful shutdown removed its preparation directory. This is a recorded review of
the implementation snapshot, not a reusable explainer bank.

## Shared skill reference maintenance

Edit `docs/agents/pr-evidence.md`, then run `pnpm sync:skill-references`. Commit both
generated copies. Each installable skill carries its own local copy, so selecting just
one skill or installing it globally does not create a dependency on a sibling skill.
The generated header identifies the canonical source; edit that source rather than a copy.
