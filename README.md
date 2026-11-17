# Code Comprehension

Local quizzes that help engineers understand the code they ship.

## Development

Use Node.js 24.13 or newer and pnpm 10.34.9 (the pinned package manager).

```sh
pnpm install
pnpm build
pnpm start
```

The CLI opens the built UI on a free loopback port. Stop it with Ctrl+C.
For a headless session, use `pnpm start --no-open`; the URL is printed in the terminal.
Use `--port <number>` to choose a port, or omit it to avoid port conflicts.

This first milestone provides the local application foundation. Quiz generation,
answering, and installable product skills arrive in subsequent tickets.

## Workspace

- `apps/web`: Vue 3 UI, built with Vite and Tailwind.
- `packages/cli`: Commander CLI and local HTTP server.
- `packages/quiz-contract`: shared runtime/quiz contracts consumed by both applications.

Keep runtime responsibilities in focused modules. The shared contract has no
Vue or Node dependencies. The production CLI bundles internal workspace code;
its runtime dependencies and prebuilt web assets travel with the npm package.

## Checks

```sh
pnpm typecheck
pnpm test
```

`pnpm test` builds the application, runs Vitest integration tests, then runs
Playwright against the actual built CLI. Install Chromium once before browser tests:

```sh
pnpm exec playwright install chromium
```

For a focused loop after building, run `pnpm test:unit` or `pnpm test:e2e`.

## Packaging

```sh
pnpm pack:cli
```

This produces `artifacts/code-comprehension.tgz`, containing the executable and
compiled UI. A consuming project does not need Vue, Vite, or a frontend build.
The package remains private until the distribution milestone establishes its
published name and release process.
