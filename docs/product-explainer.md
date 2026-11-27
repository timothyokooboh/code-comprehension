# Product and architecture explainers

Invoke `/product-explainer` in the consuming project. A fresh unscoped request asks
for modules or General system architecture. Explicit requests such as
`/product-explainer payment integration & cart` proceed with those resolved modules;
compound names are preserved. Architecture is a dedicated scope taken on its own.

The skill works independently of product-quiz and does not run bank-tracking setup.
The agent reads current code, generates one connected silent walkthrough, and provides
The essentials below it. The total presentation remains bounded to 180 seconds and
500 companion words, even across several modules. The existing production viewer
provides playback, chapters, diagrams, and references.

## Runtime workflow

Resolve a compatible installed runtime or build this pre-release checkout. The
consuming project does not install frontend dependencies. Follow the installable
skill's local runtime reference for the scope-plan shape and command options.

```text
current request → scope selection → temporary scope plan
  → --prepare-product-explainer PLAN --repo PROJECT
  → read captured sources and author explainer.json
  → --validate-product-explainer DIRECTORY
  → --product-explainer DIRECTORY
  → graceful close/expiry removes temporary content
```

Preparation captures source hashes, repository revision, and dirty state. Relevant
source changes, inventory changes, HEAD changes, or a changed dirty-state flag reject
validation/launch. A fresh invocation captures current evidence and generates again.
The open viewer never silently changes; launch a new session for an explicit replacement.

File references must belong to the prepared inventory. Expand a plan and prepare
again if generation discovers supporting evidence that was omitted. Structural and
freshness checks cannot prove explanation quality or factual correctness. The agent
must inspect claims against the cited code and distinguish inference from documented
intent, and tests read from tests run.

Temporary preparation data is bounded to 256 KiB. There is no explainer cache/history
and no `.comprehension` write. Unresolved generation, validation, or launch failures
use `--discard-product-explainer DIRECTORY`; retain the path for cleanup after crashes.

## Scope guidance review cases

These are agent-instruction review cases, not claims of automated model conformance.
The public CLI tests exercise the resulting explicit plans and runtime behaviour.

| Current request | Required decision |
| --- | --- |
| `/product-explainer` after any previous selection | Ask again and wait; no inherited scope |
| “Explain this codebase” | Ask; do not silently choose architecture |
| “Explain caching” with an evident module | State resolved module and proceed |
| “Payment integration & cart” | One combined walkthrough for both modules |
| “Identity and access management” matching one module | Preserve the compound module name |
| “General system architecture” | One dedicated architecture scope |
| “Architecture and cart” | Clarify; architecture cannot be mixed with module scopes |
| Multiple matching meanings of “payments” | Clarify the actual ambiguity |
| “Replay the current explainer” | Continue the existing presentation |
| Fresh unscoped `/product-quiz` after an explainer | Ask independently; do not inherit scope |

Genuine interactive multi-select is preferred. Tools offering only a single choice
must fall back to a numbered chat list accepting multiple numbers/names. A selection
reply completes the pending choice instead of restarting the prompt.

## Shared guidance

Edit canonical files in `docs/agents/` and run `pnpm sync:skill-references`. Each
installable skill has local copies of its required scope, architecture, or presentation
reference. Quiz and explainer scope semantics share one source; quizzes remain
independently invokable and ask fresh reasoning questions rather than sentence recall.

## Manual review results

Two real repository walkthroughs were authored from current code, validated through
the prepared workflow, and visually inspected at 1366×768:

- Product explainer lifecycle: two scenes, 24 seconds. Claims checked against the
  preparation, evidence, loader, and server cleanup implementations.
- General system architecture: three scenes, 36 seconds. Claims checked against skill
  orchestration, command dispatch, PR/product evidence, the shared contract, and Vue
  loading/rendering boundaries. The walkthrough describes responsibilities and flows,
  not a random collection of module facts.

Both launched without a bank-setup command, displayed their selected scope and The
essentials, and removed their temporary preparation directories on graceful stop.
These are recorded implementation checks, not persistent reusable explainer banks.
