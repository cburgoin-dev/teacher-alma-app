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

// Crop only unused outer margins. Internal gaps and all crossings retain the
// authored coordinates; responsive cell size never changes answer geometry.
export function crosswordLayout(entries: Entry[], availableWidth: number) {
  const coordinates = entries.flatMap(cellsFor).map(cell => cell.split(':').map(Number));
  if (!coordinates.length) return { row: 0, column: 0, rows: 0, columns: 0, cellSize: 0 };
  const row = Math.min(...coordinates.map(c => c[0]));
  const column = Math.min(...coordinates.map(c => c[1]));
  const rows = Math.max(...coordinates.map(c => c[0])) - row + 1;
  const columns = Math.max(...coordinates.map(c => c[1])) - column + 1;
  return { row, column, rows, columns, cellSize: Math.min(38, Math.max(0, availableWidth) / columns) };
}
