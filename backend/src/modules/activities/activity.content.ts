/** Explicit public projections for JSONB content. Unknown keys never cross the API. */
export type Segment = { text: string; emphasis?: 'KEY' };
export type AudioMetadata = { audioUrl?: string; audioAlt?: string };
export type DialogueTurn = AudioMetadata & { text: string; segments?: Segment[]; speakerLabel?: string; translation?: string };
export type ActivityContext =
  | (AudioMetadata & { type: 'TEXT'; text: string })
  | (DialogueTurn & { type: 'DIALOGUE' })
  | { type: 'IMAGE'; url: string; alt: string; caption?: string };
type ObjectValue = Record<string, unknown>;
export function contentObject(value: unknown): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid content object');
  return value as ObjectValue;
}
export function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid content text');
  return value;
}
export function optionalText(value: ObjectValue, key: string) {
  return value[key] == null ? {} : { [key]: text(value[key]) };
}
export function list<T>(value: unknown, parse: (value: ObjectValue) => T): T[] {
  if (!Array.isArray(value) || !value.length) throw new Error('Invalid content list');
  return value.map(item => parse(contentObject(item)));
}
function mediaUrl(value: unknown): string {
  const raw = text(value);
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid media URL');
  return raw;
}
export function audio(value: ObjectValue): AudioMetadata {
  return { ...(value.audioUrl == null ? {} : { audioUrl: mediaUrl(value.audioUrl) }), ...optionalText(value, 'audioAlt') };
}
export function segments(value: unknown): Segment[] {
  return list(value, item => {
    if (item.emphasis !== undefined && item.emphasis !== 'KEY') throw new Error('Unsupported emphasis');
    if (typeof item.text !== 'string' || !item.text.length) throw new Error('Invalid segment text');
    return { text: item.text, ...(item.emphasis === 'KEY' ? { emphasis: 'KEY' as const } : {}) };
  });
}
export function turn(value: ObjectValue): DialogueTurn {
  return { text: text(value.text), ...(value.segments == null ? {} : { segments: segments(value.segments) }), ...optionalText(value, 'speakerLabel'), ...optionalText(value, 'translation'), ...audio(value) };
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
