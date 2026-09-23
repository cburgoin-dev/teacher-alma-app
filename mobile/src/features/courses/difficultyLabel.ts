// Presentation vocabulary only; preserve the API CEFR value.
const labels: Record<string, string> = { A1: 'Principiante', A2: 'Básico', B1: 'Intermedio', B2: 'Intermedio alto', C1: 'Avanzado', C2: 'Dominio' };
export function difficultyLabel(level: string): string {
  return Object.hasOwn(labels, level) ? labels[level] : level;
}
