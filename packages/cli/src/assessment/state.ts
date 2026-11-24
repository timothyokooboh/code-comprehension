import type { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { assessmentSourceKinds, validQuestionSelection, displayRequestSchema, revisionRequestSchema, type AssessmentSource, type Quiz, type RevisionInput, type activeAssessmentSchema } from '@code-comprehension/quiz-contract';
import { CliError, cliErrorCodes } from '../errors.js';

export type RevisionLoader = (source: AssessmentSource, input: RevisionInput) => Promise<Quiz>;

export function createAssessmentState(initial: Quiz | null, origin: AssessmentSource, loadRevision: RevisionLoader, restored?: z.infer<typeof activeAssessmentSchema>, persist: (snapshot: z.infer<typeof activeAssessmentSchema>) => void = () => {}) {
  let revision = restored?.revision ?? randomUUID();
  let quiz: Quiz | null = restored ? restored.quiz : initial ? { ...initial, runtimeRevision: revision, attemptRevision: undefined } : null;
  let source = restored?.source ?? origin;
  let questionIds: string[] = restored?.displayed.map(item => item.id) ?? [];
  let displayToken: string | null = restored?.displayToken ?? null;

  function snapshot() {
    return { revision, displayToken, source, quiz, displayed: questionIds.map((id, index) => ({ number: index + 1, id })) };
  }

  function publishDisplay(value: unknown) {
    const parsed = displayRequestSchema.safeParse(value);
    if (!parsed.success) throw new CliError(cliErrorCodes.assessmentInvalid);
    if (parsed.data.revision !== revision) throw new CliError(cliErrorCodes.assessmentStale);
    const ids = parsed.data.questionIds;
    if (!quiz || !validQuestionSelection(quiz, ids)) {
      throw new CliError(cliErrorCodes.assessmentInvalid);
    }
    const token = JSON.stringify(ids) !== JSON.stringify(questionIds) ? randomUUID() : displayToken;
    persist({ ...snapshot(), displayToken: token, displayed: ids.map((id, index) => ({ id, number: index + 1 })) });
    displayToken = token;
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
    const nextRevision = randomUUID();
    const nextQuiz = { ...replacement, runtimeRevision: nextRevision, attemptRevision: nextRevision };
    let nextSource = source;
    if ('bankIds' in request.input && source.kind === assessmentSourceKinds.product) nextSource = { ...source, bankIds: request.input.bankIds, questionsPerSession: replacement.selectionSize, format: replacement.selectionFormat, writtenCount: replacement.writtenCount };
    persist({ revision: nextRevision, quiz: nextQuiz, source: nextSource, displayed: [], displayToken: null });
    revision = nextRevision;
    quiz = nextQuiz;
    source = nextSource;
    questionIds = [];
    displayToken = null;
    return { revision };
  }

  return { snapshot, publishDisplay, replace };
}
export type AssessmentState = ReturnType<typeof createAssessmentState>;
