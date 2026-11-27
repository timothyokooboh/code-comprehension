import { messages } from './messages.mjs';
import { questionTypes, scoreChoices } from './contract.mjs';
export const element = id => document.getElementById(id);
function node(tag, text, parent) {
  const item = document.createElement(tag); if (text) item.textContent = text; parent?.append(item); return item;
}
export function buildForm(questions, answers, maxLength) {
  const container = element('questions');
  container.replaceChildren();
  questions.forEach((question, index) => {
    const field = node('fieldset', null, container); field.dataset.question = question.id;
    node('legend', messages.number(index, question.prompt), field);
    if (question.type === questionTypes.written) {
      const label = node('label', messages.answer, field); label.htmlFor = question.id;
      const input = node('textarea', null, field); input.id = question.id; input.name = question.id;
      input.required = true; input.maxLength = maxLength; input.placeholder = messages.placeholder;
      input.value = answers[question.id] ?? '';
    } else {
      node('p', messages[question.type], field);
      for (const option of question.options) {
        const label = node('label', null, field); label.className = 'option';
        const input = node('input', null, label); input.type = question.type === questionTypes.single ? 'radio' : 'checkbox';
        input.name = question.id; input.value = option.id; input.checked = answers[question.id]?.includes(option.id) ?? false;
        node('span', option.text, label);
      }
    }
  });
}
export function readAnswers(questions) {
  return Object.fromEntries(questions.map(q => [q.id, q.type === questionTypes.written ? element(q.id).value :
    [...document.getElementsByName(q.id)].filter(input => input.checked).map(input => input.value)]));
}
function references(paths, parent) {
  node('h4', messages.evidence, parent);
  const list = node('ul', null, parent);
  for (const path of paths) node('code', path, node('li', null, list));
}
export function renderResults(data) {
  const container = element('result-content'); container.replaceChildren();
  const choices = scoreChoices(data.questions, data.submission.answers);
  node('h3', messages.mcqScore(choices.filter(q => q.correct).length, choices.length), container);
  for (const result of choices) {
    const section = node('article', null, container);
    node('h4', data.questions.find(q => q.id === result.questionId).prompt, section);
    node('strong', result.correct ? messages.correct : messages.incorrect, section);
    node('p', result.explanation, section); references(result.references, section);
  }
  if (!data.feedback) node('p', messages.writtenPending, container);
  for (const review of data.feedback?.reviews ?? []) {
    const section = node('article', null, container);
    node('h3', messages.labels[review.verdict], section);
    node('h4', data.questions.find(q => q.id === review.questionId).prompt, section);
    node('p', review.summary, section);
    node('h4', messages.understood, section); node('p', review.understood, section);
    node('h4', messages.missing, section); node('p', review.missing, section);
    references(review.references, section);
  }
}
