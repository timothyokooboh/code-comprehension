import { randomUUID } from 'node:crypto';
import { assessmentSourceKinds, assessmentQuestionCount, displayRequestSchema, revisionRequestSchema, type AssessmentSource, type Quiz, type RevisionInput } from '@code-comprehension/quiz-contract';
import { CliError, cliErrorCodes } from '../errors.js';

export type RevisionLoader = (source: AssessmentSource, input: RevisionInput) => Promise<Quiz>;

export function createAssessmentState(initial: Quiz | null, origin: AssessmentSource, loadRevision: RevisionLoader) {
  let revision = randomUUID();
  let quiz: Quiz | null = initial ? { ...initial, runtimeRevision: revision, attemptRevision: undefined } : null;
  let source = origin;
  let questionIds: string[] = [];
  let displayToken: string | null = null;

  function snapshot() {
    return { revision, displayToken, source, quiz, displayed: questionIds.map((id, index) => ({ number: index + 1, id })) };
  }

  function publishDisplay(value: unknown) {
    const parsed = displayRequestSchema.safeParse(value);
    if (!parsed.success) throw new CliError(cliErrorCodes.assessmentInvalid);
    if (parsed.data.revision !== revision) throw new CliError(cliErrorCodes.assessmentStale);
    const ids = parsed.data.questionIds;
    if (!quiz || ids.length !== assessmentQuestionCount(quiz) || new Set(ids).size !== ids.length ||
      ids.some((id) => !quiz!.questions.some((question) => question.id === id)) ||
      (quiz.selectionGroups && ids.length >= quiz.selectionGroups.length && quiz.selectionGroups.some((group) => !group.some((id) => ids.includes(id))))) {
      throw new CliError(cliErrorCodes.assessmentInvalid);
    }
    if (JSON.stringify(ids) !== JSON.stringify(questionIds)) displayToken = randomUUID();
    questionIds = ids;
  }

  async function replace(value: unknown) {
    const parsed = revisionRequestSchema.safeParse(value);
    if (!parsed.success) throw new CliError(cliErrorCodes.assessmentInvalid);
    const request = parsed.data;
    const assertCurrent = () => {
      if (request.revision !== revision || request.displayToken !== displayToken) throw new CliError(cliErrorCodes.assessmentStale);
    };
    assertCurrent();
    const replacement = await loadRevision(source, request.input);
    if (quiz && replacement.type !== quiz.type) throw new CliError(cliErrorCodes.assessmentSourceInvalid);
    assertCurrent();
    revision = randomUUID();
    quiz = { ...replacement, runtimeRevision: revision, attemptRevision: revision };
    if ('bankIds' in request.input && source.kind === assessmentSourceKinds.product) source = { ...source, bankIds: request.input.bankIds, questionsPerSession: replacement.selectionSize };
    questionIds = [];
    displayToken = null;
    return { revision };
  }

  return { snapshot, publishDisplay, replace };
}
export type AssessmentState = ReturnType<typeof createAssessmentState>;
