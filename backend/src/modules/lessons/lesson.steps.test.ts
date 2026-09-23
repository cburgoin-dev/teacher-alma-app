import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveSteps, nextRequiredStep, requireStep, requireStepAvailable, stepCompleted } from './lesson.steps.js';
import { HttpError } from '../../shared/http-error.js';

const block = (position: number, type: string, required = true) => ({
  id: `00000000-0000-4000-8000-${String(position).padStart(12, '0')}`, position, type, required,
});

test('steps group only consecutive explanatory blocks and preserve source UUIDs/order without mutation', () => {
  const input = [block(8, 'SUMMARY'), block(2, 'VIDEO'), block(1, 'TEXT'), block(3, 'IMAGE'),
    block(4, 'EXAMPLE'), block(5, 'ACTIVITY'), block(6, 'TEXT'), block(7, 'ACTIVITY')];
  const snapshot = structuredClone(input);
  const steps = deriveSteps(input);
  assert.deepEqual(steps.map(s => s.type), ['CONTENT_STEP', 'ACTIVITY_STEP', 'CONTENT_STEP', 'ACTIVITY_STEP', 'SUMMARY_STEP']);
  assert.deepEqual(steps.map(s => s.id), [1, 5, 6, 7, 8].map(i => block(i, '').id));
  assert.equal(steps[0]!.blocks.length, 4);
  assert.deepEqual(input, snapshot);
  assert.deepEqual(deriveSteps(input), steps);
});

test('a grouped step is required when any source block is required', () => {
  assert.equal(deriveSteps([block(1, 'TEXT', false), block(2, 'VIDEO')])[0]!.required, true);
  assert.equal(deriveSteps([block(1, 'TEXT', false)])[0]!.required, false);
  assert.deepEqual(deriveSteps([]), []);
  assert.throws(() => deriveSteps([block(1, 'UNKNOWN')]));
});

test('membership uses step ID, not any contained block ID', () => {
  const steps = deriveSteps([block(1, 'TEXT'), block(2, 'VIDEO')]);
  assert.equal(requireStep(steps, block(1, '').id), steps[0]);
  assert.throws(() => requireStep(steps, block(2, '').id), (e: unknown) => e instanceof HttpError && e.code === 'STEP_NOT_FOUND');
});

test('required traversal prevents skipping but optional blocks do not block later steps', () => {
  const steps = deriveSteps([block(1, 'TEXT'), block(2, 'VIDEO', false), block(3, 'ACTIVITY'), block(4, 'SUMMARY')]);
  const completed = new Set<string>();
  assert.throws(() => requireStepAvailable(steps, block(3, '').id, completed), (e: unknown) => e instanceof HttpError && e.code === 'STEP_NOT_AVAILABLE');
  completed.add(block(1, '').id);
  assert.doesNotThrow(() => requireStepAvailable(steps, block(3, '').id, completed));
  assert.equal(stepCompleted(steps[0]!, completed), false);
  completed.add(block(2, '').id);
  assert.equal(stepCompleted(steps[0]!, completed), true);
  assert.doesNotThrow(() => requireStepAvailable(steps, block(1, '').id, completed));
  assert.throws(() => requireStepAvailable(steps, block(4, '').id, completed));
  completed.add(block(3, '').id);
  assert.doesNotThrow(() => requireStepAvailable(steps, block(4, '').id, completed));
});

test('optional steps can be completed explicitly but never become the next required step', () => {
  const steps = deriveSteps([block(1, 'TEXT'), block(2, 'SUMMARY', false), block(3, 'ACTIVITY'), block(4, 'SUMMARY')]);
  assert.deepEqual(steps.map(step => [step.type, step.required]), [
    ['CONTENT_STEP', true], ['SUMMARY_STEP', false], ['ACTIVITY_STEP', true], ['SUMMARY_STEP', true],
  ]);
  const completed = new Set([block(1, '').id]);
  assert.equal(nextRequiredStep(steps, completed)!.id, block(3, '').id);
  assert.doesNotThrow(() => requireStepAvailable(steps, block(2, '').id, completed));
  completed.add(block(2, '').id);
  assert.equal(nextRequiredStep(steps, completed)!.id, block(3, '').id);
  completed.add(block(3, '').id);
  assert.equal(nextRequiredStep(steps, completed)!.id, block(4, '').id);
  assert.notEqual(nextRequiredStep(steps, completed)!.id, block(2, '').id);
});
