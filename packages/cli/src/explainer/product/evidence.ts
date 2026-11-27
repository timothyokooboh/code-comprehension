import { projectGit } from '../../product/project.js';
import { captureSourceInventory } from '../../product/sources.js';
import { CliError, cliErrorCodes } from '../../errors.js';
import { productScopeKinds } from '../../product/bank-contract.js';
import { messages } from '../../locales/en.js';
import type { ProductExplainerPlan } from './contract.js';

export function productExplainerScope(plan: ProductExplainerPlan) {
  return plan.scopes.map((scope) =>
    scope.kind === productScopeKinds.general
      ? messages.product.architectureScope
      : scope.name,
  );
}
export async function captureProductExplainerEvidence(
  repo: string,
  plan: ProductExplainerPlan,
) {
  const inventory = new Map<string, string>();
  for (const scope of plan.scopes) {
    const sources = await captureSourceInventory(repo, scope);
    if (!sources.length || sources.some((source) => source.hash === null))
      throw new CliError(cliErrorCodes.productSourcesUnavailable);
    for (const source of sources) inventory.set(source.path, source.hash!);
  }
  const revision = (await projectGit(repo, ['rev-parse', 'HEAD'])).trim();
  const includesUncommitted =
    (await projectGit(repo, ['status', '--porcelain', '-z'])).length > 0;
  return {
    revision,
    includesUncommitted,
    sources: [...inventory]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, hash]) => ({ path, hash })),
  };
}
