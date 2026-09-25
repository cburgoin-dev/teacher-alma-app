import type { Pair } from './types';
import { pairSelection } from './presentation';
export type MatchingDraft = { pairs: Pair[]; word: string | null; image: string | null };
export type MatchingAction = { type: 'select'; word: string } | { type: 'connect'; image: string } | { type: 'retry' };
export function matchingDraft(state: MatchingDraft, action: MatchingAction): MatchingDraft {
  if (action.type === 'retry') return { pairs: [], word: null, image: null };
  if (action.type === 'select') return state.image
    ? { pairs: pairSelection(state.pairs, action.word, state.image), word: null, image: null }
    : { ...state, word: state.word === action.word ? null : action.word, image: null };
  return state.word
    ? { pairs: pairSelection(state.pairs, state.word, action.image), word: null, image: null }
    : { ...state, word: null, image: state.image === action.image ? null : action.image };
}
