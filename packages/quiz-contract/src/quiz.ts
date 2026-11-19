import { z } from 'zod';

export const quizSchemaVersion = 1;
export const quizPath = '/api/quiz';
export const questionTypes = { single: 'single', multiple: 'multiple' } as const;
export const assessmentTypes = { pr: 'pr', product: 'product' } as const;
export const quizIssueCodes = {
  duplicateId: 'duplicate_id',
  unknownAnswer: 'unknown_answer',
  answerCount: 'answer_count',
} as const;

const minimumOptions = 2;
const minimumMultipleAnswers = 2;
const text = z.string().trim().min(1);
const identifier = text.regex(/^[a-zA-Z0-9_-]+$/);
const sourceReferenceSchema = z.strictObject({ path: text, line: z.number().int().positive().optional() });
const optionSchema = z.strictObject({ id: identifier, text });

const questionSchema = z.strictObject({
  id: identifier,
  type: z.enum(questionTypes),
  prompt: text,
  options: z.array(optionSchema).min(minimumOptions),
  correctOptionIds: z.array(identifier).min(1),
  explanation: z.strictObject({ concise: text, detailed: text }),
  references: z.array(sourceReferenceSchema).min(1),
  diagram: z.strictObject({ format: z.literal('mermaid'), source: text }).optional(),
}).superRefine((question, context) => {
  const optionIds = question.options.map((option) => option.id);
  if (new Set(optionIds).size !== optionIds.length) {
    context.addIssue({ code: 'custom', path: ['options'], params: { reason: quizIssueCodes.duplicateId } });
  }
  if (new Set(question.correctOptionIds).size !== question.correctOptionIds.length) {
    context.addIssue({ code: 'custom', path: ['correctOptionIds'], params: { reason: quizIssueCodes.duplicateId } });
  }
  if (question.correctOptionIds.some((id) => !optionIds.includes(id))) {
    context.addIssue({ code: 'custom', path: ['correctOptionIds'], params: { reason: quizIssueCodes.unknownAnswer } });
  }
  const validCount = question.type === questionTypes.single
    ? question.correctOptionIds.length === 1
    : question.correctOptionIds.length >= minimumMultipleAnswers;
  if (!validCount) {
    context.addIssue({ code: 'custom', path: ['correctOptionIds'], params: { reason: quizIssueCodes.answerCount } });
  }
});

export const quizSchema = z.strictObject({
  schemaVersion: z.literal(quizSchemaVersion),
  id: identifier,
  type: z.enum(assessmentTypes),
  title: text,
  scope: z.array(text).min(1),
  questions: z.array(questionSchema).min(1),
}).superRefine((quiz, context) => {
  const seen = new Set<string>();
  quiz.questions.forEach((question, index) => {
    if (seen.has(question.id)) {
      context.addIssue({ code: 'custom', path: ['questions', index, 'id'], params: { reason: quizIssueCodes.duplicateId } });
    }
    seen.add(question.id);
  });
});

export type Quiz = z.infer<typeof quizSchema>;
export type Question = Quiz['questions'][number];
export type QuizValidationIssue = z.core.$ZodIssue;
