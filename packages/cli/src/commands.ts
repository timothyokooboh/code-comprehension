import { closeRecovery } from './written-review/recovery.js';
import { requestReview } from './written-review/client.js';
import { resolve } from 'node:path';
import { projectRoot } from './product/project.js';
import { readActiveAssessment, reviseAssessment } from './assessment/client.js';
import { questionFormats, type QuestionFormat, assessmentSourceKinds, prSessionStatuses } from '@code-comprehension/quiz-contract';
import { loadExplainer } from './explainer/load.js';
import { messages } from './locales/en.js';
import { launchExplainer, launch, launchAssessment } from './launch.js';
import { preparePr, discardPr } from './pr/session.js';
import { loadPrAssessment } from './pr/assessment.js';
import { CliError, cliErrorCodes } from './errors.js';
import { loadProductBank, saveProductBank, productAssessment } from './product/bank.js';
import { reconcileProductSetup, configureProduct } from './product/config.js';
import { retainProductBank } from './product/review.js';
import { cacheStatuses, inspectProductCache } from './product/cache.js';
import { productStatuses } from './product/contract.js';

type CommandOptions = {
  explainer?: string; validateExplainer?: string;
  resumeReview?: string; closeReview?: string; waitReview?: string; reviewFeedback?: string; reviewFailure?: string; reviewSession?: string;
  format?: QuestionFormat; writtenQuestions?: number;
  port: number; open: boolean; quiz?: string; questions?: number; devUi?: string;
  activeAssessment?: string; reviseAssessment?: string; runtime?: string;
  retainProduct?: string; checkProduct?: string; refresh?: boolean; productStatus?: boolean; configureProduct?: string;
  validateProduct?: string; saveProduct?: string; productBank?: string[];
  preparePr?: boolean; target?: string; baseline?: string; repo?: string;
  discardPr?: string; validatePr?: string; prSession?: string;
};

function validateOptions(options: CommandOptions) {
  if ((options.format && !options.checkProduct && !options.productBank) ||
    (options.writtenQuestions !== undefined && (!options.productBank || options.format !== questionFormats.mixed))) throw new CliError(cliErrorCodes.questionFormatInvalid);
  if (options.questions !== undefined && !options.productBank) throw new CliError(cliErrorCodes.questionCountInvalid);
  const modes = [
    options.explainer, options.validateExplainer,
    options.resumeReview, options.closeReview, options.waitReview, options.reviewFeedback, options.reviewFailure, options.activeAssessment, options.reviseAssessment, options.preparePr, options.discardPr, options.validatePr, options.prSession, options.quiz,
    options.retainProduct, options.checkProduct, options.productStatus, options.configureProduct, options.validateProduct, options.saveProduct, options.productBank,
  ].filter((value) => value !== undefined && value !== false);
  const hasComparisonOptions = options.target !== undefined || options.baseline !== undefined;
  if (options.devUi && modes.length && !options.explainer && !options.quiz && !options.productBank && !options.prSession && !options.resumeReview) {
    throw new CliError(cliErrorCodes.prOptionsInvalid);
  }
  const acceptsRepo = options.retainProduct || options.checkProduct || options.preparePr || options.productStatus || options.configureProduct || options.saveProduct || options.productBank;
  if (Boolean(options.reviewFeedback || options.reviewFailure) !== Boolean(options.reviewSession)) throw new CliError(cliErrorCodes.prOptionsInvalid);
  if ((Boolean(options.runtime) !== Boolean(options.reviseAssessment)) || (options.refresh && !options.checkProduct) || modes.length > 1 || (hasComparisonOptions && !options.preparePr) ||
    (options.preparePr && !options.target) || (options.repo !== undefined && !acceptsRepo)) {
    throw new CliError(cliErrorCodes.prOptionsInvalid);
  }
}

export async function runCommand(options: CommandOptions) {
  validateOptions(options);
  if (options.validateExplainer) {
    await loadExplainer(options.validateExplainer);
    console.log(messages.explainer.valid);
  } else if (options.explainer) {
    await launchExplainer(options, await loadExplainer(options.explainer));
  } else if (options.resumeReview) {
    await launchAssessment(options, null);
  } else if (options.closeReview) {
    closeRecovery(options.closeReview);
  } else if (options.waitReview || options.reviewFeedback || options.reviewFailure) {
    console.log(JSON.stringify(await requestReview(options.waitReview ?? options.reviewSession!, options.reviewFeedback ?? options.reviewFailure, Boolean(options.reviewFailure))));
  } else if (options.activeAssessment) {
    console.log(JSON.stringify(await readActiveAssessment(options.activeAssessment)));
  } else if (options.reviseAssessment && options.runtime) {
    console.log(await reviseAssessment(options.runtime, options.reviseAssessment));
  } else if (options.retainProduct) {
    console.log(JSON.stringify(await retainProductBank(options.repo ?? process.cwd(), options.retainProduct)));
  } else if (options.checkProduct) {
    const result = await inspectProductCache(options.repo ?? process.cwd(), options.checkProduct, options.refresh, options.format ?? questionFormats.mcq);
    if (result.status === cacheStatuses.reviewRequired) {
      const { bank, current: _current, ...report } = result;
      console.log(JSON.stringify({ ...report, scope: bank.scope }));
    } else {
      console.log(JSON.stringify(result.status === cacheStatuses.reusable ? { status: result.status, scope: result.bank.scope, conflicts: result.conflicts } : result));
    }
  } else if (options.validateProduct) {
    await loadProductBank(options.validateProduct);
    console.log(JSON.stringify({ status: productStatuses.valid }));
  } else if (options.saveProduct) {
    console.log(JSON.stringify(await saveProductBank(options.repo ?? process.cwd(), options.saveProduct)));
  } else if (options.productBank) {
    const repo = await projectRoot(options.repo ?? process.cwd());
    const quiz = await productAssessment(repo, options.productBank, { questionsPerSession: options.questions, format: options.format, writtenCount: options.writtenQuestions });
    await launchAssessment(options, quiz, undefined,
      { kind: assessmentSourceKinds.product, repo, bankIds: options.productBank, questionsPerSession: quiz.selectionSize, format: quiz.selectionFormat, writtenCount: quiz.writtenCount });
  } else if (options.productStatus) {
    console.log(JSON.stringify(await reconcileProductSetup(options.repo ?? process.cwd())));
  } else if (options.configureProduct) {
    console.log(JSON.stringify(await configureProduct(options.repo ?? process.cwd(), options.configureProduct)));
  } else if (options.preparePr && options.target) {
    console.log(JSON.stringify(await preparePr(options.repo ?? process.cwd(), options.target, options.baseline)));
  } else if (options.discardPr) {
    await discardPr(options.discardPr);
  } else if (options.validatePr) {
    await loadPrAssessment(options.validatePr);
    console.log(JSON.stringify({ status: prSessionStatuses.valid }));
  } else if (options.prSession) {
    const directory = resolve(options.prSession);
    const quiz = await loadPrAssessment(directory);
    await launchAssessment(options, quiz, undefined, { kind: assessmentSourceKinds.pr, directory });
  } else await launch(options);
}
