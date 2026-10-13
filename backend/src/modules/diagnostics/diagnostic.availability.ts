import { publicActivity, canAnswerIncorrectly } from '../activities/activity.engine.js';
import { progressionPath } from '../courses/course.progression.js';
import { reachableLevels } from './diagnostic.scoring.js';
import type { DiagnosticDefinition, DiagnosticSession } from './diagnostic.repository.js';

/** Academic destinations use the same curricular path as CourseService.start.
 * Empty learner state keeps this independent of progress and commercial access. */
export function usefulDestinations(courses: Awaited<ReturnType<DiagnosticSession['destinations']>>) {
  return courses.filter(c => c.status === 'PUBLISHED' && c.level !== null && c.level.trim().length > 0 && c.level === c.level.trim()
    && progressionPath({ courseProgress: [], topics: c.topics.map(t => ({ ...t,
      lessons: t.lessons.map(l => ({ ...l, lessonProgress: [] })),
      unitChallenge: t.unitChallenge ? { ...t.unitChallenge, progress: [], runs: [] } : null,
    })) }).length > 0).map(({ id, level, position }) => ({ id, level, position }));
}

export function validDefinition(definition: DiagnosticDefinition, destinations: { level: string | null }[]) {
  try {
    if (!definition.title.trim() || !Number.isInteger(definition.version) || definition.version < 1
      || (definition.estimatedMinutes !== null && (!Number.isInteger(definition.estimatedMinutes) || definition.estimatedMinutes <= 0))) return false;
    const questions = definition.diagnosticQuestions;
    if (!questions.length || new Set(questions.map(q => q.position)).size !== questions.length) return false;
    for (const q of questions) {
      if (!Number.isInteger(q.position) || q.position < 1 || !q.activity.prompt.trim()) return false;
      publicActivity(q.activity);
    }
    const levels = reachableLevels(definition.scoringConfig, questions, new Set(questions.filter(q => !canAnswerIncorrectly(q.activity)).map(q => q.id)));
    return levels.size >= 2 && [...levels].every(level => destinations.some(c => c.level === level));
  } catch { return false; }
}
export async function availableDiagnostic(session: DiagnosticSession) {
  const [definitions, destinations] = await Promise.all([session.published(), session.destinations()]);
  const definition = definitions.length === 1 ? definitions[0]! : null;
  return definition && validDefinition(definition, usefulDestinations(destinations)) ? definition : null;
}
