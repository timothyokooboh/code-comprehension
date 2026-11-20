# Product quiz workflow

The [product-quiz skill](../skills/product-quiz/SKILL.md) asks the existing coding agent
to generate a quiz about one product area or a general system overview. A module is
coherent behaviour and can span directories. Discovery and selection happen in chat;
the shared browser handles answers, feedback, and retakes.

On the first product invocation, the agent asks whether banks should be committed
or kept local. Configuration lives in `.comprehension/config.json`; generated banks
live in `.comprehension/cache/`. These paths belong to the consuming Git project,
regardless of local/global skill installation. PR quizzes do not trigger setup.

Configuration version 1 uses `bankTracking: "git"` or `"local"`. Ask the agent to
change it, or edit the configuration; the next product command reconciles the
managed cache ignore rule. Unrelated rules remain unchanged. Conflicts identify
ignored configuration, ignored banks, or banks already tracked despite local-only
preference. Nothing is automatically committed, pushed, or untracked.

The [runtime contract](../skills/product-quiz/references/runtime.md) documents status,
configuration, validation, saving, and launching. The
[bank format](../skills/product-quiz/references/bank-format.md) retains resolved scope
and questions, never scores or answers. Banks remain after the server stops.
The browser retains its existing current-attempt reload behaviour independently.

The runtime saves cache version 2 with a repository-relative source inventory and
SHA-256 content fingerprints. `--check-product` reports reusable banks, changed inputs requiring review, or a need for
generation; `--refresh` explicitly bypasses reuse. Launch checks again. Source content,
additions/deletions, and supporting inputs matter; timestamps and checkout location
do not. Version-1 banks require regeneration. The runtime excludes cache and common
generated directories; see the runtime contract for exact scope and exclusion rules.

A bank can contain more questions than one sitting. The browser selects up to eight,
and product retakes prioritise questions outside the previous subset before shuffling.
Small banks reuse available questions. Reload preserves the current subset, answers,
and submission state. No past-attempt or topic history is stored, and PR retakes retain
their session questions. Active sessions do not watch source changes. Fingerprints are captured when saving;
the agent must verify its inputs have not changed while generating questions.

Changed inputs require agent review while stored fingerprints remain unchanged.
The agent checks all question content and evidence. Valid banks can be retained using
an explicit review receipt, correcting shifted reference lines; changed behaviour,
uncertainty, or moved source paths require regeneration. Review tokens bind the
confirmation to both bank and source content, and launch checks again. Explicit
refresh always takes the generation path. See the
[source review workflow](../skills/product-quiz/references/source-review.md).

Combined multiple scopes and published runtime bootstrapping remain separate tickets.
