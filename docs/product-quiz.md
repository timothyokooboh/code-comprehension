# Product quiz workflow

The [product-quiz skill](../skills/product-quiz/SKILL.md) asks the existing coding agent
to generate a quiz about one or more product areas or a general system architecture. A module is
coherent behaviour and can span directories. Discovery and selection happen in chat;
the shared browser handles answers, feedback, and retakes.

Every fresh request without an explicit scope asks the engineer to select one or
more modules, or General system architecture. Prefer the agent's interactive multi-select UI
when supported; otherwise accept multiple names or numbers in chat. General system architecture
is chosen on its own. “Quiz me on this codebase” is unscoped; neither
a previous choice nor an available cached bank chooses the scope for a new request.
Explicit scopes proceed directly when clear. Replies to a pending selection and
requests to resume, retake, or refine an existing quiz continue that assessment.

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

A bank can contain more questions than one sitting. The browser selects up to the resolved count (10 by default),
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

Multiple module banks are checked and maintained independently, then composed with
`--product-bank payments cart`. General system architecture is an alternative launched alone.
Sampling spreads coverage across selected banks within the question limit. The limit
is never increased to cover additional banks; some areas may be absent in a small sitting. Stable namespaced question IDs prevent collisions, and exact
prompt/option/answer duplicates appear once, contributing to both scopes' coverage.
Retakes keep the same limit and prioritise questions outside the previous draw.

Interaction questions use a separate module bank only when code demonstrates the
relationship. Its scope includes the connecting code and supporting inputs from the
participating modules, so changes trigger the same review flow. Combined assessments
are built in memory; no combined cache or score history is stored.
Published runtime bootstrapping remains a separate ticket.

## Refinement through agent chat

An engineer can challenge a displayed question or request a scope/difficulty change
in their existing agent chat. The runtime exposes the current question pool and
browser-reported numbering through `--active-assessment URL`, without selections
or scores. The agent checks code evidence and follows the
[revision workflow](../skills/pr-quiz/references/revisions.md).

`--revise-assessment RECEIPT --runtime URL` validates the replacement and rejects
stale revisions or display mappings. The open form stays unchanged; after success,
the engineer reloads to begin a new attempt with cleared answers and score. Failed
revisions leave the old attempt usable. PR revisions recheck their comparison and
retain managed temporary cleanup; product revisions load independently validated
saved banks under the existing tracking preference. No score history is created.

## Questions per sitting

Set `questionsPerSession` in `.comprehension/config.json` to change the product default
(10 when absent). New project setup saves 10 without another setup question. The value
must be a positive whole number, and changing bank tracking preserves it.

A request such as “quiz me on caching with 5 questions” uses `--questions 5` with
`--product-bank`, overriding the count only for that session. Retakes and revisions
retain it; a product revision may explicitly set `input.questionsPerSession` to change
it for the revised session. Neither override updates project configuration. The count
is capped by available questions, with no padding, and takes priority over covering
every selected module. PR quizzes remain proportional to the changes.

## General system architecture

This is a dedicated assessment of responsibilities, module boundaries, integration,
data/control flow, actual architectural patterns and meaningful failures. It is
authored from current evidence, not random samples drawn from module banks.
Question count and format still follow the current request; a short sitting need
not cover every architectural concern.

The wire kind remains `general`. Newly authored general banks declare
`scope.focus: "system_architecture_v1"`; module banks do not. Existing version-2
general caches without that declaration receive `review_required` /
`architecture_focus`, including when source hashes match. The agent reviews all
content against the [architecture guidance](../skills/product-quiz/references/architecture.md),
then either explicitly retains it with `reviewedFocus: "system_architecture_v1"`
or generates a replacement. Ordinary source-review confirmation cannot upgrade
the bank, and unrelated module caches remain intact. Semantic review does not
replace normal source freshness checks or prove factual accuracy automatically.
