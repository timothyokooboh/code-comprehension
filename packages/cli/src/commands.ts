import { prSessionStatuses } from '@code-comprehension/quiz-contract';
import { launch, launchAssessment } from './launch.js';
import { preparePr, discardPr } from './pr/session.js';
import { loadPrAssessment } from './pr/assessment.js';
import { CliError, cliErrorCodes } from './errors.js';
import { loadProductBank, saveProductBank, productAssessment } from './product/bank.js';
import { reconcileProductSetup, configureProduct } from './product/config.js';
import { cacheStatuses, inspectProductCache } from './product/cache.js';
import { productStatuses } from './product/contract.js';

type CommandOptions = {
  port: number; open: boolean; quiz?: string;
  checkProduct?: string; refresh?: boolean; productStatus?: boolean; configureProduct?: string;
  validateProduct?: string; saveProduct?: string; productBank?: string;
  preparePr?: boolean; target?: string; baseline?: string; repo?: string;
  discardPr?: string; validatePr?: string; prSession?: string;
};

function validateOptions(options: CommandOptions) {
  const modes = [
    options.preparePr, options.discardPr, options.validatePr, options.prSession, options.quiz,
    options.checkProduct, options.productStatus, options.configureProduct, options.validateProduct, options.saveProduct, options.productBank,
  ].filter((value) => value !== undefined && value !== false);
  const hasComparisonOptions = options.target !== undefined || options.baseline !== undefined;
  const acceptsRepo = options.checkProduct || options.preparePr || options.productStatus || options.configureProduct || options.saveProduct || options.productBank;
  if ((options.refresh && !options.checkProduct) || modes.length > 1 || (hasComparisonOptions && !options.preparePr) ||
    (options.preparePr && !options.target) || (options.repo !== undefined && !acceptsRepo)) {
    throw new CliError(cliErrorCodes.prOptionsInvalid);
  }
}

export async function runCommand(options: CommandOptions) {
  validateOptions(options);
  if (options.checkProduct) {
    const result = await inspectProductCache(options.repo ?? process.cwd(), options.checkProduct, options.refresh);
    console.log(JSON.stringify(result.status === cacheStatuses.reusable ? { status: result.status, scope: result.bank.scope, conflicts: result.conflicts } : result));
  } else if (options.validateProduct) {
    await loadProductBank(options.validateProduct);
    console.log(JSON.stringify({ status: productStatuses.valid }));
  } else if (options.saveProduct) {
    console.log(JSON.stringify(await saveProductBank(options.repo ?? process.cwd(), options.saveProduct)));
  } else if (options.productBank) {
    await launchAssessment(options, await productAssessment(options.repo ?? process.cwd(), options.productBank));
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
    const directory = options.prSession;
    const quiz = await loadPrAssessment(directory);
    await launchAssessment(options, quiz, () => discardPr(directory));
  } else await launch(options);
}
