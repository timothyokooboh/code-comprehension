# Multiple scopes

## Resolve and maintain independent banks

Keep one bank per resolved module. Match saved scope metadata to the engineer's intent;
use the same IDs on subsequent requests, including when request order changes. Run
`--check-product --format FORMAT` separately for each selected bank. Keep reusable banks unchanged,
review only those requiring review, and generate missing/invalidated banks or banks lacking the requested question types.
An explicit request to refresh the entire assessment applies to every selected bank;
a refresh of one named module affects that bank and any interaction bank whose evidence
changed. Complete each bank's validation and save/review before combined launch.

## Ground interactions

Inspect actual call paths, events, shared state, or contracts connecting selected
modules. If a useful interaction is supported, reuse or generate a separate `module`
bank with a stable ID for that relationship, such as `cart-payment-checkout`. Give it
a descriptive scope name, include the connecting implementation in `sourcePatterns`,
and include relevant participant code/configuration/tests in `supportingFiles` and
question references. Check this bank independently with the same cache/review commands.
Its questions should test the relationship, not repeat standalone module questions.

Example: code shows checkout creates a payment from a cart total and clears the cart
only after a confirmed payment. A question can ask what happens to the cart on payment
failure, citing the actual handler and payment contract. If code has no connection
between a reporting module and a theme editor, compose their independent banks without
interaction questions. If a previously cached connection has disappeared, omit that
interaction bank and explain the change; never launch obsolete relationships.

Review all selected prompts for accidental duplicates. Runtime composition collapses
exact prompt/option/answer duplicates (ignoring IDs and option order); it cannot detect
semantic paraphrases. Prefer existing stable question IDs and keep each standalone
bank useful on its own. Do not invent extra questions merely to create variety.

## Launch once

When every selected module and supported interaction bank is reusable, run:

```sh
RUNTIME --product-bank payments cart cart-payment-checkout --repo PROJECT --format FORMAT
```

Omit the interaction ID when there is no grounded interaction bank. The runtime
namespaces colliding local question IDs and builds one assessment in memory. It
spreads coverage across banks within the resolved question count; that count takes
priority when there are more banks than slots. Tell the engineer that some areas
may be absent in that sitting. Shared duplicate questions can cover multiple banks. General system architecture is launched alone rather than combined with
module banks. Tell the engineer the resolved modules and any interaction coverage;
keep answering and feedback in the existing browser and agent-chat flows.

Carry the current format, total and any exact written split into the combined launch.
Type counts and the total are authoritative; cover every selected scope when feasible,
including one deduplicated question supporting several scopes. Explain when quotas or
a small total prevent full coverage. For a mixed sitting, follow the shared written
review workflow immediately after launch.
