import { createHash } from 'node:crypto';

// Bind confirmation to both the exact bank and the current input inventory/content.
export function createReviewToken(bank: unknown, sources: unknown) {
  return createHash('sha256').update(JSON.stringify({ bank, sources })).digest('hex');
}
