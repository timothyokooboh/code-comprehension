import { readFile, writeFile } from 'node:fs/promises';

const source = new URL('../docs/agents/pr-evidence.md', import.meta.url);
const content = await readFile(source, 'utf8');
const header = '<!-- Generated from docs/agents/pr-evidence.md by scripts/sync-skill-references.mjs. -->\n\n';
for (const skill of ['pr-quiz', 'pr-explainer']) {
  await writeFile(new URL(`../skills/${skill}/references/pr-evidence.md`, import.meta.url), header + content);
}
