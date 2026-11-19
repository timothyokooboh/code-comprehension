import { prSessionStatuses } from '@code-comprehension/quiz-contract';
import { launch, launchAssessment } from './launch.js';
import { preparePr, discardPr } from './pr/session.js';
import { loadPrAssessment } from './pr/assessment.js';
import { CliError, cliErrorCodes } from './errors.js';

type CommandOptions = {
  port: number; open: boolean; quiz?: string;
  preparePr?: boolean; target?: string; baseline?: string; repo?: string;
  discardPr?: string; validatePr?: string; prSession?: string;
};

function validateOptions(options: CommandOptions) {
  const modes = [options.preparePr, options.discardPr, options.validatePr, options.prSession, options.quiz].filter(Boolean);
  const hasComparisonOptions = options.target !== undefined || options.baseline !== undefined || options.repo !== undefined;
  if (modes.length > 1 || (hasComparisonOptions && !options.preparePr) || (options.preparePr && !options.target)) {
    throw new CliError(cliErrorCodes.prOptionsInvalid);
  }
}

export async function runCommand(options: CommandOptions) {
  validateOptions(options);
  if (options.preparePr && options.target) {
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
