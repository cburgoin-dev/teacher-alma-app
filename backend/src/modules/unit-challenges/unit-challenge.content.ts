import { createHash } from 'node:crypto';
import { HttpError } from '../../shared/http-error.js';

export type Conversation = {
  title: string; scenario?: string; participants: { id: string; name: string }[];
  steps: ({ id: string; kind: 'MESSAGE'; speakerId: string; text: string; audioUrl?: string } |
    { id: string; kind: 'CHOICE'; prompt?: string; options: { id: string; text: string }[]; correctOptionId: string })[];
};
export type Crossword = { width: number; height: number;
  entries: { id: string; clue: string; answer: string; direction: 'ACROSS' | 'DOWN'; row: number; column: number }[] };
export type PhaseContent = { type: 'CONVERSATION'; config: Conversation } | { type: 'CROSSWORD'; config: Crossword };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const integer = (v: unknown): v is number => Number.isSafeInteger(v);
export const normalizeWord = (v: string) => v.trim().normalize('NFC').toUpperCase().normalize('NFC');
function invalid(): never { throw new Error('Invalid Unit Challenge content'); }
function rows(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v) || !v.every(record)) invalid();
  return v;
}
function unique(items: Record<string, unknown>[]) {
  if (items.some(i => !text(i.id)) || new Set(items.map(i => i.id)).size !== items.length) invalid();
}

/** Import boundary returning allowlisted private configuration. Grid coordinates are zero-based. */
export function validateContent(type: string, value: unknown): PhaseContent {
  if (!record(value)) invalid();
  if (type === 'CONVERSATION') {
    if (!text(value.title) || (value.scenario !== undefined && !text(value.scenario))) invalid();
    const participants = rows(value.participants); unique(participants);
    if (participants.some(p => !text(p.name))) invalid();
    const steps = rows(value.steps); unique(steps);
    let choices = 0;
    const config: Conversation = { title: value.title,
      ...(typeof value.scenario === 'string' ? { scenario: value.scenario } : {}),
      participants: participants.map(p => ({ id: p.id as string, name: p.name as string })),
      steps: steps.map(s => {
        const id = s.id as string;
        if (s.kind === 'MESSAGE') {
          if (!text(s.text) || !participants.some(p => p.id === s.speakerId)) invalid();
          if (s.audioUrl !== undefined && (typeof s.audioUrl !== 'string' || !/^https?:\/\//.test(s.audioUrl))) invalid();
          return { id, kind: 'MESSAGE', speakerId: s.speakerId as string, text: s.text,
            ...(typeof s.audioUrl === 'string' ? { audioUrl: s.audioUrl } : {}) };
        }
        if (s.kind !== 'CHOICE' || (s.prompt !== undefined && !text(s.prompt))) invalid();
        const options = rows(s.options); unique(options);
        if (options.length < 2 || options.some(o => !text(o.text)) || !options.some(o => o.id === s.correctOptionId)) invalid();
        choices++;
        return { id, kind: 'CHOICE', ...(typeof s.prompt === 'string' ? { prompt: s.prompt } : {}),
          options: options.map(o => ({ id: o.id as string, text: o.text as string })), correctOptionId: s.correctOptionId as string };
      }) };
    if (!choices) invalid();
    return { type, config };
  }
  if (type !== 'CROSSWORD' || !integer(value.width) || !integer(value.height) || value.width < 1 || value.height < 1) invalid();
  const entries = rows(value.entries); unique(entries);
  if (!entries.length) invalid();
  const cells = new Map<string, string>();
  const config: Crossword = { width: value.width, height: value.height, entries: entries.map(e => {
    if (!text(e.clue) || !text(e.answer) || !integer(e.row) || !integer(e.column) || e.row < 0 || e.column < 0 ||
      (e.direction !== 'ACROSS' && e.direction !== 'DOWN')) invalid();
    const letters = [...normalizeWord(e.answer)];
    if (!letters.length) invalid();
    letters.forEach((letter, i) => {
      const row = (e.row as number) + (e.direction === 'DOWN' ? i : 0);
      const column = (e.column as number) + (e.direction === 'ACROSS' ? i : 0);
      if (row >= (value.height as number) || column >= (value.width as number)) invalid();
      const key = row + ':' + column;
      if (cells.has(key) && cells.get(key) !== letter) invalid();
      cells.set(key, letter);
    });
    return { id: e.id as string, clue: e.clue, answer: normalizeWord(e.answer), direction: e.direction, row: e.row, column: e.column };
  }) };
  return { type, config };
}

export function validateChallenge(phases: { type: string; position: number; config: unknown }[], passingScore: number | null) {
  if (passingScore !== null && (!integer(passingScore) || passingScore < 0 || passingScore > 100)) invalid();
  if (!phases.length) invalid();
  return [...phases].sort((a, b) => a.position - b.position).map((p, i) => {
    if (p.position !== i + 1) invalid();
    return validateContent(p.type, p.config);
  });
}

export function validatePublishedTopics(topics: { lessons: { status: string }[];
  unitChallenge: { status: string; passingScore: number | null; phases: { type: string; position: number; config: unknown }[] } | null }[]) {
  for (const topic of topics) {
    if (!topic.lessons.some(l => l.status === 'PUBLISHED') && topic.unitChallenge?.status !== 'PUBLISHED') continue;
    if (!topic.unitChallenge || topic.unitChallenge.status !== 'PUBLISHED') invalid();
    validateChallenge(topic.unitChallenge.phases, topic.unitChallenge.passingScore);
  }
}
export function totalItems(phase: PhaseContent) {
  return phase.type === 'CONVERSATION' ? phase.config.steps.filter(s => s.kind === 'CHOICE').length : phase.config.entries.length;
}
/** Explicit public allowlists prevent private/future config fields leaking. */
export function publicContent(phase: PhaseContent) {
  if (phase.type === 'CROSSWORD') return { width: phase.config.width, height: phase.config.height,
    entries: phase.config.entries.map(e => ({ id: e.id, clue: e.clue, direction: e.direction,
      row: e.row, column: e.column, length: [...normalizeWord(e.answer)].length })) };
  return { title: phase.config.title, ...(phase.config.scenario ? { scenario: phase.config.scenario } : {}),
    participants: phase.config.participants.map(p => ({ id: p.id, name: p.name })),
    steps: phase.config.steps.map(s => s.kind === 'MESSAGE'
      ? { id: s.id, kind: s.kind, speakerId: s.speakerId, text: s.text, ...(s.audioUrl ? { audioUrl: s.audioUrl } : {}) }
      : { id: s.id, kind: s.kind, ...(s.prompt ? { prompt: s.prompt } : {}), options: s.options.map(o => ({ id: o.id, text: o.text })) }) };
}
export function scoreAnswer(phase: PhaseContent, value: unknown) {
  function bad(): never { throw new HttpError(400, 'INVALID_UNIT_CHALLENGE_ANSWER', 'Invalid phase answer'); }
  const field = phase.type === 'CONVERSATION' ? 'choices' : 'entries';
  if (!record(value) || Object.keys(value).some(k => k !== field) || !Array.isArray(value[field])) bad();
  const items = value[field] as unknown[];
  const answers = new Map<string, string>();
  for (const item of items) {
    if (!record(item)) bad();
    const id = item[phase.type === 'CONVERSATION' ? 'stepId' : 'entryId'];
    const answer = item[phase.type === 'CONVERSATION' ? 'optionId' : 'text'];
    const keys = phase.type === 'CONVERSATION' ? ['stepId', 'optionId'] : ['entryId', 'text'];
    if (!text(id) || typeof answer !== 'string' || answers.has(id) || Object.keys(item).some(k => !keys.includes(k))) bad();
    answers.set(id, answer);
  }
  let correctItems = 0;
  let answerData;
  if (phase.type === 'CONVERSATION') {
    const choices = phase.config.steps.filter(s => s.kind === 'CHOICE');
    for (const [id, option] of answers) if (!choices.some(s => s.id === id && s.options.some(o => o.id === option))) bad();
    answerData = { choices: choices.map(s => {
      const optionId = answers.get(s.id) ?? null;
      if (optionId === s.correctOptionId) correctItems++;
      return { stepId: s.id, optionId };
    }) };
  } else {
    for (const id of answers.keys()) if (!phase.config.entries.some(e => e.id === id)) bad();
    answerData = { entries: phase.config.entries.map(e => {
      const text = normalizeWord(answers.get(e.id) ?? '');
      if (text && text === normalizeWord(e.answer)) correctItems++;
      return { entryId: e.id, text };
    }) };
  }
  return { answerData, correctItems, hash: createHash('sha256').update(JSON.stringify(answerData)).digest('hex') };
}
