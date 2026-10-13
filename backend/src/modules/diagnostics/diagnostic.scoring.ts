import { Prisma } from '../../generated/prisma/client.js';

type Question = { id: string; weight: Prisma.Decimal; targetLevel: string | null };
type Threshold = { numerator: bigint; denominator: bigint };
type Rule = { level: string; minimum: Threshold; requirements: { targetLevel: string; minimum: Threshold }[] };
function invalid(): never { throw new Error('Invalid Diagnostic scoring configuration'); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
function label(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) invalid();
  return value;
}
function threshold(value: unknown): Threshold {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) invalid();
  const decimal = new Prisma.Decimal(value.toString()).toFixed();
  const [whole, fraction = ''] = decimal.split('.');
  return { numerator: BigInt(whole! + fraction), denominator: 10n ** BigInt(fraction.length) };
}
export function scoringRules(raw: unknown, questions: Question[]): Rule[] {
  const config = object(raw);
  if (!Array.isArray(config.recommendationRules) || !config.recommendationRules.length) invalid();
  const measured = new Set(questions.map(q => q.targetLevel).filter(v => v !== null));
  const rules = config.recommendationRules.map(value => {
    const rule = object(value);
    if (!Array.isArray(rule.requirements)) invalid();
    const requirements = rule.requirements.map(value => {
      const r = object(value), targetLevel = label(r.targetLevel);
      if (!measured.has(targetLevel)) invalid();
      return { targetLevel, minimum: threshold(r.minScore) };
    });
    if (new Set(requirements.map(r => r.targetLevel)).size !== requirements.length) invalid();
    return { level: label(rule.level), minimum: threshold(rule.minOverallScore === undefined ? 0 : rule.minOverallScore), requirements };
  });
  const fallback = rules.at(-1)!;
  if (fallback.minimum.numerator !== 0n || fallback.requirements.length) invalid();
  return rules;
}
// Database weights have exactly three decimal places. Cross multiplication avoids
// both binary floating point and rounding of repeating decimal quotients.
function units(q: Question): bigint {
  if (!q.weight.isFinite() || q.weight.lte(0) || q.weight.decimalPlaces() > 3) invalid();
  return BigInt(q.weight.mul(1000).toFixed(0));
}
function totals(questions: Question[], correct: Set<string>) {
  let total = 0n, earned = 0n;
  const levels = new Map<string, { total: bigint; earned: bigint }>();
  for (const q of questions) {
    const weight = units(q), score = correct.has(q.id) ? weight : 0n;
    total += weight; earned += score;
    if (q.targetLevel !== null) {
      label(q.targetLevel);
      const previous = levels.get(q.targetLevel) ?? { total: 0n, earned: 0n };
      levels.set(q.targetLevel, { total: previous.total + weight, earned: previous.earned + score });
    }
  }
  if (!total) invalid();
  return { total, earned, levels };
}
function passes(earned: bigint, total: bigint, minimum: Threshold) {
  return earned * 100n * minimum.denominator >= total * minimum.numerator;
}
function select(rules: Rule[], scores: ReturnType<typeof totals>) {
  return rules.findIndex(r => passes(scores.earned, scores.total, r.minimum) && r.requirements.every(req => {
    const level = scores.levels.get(req.targetLevel)!;
    return passes(level.earned, level.total, req.minimum);
  }));
}
export function scoreDiagnostic(raw: unknown, questions: Question[], correct: Set<string>) {
  const rules = scoringRules(raw, questions), scores = totals(questions, correct);
  const recommendedLevel = rules[select(rules, scores)]!.level;
  // Round half-up only AFTER choosing the recommendation; no finite division needed.
  const thousandths = (scores.earned * 100000n * 2n + scores.total) / (scores.total * 2n);
  return { recommendedLevel, internalScore: new Prisma.Decimal(thousandths.toString()).div(1000) };
}

/** Exact reachability over possible correctness outcomes, including ordered/shadowed
 * rules and discrete weights. Monotone gates prune subtrees with the same winner. */
export function reachableLevels(raw: unknown, questions: Question[], alwaysCorrect: Set<string> = new Set()): Set<string> {
  const rules = scoringRules(raw, questions), levels = new Set<string>();
  const correct = new Set(alwaysCorrect);
  const visited = new Set<string>();
  function visit(index: number) {
    const low = totals(questions, correct);
    const signature = `${index}:${low.earned}:${[...low.levels.values()].map(l => l.earned).join(',')}`;
    if (visited.has(signature)) return;
    visited.add(signature);
    const lowerWinner = select(rules, low);
    const upper = new Set(correct);
    for (const q of questions.slice(index)) upper.add(q.id);
    const upperWinner = select(rules, totals(questions, upper));
    if (lowerWinner === upperWinner || index === questions.length) {
      levels.add(rules[lowerWinner]!.level); return;
    }
    visit(index + 1);
    const id = questions[index]!.id;
    if (!alwaysCorrect.has(id)) { correct.add(id); visit(index + 1); correct.delete(id); }
  }
  visit(0);
  return levels;
}
