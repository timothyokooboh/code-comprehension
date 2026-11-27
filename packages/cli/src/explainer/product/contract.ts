import { z } from 'zod';
import {
  explainerLimits,
  explainerSchema,
} from '@code-comprehension/quiz-contract';
import {
  bankSchema,
  productScopeKinds,
  relativeSourcePath,
} from '../../product/bank-contract.js';

export const productExplainerIssues = {
  scope: 'product_explainer_scope',
  context: 'product_explainer_context',
  reference: 'product_explainer_reference',
} as const;

export const productExplainerPlanSchema = z
  .strictObject({
    scopes: z.array(bankSchema.shape.scope).min(1).max(12),
  })
  .superRefine(({ scopes }, context) => {
    if (
      (scopes.some((scope) => scope.kind === productScopeKinds.general) &&
        scopes.length !== 1) ||
      new Set(scopes.map((scope) => scope.name.toLowerCase())).size !==
        scopes.length
    ) {
      context.addIssue({
        code: 'custom',
        path: ['scopes'],
        params: { reason: productExplainerIssues.scope },
      });
    }
  });
export const productExplainerStatuses = { prepared: 'prepared' } as const;
export const productExplainerManifestSchema = z.strictObject({
  version: z.literal(1),
  repo: z.string().min(1),
  plan: productExplainerPlanSchema,
  snapshot: explainerSchema.shape.snapshot,
  sources: z
    .array(
      z.strictObject({
        path: relativeSourcePath,
        hash: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    )
    .min(1),
});
export type ProductExplainerPlan = z.infer<typeof productExplainerPlanSchema>;
export const productExplainerFiles = {
  prefix: 'code-comprehension-product-explainer-',
  manifest: 'session.json',
  content: 'explainer.json',
  maximumManifestBytes: explainerLimits.inputBytes,
} as const;
