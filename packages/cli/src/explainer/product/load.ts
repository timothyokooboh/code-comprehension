import {
  assessmentTypes,
  type QuizValidationIssue,
} from '@code-comprehension/quiz-contract';
import { loadExplainer, ExplainerValidationError } from '../load.js';
import { readProductExplainerSession } from './session.js';
import {
  captureProductExplainerEvidence,
  productExplainerScope,
} from './evidence.js';
import { productExplainerIssues } from './contract.js';
import { CliError, cliErrorCodes } from '../../errors.js';

export async function loadProductExplainer(path: string) {
  const { manifest, explainerPath } = await readProductExplainerSession(path);
  const current = await captureProductExplainerEvidence(
    manifest.repo,
    manifest.plan,
  );
  if (
    current.revision !== manifest.snapshot.revision ||
    current.includesUncommitted !== manifest.snapshot.includesUncommitted ||
    JSON.stringify(current.sources) !== JSON.stringify(manifest.sources)
  )
    throw new CliError(cliErrorCodes.productExplainerChanged);
  const data = await loadExplainer(explainerPath);
  const issues: QuizValidationIssue[] = [];
  function issue(path: (string | number)[], reason: string) {
    issues.push({ code: 'custom', path, message: '', params: { reason } });
  }
  if (
    data.type !== assessmentTypes.product ||
    JSON.stringify(data.scope) !==
      JSON.stringify(productExplainerScope(manifest.plan))
  )
    issue(['scope'], productExplainerIssues.scope);
  if (
    data.snapshot.revision !== manifest.snapshot.revision ||
    data.snapshot.capturedAt !== manifest.snapshot.capturedAt ||
    data.snapshot.includesUncommitted !== manifest.snapshot.includesUncommitted
  )
    issue(['snapshot'], productExplainerIssues.context);
  const paths = new Set(manifest.sources.map((source) => source.path));
  data.scenes.forEach((scene, index) => {
    if (scene.references.some((reference) => !paths.has(reference.path)))
      issue(['scenes', index, 'references'], productExplainerIssues.reference);
  });
  if (data.companion.references.some((reference) => !paths.has(reference.path)))
    issue(['companion', 'references'], productExplainerIssues.reference);
  if (issues.length) throw new ExplainerValidationError(issues);
  return data;
}
