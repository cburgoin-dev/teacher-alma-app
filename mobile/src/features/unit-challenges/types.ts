export type Metadata = {
  challenge: { id: string; title: string; description: string | null; passingScore: number | null; phaseCount: number; phaseTypes: ('CONVERSATION' | 'CROSSWORD')[]; topic: { id: string; title: string; position: number }; course: { id: string; title: string; level: string | null } };
  progress: { passed: boolean; attemptCount: number; bestScore: number | null };
  activeRun: { id: string } | null;
  access: { hasAccess: boolean };
  progression: { unlocked: boolean; isCurrent: boolean; lockReason: string | null };
};
export type Choice = { id: string; kind: 'CHOICE'; prompt?: string; options: { id: string; text: string }[] };
export type Message = { id: string; kind: 'MESSAGE'; speakerId: string; text: string; audioUrl?: string };
export type Conversation = { title: string; scenario?: string; participants: { id: string; name: string }[]; steps: (Choice | Message)[] };
export type Entry = { id: string; clue: string; direction: 'ACROSS' | 'DOWN'; row: number; column: number; length: number };
export type Crossword = { width: number; height: number; entries: Entry[] };
export type Phase = { id: string; position: number } & ({ type: 'CONVERSATION'; content: Conversation } | { type: 'CROSSWORD'; content: Crossword });
export type Answer = { choices: { stepId: string; optionId: string }[] } | { entries: { entryId: string; text: string }[] };
export type Result = { correctItems: number; totalItems: number; percentage: number; passed: boolean; passingScore: number | null };
export type RunResponse = { run: { id: string; status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED'; completedPhases?: number; totalPhases?: number }; phase?: Phase | null; result?: Result | null; topic?: { completed: boolean } };
