// Temporary editorial copy ONLY for the named demo courses. Not an access rule
// or a claim about every course at the same CEFR level. Replace with managed
// API content when an editorial contract is agreed.
const outcomes: Record<string, readonly string[]> = {
  'courses-demo-v3-a1': [
    'Saludar y presentarte.',
    'Hablar sobre familia y rutinas.',
    'Describir lugares y actividades cotidianas.',
  ],
  'courses-demo-v3-a2': [
    'Presentarte y conversar.',
    'Hablar de familia, hábitos y planes.',
    'Resolver situaciones cotidianas.',
  ],
};
export function demoLearningOutcomes(slug: string): readonly string[] | undefined {
  return Object.hasOwn(outcomes, slug) ? outcomes[slug] : undefined;
}
