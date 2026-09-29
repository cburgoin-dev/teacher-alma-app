import type { Entry } from './types';
export const cellsFor = (entry: Entry) => Array.from({ length: entry.length }, (_, i) => `${entry.row + (entry.direction === 'DOWN' ? i : 0)}:${entry.column + (entry.direction === 'ACROSS' ? i : 0)}`);
export function writeEntry(cells: Record<string, string>, entry: Entry, text: string) {
  const letters = Array.from(text.normalize('NFC').toUpperCase());
  return { ...cells, ...Object.fromEntries(cellsFor(entry).map((cell, i) => [cell, letters[i] ?? ''])) };
}
export const readEntry = (cells: Record<string, string>, entry: Entry) => cellsFor(entry).map(cell => cells[cell] || ' ').join('').trimEnd();
export function entryNumber(entries: Entry[], entry: Entry) {
  const starts = [...new Set(entries.map(e => `${e.row}:${e.column}`))];
  return starts.indexOf(`${entry.row}:${entry.column}`) + 1;
}
