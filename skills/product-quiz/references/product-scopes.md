<!-- Generated from docs/agents/product-scopes.md by scripts/sync-skill-references.mjs. -->

# Product scope selection

Resolve scope from the current invocation. Every fresh unscoped request presents
module choices and waits for an explicit selection, even within the same chat.
A previous quiz/explainer, reusable bank, or running viewer never selects the new
scope. A bare command or “explain/test my understanding of this codebase” is unscoped,
not an implicit selection of General system architecture.

Infer candidate modules from domain docs, workspace structure, routes, services,
tests, and implementation relationships. A module is coherent behaviour, not
necessarily a directory. Offer short descriptions and one or more module selections,
with General system architecture as an alternative taken on its own.

Use an interactive question tool only if it supports genuine multi-select. Otherwise
present a numbered list in chat and accept multiple numbers/names in one reply.
A preselected item is not a submitted answer. Wait before generation or launch.
A reply completes the pending selection; it does not restart this step.

Resolve explicit arguments and natural language against the code. “Payment integration
& cart” and “explain payment integration and cart” select both when those areas exist.
“Identity and access management” can be one compound module name. Do not split blindly
on “and”. State clear resolved scopes and proceed without asking again; clarify real
ambiguity, including architecture mixed with individual modules.

An explicit request to resume/replay/refine an active session continues that session.
A new request, including a quiz after an explainer, starts fresh scope resolution.
Scope selection does not authorize quiz bank setup for an explainer.
