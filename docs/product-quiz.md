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

This milestone generates fresh questions per invocation. Deterministic source
freshness checks/reuse, combined multiple scopes, and published runtime bootstrapping
are separate tickets. Saved banks are not yet a freshness guarantee.
