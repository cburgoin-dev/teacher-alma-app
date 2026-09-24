/** Explicit public projections for JSONB content. Unknown keys never cross the API. */
export type Segment = { text: string; emphasis?: 'KEY' };
export type AudioMetadata = { audioUrl?: string; audioAlt?: string };
export type DialogueTurn = AudioMetadata & { text: string; speakerLabel?: string; translation?: string };
export type ActivityContext =
  | (AudioMetadata & { type: 'TEXT'; text: string })
  | (DialogueTurn & { type: 'DIALOGUE' })
  | { type: 'IMAGE'; url: string; alt: string; caption?: string };
type ObjectValue = Record<string, unknown>;
export function contentObject(value: unknown): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid content object');
  return value as ObjectValue;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid content text');
  return value;
}
function optionalText(value: ObjectValue, key: string) {
  return value[key] == null ? {} : { [key]: text(value[key]) };
}
function list<T>(value: unknown, parse: (value: ObjectValue) => T): T[] {
  if (!Array.isArray(value) || !value.length) throw new Error('Invalid content list');
  return value.map(item => parse(contentObject(item)));
}
function mediaUrl(value: unknown): string {
  const raw = text(value);
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid media URL');
  return raw;
}
function audio(value: ObjectValue): AudioMetadata {
  return { ...(value.audioUrl == null ? {} : { audioUrl: mediaUrl(value.audioUrl) }), ...optionalText(value, 'audioAlt') };
}
export function segments(value: unknown): Segment[] {
  return list(value, item => {
    if (item.emphasis !== undefined && item.emphasis !== 'KEY') throw new Error('Unsupported emphasis');
    if (typeof item.text !== 'string' || !item.text.length) throw new Error('Invalid segment text');
    return { text: item.text, ...(item.emphasis === 'KEY' ? { emphasis: 'KEY' as const } : {}) };
  });
}
function turn(value: ObjectValue): DialogueTurn {
  return { text: text(value.text), ...optionalText(value, 'speakerLabel'), ...optionalText(value, 'translation'), ...audio(value) };
}
export function activityPresentation(value: ObjectValue): { instruction?: string; context?: ActivityContext } {
  const instruction = optionalText(value, 'instruction');
  if (value.context == null) return instruction;
  const c = contentObject(value.context);
  let context: ActivityContext;
  if (c.type === 'TEXT') context = { type: 'TEXT', text: text(c.text), ...audio(c) };
  else if (c.type === 'DIALOGUE') context = { type: 'DIALOGUE', ...turn(c) };
  else if (c.type === 'IMAGE') context = { type: 'IMAGE', url: mediaUrl(c.url), alt: text(c.alt), ...optionalText(c, 'caption') };
  else throw new Error('Unsupported activity context');
  return { ...instruction, context };
}
export function publicContent(type: string, raw: unknown): Record<string, unknown> {
  const content = contentObject(raw);
  const fields: Record<string, string[]> = {
    TEXT: ['title', 'body'], IMAGE: ['url', 'alt', 'caption'], VIDEO: ['url', 'title', 'posterUrl', 'caption'],
    EXAMPLE: ['title', 'primaryText', 'secondaryText', 'note'], SUMMARY: ['title', 'points'],
  };
  if (!fields[type]) throw new Error('Unsupported lesson content');
  const payload: Record<string, unknown> = {};
  // Preserve v1 validation and projection, including its plain-text fallbacks.
  for (const key of fields[type]) {
    const value = content[key];
    if (value !== undefined) {
      if (key === 'points' ? !Array.isArray(value) || !value.every(v => typeof v === 'string') : typeof value !== 'string') throw new Error('Invalid public block field');
      payload[key] = value;
    }
  }
  if (type === 'TEXT' && content.segments != null) payload.segments = segments(content.segments);
  if (type === 'EXAMPLE' && content.variant != null) {
    if (content.variant !== 'DIALOGUE') throw new Error('Unsupported example variant');
    payload.variant = 'DIALOGUE'; payload.turns = list(content.turns, turn);
  }
  if (type === 'SUMMARY') {
    Object.assign(payload, optionalText(content, 'subtitle'));
    if (content.takeaways != null) payload.takeaways = list(content.takeaways, item => ({ text: text(item.text),
      ...(item.segments == null ? {} : { segments: segments(item.segments) }) }));
    if (content.keyPhrases != null) payload.keyPhrases = list(content.keyPhrases, item => ({ text: text(item.text),
      ...optionalText(item, 'translation'), ...audio(item) }));
  }
  return payload;
}
