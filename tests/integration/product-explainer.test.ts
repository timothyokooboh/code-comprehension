import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect } from 'vitest';
import { createRepository } from '../support/repository.js';
import { runCli, launchCli } from '../support/cli.js';

const example = JSON.parse(
  readFileSync(new URL('../fixtures/explainer.json', import.meta.url), 'utf8'),
);
const moduleScope = {
  kind: 'module',
  name: 'Identity and access management',
  description: 'A compound module name',
  sourcePatterns: ['payment.ts'],
  supportingFiles: [],
};

test('product explainers prepare and launch without bank setup, then discard temporary content', async () => {
  const repo = createRepository();
  const temporary = mkdtempSync(join(tmpdir(), 'product-explainer-input-'));
  let directory: string | undefined;
  try {
    const input = join(temporary, 'scopes.json');
    writeFileSync(input, JSON.stringify({ scopes: [moduleScope] }));
    const result = runCli([
      '--prepare-product-explainer',
      input,
      '--repo',
      repo.path,
    ]);
    expect(result.status, result.stderr).toBe(0);
    const prepared = JSON.parse(result.stdout);
    directory = prepared.directory;
    expect(prepared.scope).toEqual(['Identity and access management']);
    expect(
      prepared.sources.map((source: { path: string }) => source.path),
    ).toEqual(['payment.ts']);
    writeFileSync(prepared.explainerPath, '{}');
    expect(
      runCli(['--validate-product-explainer', directory!]).stderr,
    ).toContain('scenes');
    writeFileSync(
      prepared.explainerPath,
      JSON.stringify({
        ...example,
        scope: prepared.scope,
        snapshot: prepared.snapshot,
        scenes: example.scenes.map((scene: object) => ({
          ...scene,
          references: [{ path: 'payment.ts' }],
        })),
        companion: {
          ...example.companion,
          references: [{ path: 'payment.ts' }],
        },
      }),
    );
    expect(runCli(['--validate-product-explainer', directory!]).status).toBe(0);
    const app = await launchCli(['--product-explainer', directory!]);
    try {
      const data = await (await fetch(`${app.url}/api/explainer`)).json();
      expect(data.scope).toEqual(['Identity and access management']);
    } finally {
      await app.stop();
    }
    expect(existsSync(directory!)).toBe(false);
    expect(existsSync(join(repo.path, '.comprehension'))).toBe(false);
  } finally {
    if (directory && existsSync(directory))
      runCli(['--discard-product-explainer', directory]);
    rmSync(temporary, { recursive: true, force: true });
    repo.dispose();
  }
});

test('architecture is a dedicated scope and selected source changes require a fresh invocation', () => {
  const repo = createRepository();
  const temporary = mkdtempSync(join(tmpdir(), 'architecture-explainer-'));
  const sessions: string[] = [];
  try {
    const plan = join(temporary, 'plan.json');
    const architecture = {
      ...moduleScope,
      kind: 'general',
      focus: 'system_architecture_v1',
      name: 'Old generic title',
    };
    writeFileSync(
      plan,
      JSON.stringify({ scopes: [architecture, moduleScope] }),
    );
    expect(
      runCli(['--prepare-product-explainer', plan, '--repo', repo.path]).stderr,
    ).toContain('scopes');
    writeFileSync(plan, JSON.stringify({ scopes: [architecture] }));
    const first = JSON.parse(
      runCli(['--prepare-product-explainer', plan, '--repo', repo.path]).stdout,
    );
    sessions.push(first.directory);
    expect(first.scope).toEqual(['General system architecture']);
    const data = {
      ...example,
      scope: first.scope,
      snapshot: first.snapshot,
      scenes: example.scenes.map((scene: object) => ({
        ...scene,
        references: [{ path: 'payment.ts' }],
      })),
      companion: { ...example.companion, references: [{ path: 'payment.ts' }] },
    };
    writeFileSync(first.explainerPath, JSON.stringify(data));
    expect(
      runCli(['--validate-product-explainer', first.directory]).status,
    ).toBe(0);
    repo.write('payment.ts', 'export const retries = 4;\n');
    const stale = runCli(['--product-explainer', first.directory, '--no-open']);
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain('changed since preparation');
    const next = JSON.parse(
      runCli(['--prepare-product-explainer', plan, '--repo', repo.path]).stdout,
    );
    sessions.push(next.directory);
    expect(next.sources[0].hash).not.toBe(first.sources[0].hash);
    expect(next.directory).not.toBe(first.directory);
    expect(existsSync(join(repo.path, '.comprehension'))).toBe(false);
  } finally {
    for (const directory of sessions)
      runCli(['--discard-product-explainer', directory]);
    rmSync(temporary, { recursive: true, force: true });
    repo.dispose();
  }
});

test('combined modules share one duration/prose budget and references stay within captured evidence', () => {
  const repo = createRepository();
  const temporary = mkdtempSync(join(tmpdir(), 'combined-explainer-'));
  let directory: string | undefined;
  try {
    repo.write('cart.ts', 'export const items = [];\n');
    const plan = join(temporary, 'plan.json');
    writeFileSync(
      plan,
      JSON.stringify({
        scopes: [
          moduleScope,
          { ...moduleScope, name: 'Cart', sourcePatterns: ['cart.ts'] },
        ],
      }),
    );
    const prepared = JSON.parse(
      runCli(['--prepare-product-explainer', plan, '--repo', repo.path]).stdout,
    );
    directory = prepared.directory;
    expect(prepared.scope).toEqual(['Identity and access management', 'Cart']);
    function validate(data: unknown) {
      writeFileSync(prepared.explainerPath, JSON.stringify(data));
      return runCli(['--validate-product-explainer', directory!]);
    }
    const data = {
      ...example,
      scope: prepared.scope,
      snapshot: prepared.snapshot,
    };
    expect(validate(data).stderr).toContain('references');
    data.scenes = data.scenes.map((scene: object) => ({
      ...scene,
      references: [{ path: 'payment.ts' }],
    }));
    data.companion.references = [{ path: 'cart.ts' }];
    expect(validate(data).status).toBe(0);
    const long = {
      ...data,
      scenes: Array.from({ length: 4 }, (_, index) => ({
        ...data.scenes[0],
        id: `scene-${index}`,
        beats: [
          { text: 'First point', durationSeconds: 30, activeNodes: [] },
          { text: 'Second point', durationSeconds: 30, activeNodes: [] },
        ],
      })),
    };
    expect(validate(long).stderr).toContain('180');
    expect(
      validate({
        ...data,
        companion: { ...data.companion, paragraphs: ['word '.repeat(501)] },
      }).stderr,
    ).toContain('500');
    expect(
      validate({
        ...data,
        snapshot: { ...data.snapshot, capturedAt: '2020-01-01T00:00:00Z' },
      }).stderr,
    ).toContain('snapshot');
  } finally {
    if (directory) runCli(['--discard-product-explainer', directory]);
    rmSync(temporary, { recursive: true, force: true });
    repo.dispose();
  }
});
