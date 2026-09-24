import type { Activity, Prisma } from '../../generated/prisma/client.js';
import { HttpError } from '../../shared/http-error.js';
import { activityPresentation } from './lesson.content.js';

type ObjectValue = Record<string, unknown>;
function object(value: unknown): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid activity configuration');
  return value as ObjectValue;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid activity configuration');
  return value;
}
function list<T>(value: unknown, parse: (v: ObjectValue) => T): T[] {
  if (!Array.isArray(value) || !value.length) throw new Error('Invalid activity configuration');
  return value.map(v => parse(object(v)));
}
function unique(ids: string[]) {
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate activity identifiers');
}

function configuration(activity: Activity) {
  if (activity.status !== 'ACTIVE') throw new Error('Inactive activity in published lesson');
  const c = object(activity.config);
  const hint = c.hint === undefined ? {} : { hint: text(c.hint) };
  const common = { id: activity.id, type: activity.type, prompt: activity.prompt, ...hint, ...activityPresentation(c) };
  if (activity.type === 'MULTIPLE_CHOICE' || activity.type === 'FILL_BLANK_OPTIONS') {
    const options = list(c.options, o => ({ id: text(o.id), text: text(o.text) }));
    unique(options.map(o => o.id));
    const key = text(c.correctOptionId);
    if (!options.some(o => o.id === key)) throw new Error('Unknown answer key');
    return { public: { ...common, options }, key, kind: 'options' as const };
  }
  if (activity.type === 'FILL_BLANK_TEXT') {
    if (!Array.isArray(c.acceptedAnswers) || !c.acceptedAnswers.length) throw new Error('Missing accepted answers');
    const answers = c.acceptedAnswers.map(text);
    if (c.caseSensitive !== undefined && typeof c.caseSensitive !== 'boolean') throw new Error('Invalid case sensitivity');
    const caseSensitive = c.caseSensitive === true;
    return { public: { ...common, caseSensitive }, answers, caseSensitive, kind: 'text' as const };
  }
  if (activity.type === 'MATCH_WORD_IMAGE') {
    const words = list(c.words, o => ({ id: text(o.id), text: text(o.text) }));
    const images = list(c.images, o => ({ id: text(o.id), url: text(o.url), alt: text(o.alt) }));
    unique(words.map(o => o.id)); unique(images.map(o => o.id));
    const pairs = list(c.pairs, o => ({ wordId: text(o.wordId), imageId: text(o.imageId) }));
    unique(pairs.map(p => p.wordId)); unique(pairs.map(p => p.imageId));
    if (pairs.length !== words.length || pairs.some(p => !words.some(w => w.id === p.wordId) || !images.some(i => i.id === p.imageId))) throw new Error('Invalid matching key');
    const interactionMode = c.interactionMode ?? 'TAP';
    if (interactionMode !== 'TAP' && interactionMode !== 'DRAG') throw new Error('Unsupported interaction mode');
    return { public: { ...common, words, images, interactionMode }, pairs, kind: 'match' as const };
  }
  throw new Error('Unsupported activity type');
}

/** Allowlist, not deletion of a few known private keys. Never expose explanation before submit. */
export function publicActivity(activity: Activity) { return configuration(activity).public; }

export function checkAnswer(activity: Activity, input: unknown): {
  isCorrect: boolean; answerData: Prisma.InputJsonObject; correctAnswer: Prisma.InputJsonValue;
} {
  const config = configuration(activity);
  const invalid = () => new HttpError(400, 'INVALID_ANSWER', 'Invalid answer');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid();
  const answer = input as ObjectValue;
  const keys = Object.keys(answer);
  if (config.kind === 'options') {
    if (keys.length !== 1 || typeof answer.selectedOptionId !== 'string' || !config.public.options.some(o => o.id === answer.selectedOptionId)) throw invalid();
    return { isCorrect: answer.selectedOptionId === config.key, answerData: { selectedOptionId: answer.selectedOptionId }, correctAnswer: config.key };
  }
  if (config.kind === 'text') {
    if (keys.length !== 1 || typeof answer.text !== 'string' || !answer.text.trim()) throw invalid();
    const normalize = (v: string) => config.caseSensitive ? v.trim() : v.trim().toLowerCase();
    return { isCorrect: config.answers.some(a => normalize(a) === normalize(answer.text as string)),
      answerData: { text: answer.text }, correctAnswer: config.answers[0]! };
  }
  if (keys.length !== 1 || !Array.isArray(answer.pairs) || answer.pairs.length !== config.public.words.length) throw invalid();
  const pairs: { wordId: string; imageId: string }[] = [];
  for (const value of answer.pairs) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
    const p = value as ObjectValue;
    if (Object.keys(p).length !== 2 || typeof p.wordId !== 'string' || typeof p.imageId !== 'string'
      || !config.public.words.some(w => w.id === p.wordId) || !config.public.images.some(i => i.id === p.imageId)
      || pairs.some(existing => existing.wordId === p.wordId || existing.imageId === p.imageId)) throw invalid();
    pairs.push({ wordId: p.wordId, imageId: p.imageId });
  }
  return { isCorrect: pairs.every(p => config.pairs.some(key => key.wordId === p.wordId && key.imageId === p.imageId)),
    answerData: { pairs }, correctAnswer: config.pairs };
}
