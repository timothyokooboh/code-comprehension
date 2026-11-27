# Product explainer runtime

Resolve an installed `code-comprehension` whose help lists `--product-explainer`.
For this pre-release checkout, build the code-comprehension runtime with `pnpm install`
and `pnpm build`, then use Node with its absolute `packages/cli/dist/index.js` path.
Do this in the runtime checkout, not the consuming project. If unavailable, ask for
its location; npm bootstrap remains #11. Do not invent a published version or install
Vue/Motion Canvas into the project being explained.

Write a temporary scope-plan JSON file:

```json
{"scopes":[
  {"kind":"module","name":"Payment integration","description":"Provider calls and retries","sourcePatterns":["src/payments"],"supportingFiles":["src/checkout.ts"]},
  {"kind":"module","name":"Cart","description":"Checkout inputs","sourcePatterns":["src/cart"],"supportingFiles":[]}
]}
```

Replace paths/names with actual code boundaries. A compound name is one object, not
several. For architecture use exactly one scope with `kind: "general"`,
`focus: "system_architecture_v1"`, a description, sourcePatterns and supportingFiles.
Its displayed name is canonical General system architecture. At most 12 distinct
scopes are accepted. Every scope must resolve to existing source evidence.

- `--prepare-product-explainer PLAN --repo PROJECT`: reads current Git-managed and
  non-ignored source files, excluding build/cache/dependency directories. Returns
  `directory`, `explainerPath`, `scope`, `snapshot`, and `sources` with hashes.
- `--validate-product-explainer DIRECTORY`: validates the presentation, exact prepared
  scope/snapshot and source references, and rechecks current source inventory/content.
- `--product-explainer DIRECTORY [--no-open] [--port NUMBER]`: revalidates, starts the
  production viewer on loopback, and cleans temporary content on shutdown/expiry.
- `--discard-product-explainer DIRECTORY`: cleans an abandoned valid managed session.

Use one action at a time; --repo belongs to preparation. No quiz setup or cache
commands are involved. Inputs and session manifests are bounded to 256 KiB. A Git
repository with a commit is required. Stage/commit changes only if separately asked;
working-tree evidence is supported directly. A new session, rather than overwriting
an open explanation, is the supported replacement flow.
