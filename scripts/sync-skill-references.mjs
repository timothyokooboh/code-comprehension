import { readFile, writeFile } from 'node:fs/promises';

const references = [
  { source: 'pr-evidence', name: 'pr-evidence', skills: ['pr-quiz', 'pr-explainer'] },
  { source: 'product-scopes', name: 'product-scopes', skills: ['product-quiz', 'product-explainer'] },
  { source: 'architecture-evidence', name: 'architecture-evidence', skills: ['product-quiz', 'product-explainer'] },
  { source: 'explainer-presentation', name: 'presentation', skills: ['pr-explainer', 'product-explainer'] },
];
for (const reference of references) {
  const source = `docs/agents/${reference.source}.md`;
  const content = await readFile(new URL(`../${source}`, import.meta.url), 'utf8');
  const header = `<!-- Generated from ${source} by scripts/sync-skill-references.mjs. -->\n\n`;
  for (const skill of reference.skills) {
    await writeFile(new URL(`../skills/${skill}/references/${reference.name}.md`, import.meta.url), header + content);
  }
}
