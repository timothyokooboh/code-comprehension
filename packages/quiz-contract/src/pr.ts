import { z } from 'zod';

export const prSessionStatuses = { prepared: 'prepared', noChanges: 'no_changes', valid: 'valid' } as const;

const commitId = z.string().regex(/^[a-f0-9]{40,64}$/);
export const prComparisonSchema = z.strictObject({
  target: z.string().min(1),
  baseline: commitId,
  head: commitId,
  includesUncommitted: z.boolean(),
  files: z.array(z.string().min(1)),
});
export type PrComparison = z.infer<typeof prComparisonSchema>;
