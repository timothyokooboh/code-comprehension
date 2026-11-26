import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { runCli, launchCli } from '../support/cli.js';
const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/explainer.json', import.meta.url), 'utf8'),
);

test('validated explainers launch as a fixed read-only snapshot without changing quiz endpoints', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'explainer-'));
  const input = join(directory, 'input.json');
  writeFileSync(input, JSON.stringify(fixture));
  try {
    const validation = runCli(['--validate-explainer', input]);
    expect(validation.status, validation.stderr).toBe(0);
    const app = await launchCli(['--explainer', input]);
    try {
      const response = await fetch(`${app.url}/api/explainer`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(fixture);
      writeFileSync(
        input,
        JSON.stringify({ ...fixture, title: 'A later replacement' }),
      );
      expect(
        (await (await fetch(`${app.url}/api/explainer`)).json()).title,
      ).toBe(fixture.title);
      expect(
        (await fetch(`${app.url}/api/explainer`, { method: 'POST' })).status,
      ).toBe(405);
      expect(
        (
          await fetch(`${app.url}/api/explainer`, {
            headers: { Origin: 'https://example.com' },
          })
        ).status,
      ).toBe(403);
      expect((await fetch(`${app.url}/explainer`)).status).toBe(200);
    } finally {
      await app.stop();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('validation rejects aggregate limits and broken diagram relationships with repair paths', () => {
  const directory = mkdtempSync(join(tmpdir(), 'explainer-validation-'));
  const input = join(directory, 'input.json');
  function validate(value: unknown) {
    writeFileSync(input, JSON.stringify(value));
    return runCli(['--validate-explainer', input]);
  }
  try {
    const long = structuredClone(fixture);
    long.scenes = Array.from({ length: 4 }, (_, index) => ({
      ...structuredClone(fixture.scenes[0]),
      id: `scene-${index}`,
      beats: [
        { text: 'A point', durationSeconds: 30, activeNodes: [] },
        { text: 'Another point', durationSeconds: 30, activeNodes: [] },
      ],
    }));
    expect(validate(long).stderr).toContain('180');
    const wordy = structuredClone(fixture);
    wordy.companion.paragraphs = ['word '.repeat(251), 'word '.repeat(250)];
    expect(validate(wordy).stderr).toContain('500');
    const broken = structuredClone(fixture);
    broken.scenes[0].edges[0].to = 'missing';
    expect(validate(broken).stderr).toContain('scenes.0.edges');
    const duplicate = structuredClone(fixture);
    duplicate.scenes[1].id = duplicate.scenes[0].id;
    expect(validate(duplicate).status).toBe(1);
    const unsafe = structuredClone(fixture);
    unsafe.scenes[0].script = 'alert(1)';
    expect(validate(unsafe).status).toBe(1);
    const path = structuredClone(fixture);
    path.companion.references[0].path = '../../secret';
    expect(validate(path).status).toBe(1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('the exact aggregate ceilings are accepted, oversized data and inconsistent PR snapshots are rejected', () => {
  const directory = mkdtempSync(join(tmpdir(), 'explainer-boundaries-'));
  const input = join(directory, 'input.json');
  function validate(value: unknown) {
    writeFileSync(input, JSON.stringify(value));
    return runCli(['--validate-explainer', input]);
  }
  try {
    const boundary = structuredClone(fixture);
    boundary.scenes = Array.from({ length: 3 }, (_, index) => ({
      ...structuredClone(fixture.scenes[0]),
      id: `scene-${index}`,
      beats: [
        { text: 'First point', durationSeconds: 30, activeNodes: [] },
        { text: 'Second point', durationSeconds: 30, activeNodes: [] },
      ],
    }));
    boundary.companion.paragraphs = ['word '.repeat(250), 'word '.repeat(250)];
    expect(validate(boundary).status).toBe(0);
    const pr = { ...fixture, type: 'pr' };
    expect(validate(pr).stderr).toContain('comparison');
    expect(
      validate({ ...fixture, title: '<script>alert(1)</script>' }).status,
    ).toBe(0);
    writeFileSync(input, ' '.repeat(256 * 1024 + 1));
    expect(runCli(['--explainer', input]).status).toBe(1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
