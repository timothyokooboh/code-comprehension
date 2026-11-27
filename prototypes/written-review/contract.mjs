export const questionTypes = { written: 'written', single: 'single', multiple: 'multiple' };
export const verdicts = ['correct', 'partial', 'incorrect', 'uncertain'];
export function publicQuestions(questions) {
  return questions.map(({ rubric, ...question }) => question);
}
export function validAnswers(answers, questions, maxLength) {
  return answers && typeof answers === 'object' && !Array.isArray(answers) &&
    Object.keys(answers).length === questions.length && questions.every(question => {
      const answer = answers[question.id];
      if (question.type === questionTypes.written) return typeof answer === 'string' && Boolean(answer.trim()) && answer.length <= maxLength;
      return Array.isArray(answer) && answer.length > 0 && new Set(answer).size === answer.length &&
        (question.type !== questionTypes.single || answer.length === 1) && answer.every(id => question.options.some(option => option.id === id));
    });
}
export function scoreChoices(questions, answers) {
  return questions.filter(q => q.type !== questionTypes.written).map(q => ({ questionId: q.id,
    correct: answers[q.id].length === q.correctOptionIds.length && q.correctOptionIds.every(id => answers[q.id].includes(id)),
    explanation: q.explanation, references: q.references }));
}
export function validReviews(reviews, questions, maxLength) {
  const written = questions.filter(q => q.type === questionTypes.written);
  return Array.isArray(reviews) && reviews.length === written.length && new Set(reviews.map(r => r?.questionId)).size === written.length && reviews.every(review => {
    const question = written.find(q => q.id === review?.questionId);
    return question && verdicts.includes(review.verdict) && ['summary', 'understood', 'missing'].every(key => typeof review[key] === 'string' && review[key].length <= maxLength) && review.summary.trim() &&
      Array.isArray(review.references) && review.references.length > 0 && review.references.every(path => question.references.includes(path));
  });
}
