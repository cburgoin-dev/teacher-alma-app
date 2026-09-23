import { HttpError } from '../../shared/http-error.js';

export type StepBlock = { id: string; type: string; position: number; required: boolean };
export type LessonStep<B extends StepBlock = StepBlock> = {
  id: string;
  type: 'CONTENT_STEP' | 'ACTIVITY_STEP' | 'SUMMARY_STEP';
  required: boolean;
  blocks: B[];
};

/** A derived view, never a persisted entity. IDs are source block UUIDs. */
export function deriveSteps<B extends StepBlock>(blocks: readonly B[]): LessonStep<B>[] {
  const steps: LessonStep<B>[] = [];
  for (const block of [...blocks].sort((a, b) => a.position - b.position)) {
    const type = ['TEXT', 'VIDEO', 'IMAGE', 'EXAMPLE'].includes(block.type) ? 'CONTENT_STEP'
      : block.type === 'ACTIVITY' ? 'ACTIVITY_STEP'
      : block.type === 'SUMMARY' ? 'SUMMARY_STEP' : null;
    // Invalid stored content is an internal failure, not silently omitted content.
    if (!type) throw new Error('Unsupported lesson block type');
    const previous = steps.at(-1);
    if (type === 'CONTENT_STEP' && previous?.type === type) {
      previous.blocks.push(block);
      previous.required ||= block.required;
    } else {
      steps.push({ id: block.id, type, required: block.required, blocks: [block] });
    }
  }
  return steps;
}

export function requireStep<B extends StepBlock>(steps: LessonStep<B>[], stepId: string): LessonStep<B> {
  const step = steps.find(candidate => candidate.id === stepId);
  if (!step) throw new HttpError(404, 'STEP_NOT_FOUND', 'Step not found');
  return step;
}

/** Traversal is independent of correctness and of the persisted current pointer. */
export function stepCompleted(step: LessonStep, completedBlockIds: ReadonlySet<string>): boolean {
  return step.blocks.every(block => completedBlockIds.has(block.id));
}

export function requireStepAvailable(steps: LessonStep[], stepId: string, completedBlockIds: ReadonlySet<string>): void {
  const step = requireStep(steps, stepId);
  for (const previous of steps.slice(0, steps.indexOf(step))) {
    if (previous.blocks.some(block => block.required && !completedBlockIds.has(block.id))) {
      throw new HttpError(409, 'STEP_NOT_AVAILABLE', 'Complete preceding required steps first');
    }
  }
}
