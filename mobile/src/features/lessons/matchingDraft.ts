import type { Pair } from './types';
import { pairSelection } from './presentation';
export type MatchingDraft = { pairs: Pair[]; word: string | null };
export type MatchingAction = { type: 'select'; word: string } | { type: 'connect'; image: string } | { type: 'retry' };
export function matchingDraft(state: MatchingDraft, action: MatchingAction): MatchingDraft {
  if (action.type === 'retry') return { pairs: [], word: null };
  if (action.type === 'select') return { ...state, word: action.word };
  return state.word ? { pairs: pairSelection(state.pairs, state.word, action.image), word: null } : state;
}
