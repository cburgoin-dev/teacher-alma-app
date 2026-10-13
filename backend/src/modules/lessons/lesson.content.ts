export { activityPresentation } from '../activities/activity.content.js';
export type { Segment, AudioMetadata, DialogueTurn, ActivityContext } from '../activities/activity.content.js';
import { contentObject, text, segments, optionalText, list, turn, audio } from '../activities/activity.content.js';
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
