import {
  assessmentTypes,
  explainerIssueCodes,
} from '@code-comprehension/quiz-contract';
import { loadExplainer, ExplainerValidationError } from '../explainer/load.js';
import { readCurrentPrEvidence } from './evidence.js';

export async function loadPrExplainer(directory: string) {
  const session = await readCurrentPrEvidence(directory);
  const data = await loadExplainer(session.explainerPath);
  const comparison = session.manifest.comparison;
  const expectedSnapshot = {
    revision: comparison.head,
    capturedAt: session.manifest.capturedAt,
    includesUncommitted: comparison.includesUncommitted,
  };
  const issues = [];
  if (
    data.type !== assessmentTypes.pr ||
    JSON.stringify(data.comparison) !== JSON.stringify(comparison)
  ) {
    issues.push({
      code: 'custom' as const,
      path: ['comparison'],
      message: '',
      params: { reason: explainerIssueCodes.comparison },
    });
  }
  if (
    data.snapshot.revision !== expectedSnapshot.revision ||
    data.snapshot.capturedAt !== expectedSnapshot.capturedAt ||
    data.snapshot.includesUncommitted !== expectedSnapshot.includesUncommitted
  ) {
    issues.push({
      code: 'custom' as const,
      path: ['snapshot'],
      message: '',
      params: { reason: explainerIssueCodes.comparison },
    });
  }
  if (issues.length) throw new ExplainerValidationError(issues);
  return data;
}
