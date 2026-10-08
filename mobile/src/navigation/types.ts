import type { NavigatorScreenParams } from '@react-navigation/native';
import type { LessonOutcome } from '../features/lessons/types';
export type NodeAnchor = { id: string; type: 'LESSON' | 'UNIT_CHALLENGE' };
export type LearningStackParamList = {
  CourseDetail: { courseId: string };
  Roadmap: { courseId: string; completionTicket?: number; focusNode?: NodeAnchor };
  UnitChallenge: { courseId: string; unitChallengeId: string; completionTicket?: number };
  Lesson: { courseId: string; lessonId: string; completionTicket?: number };
  LessonResult: { courseId: string; result: LessonOutcome; completionTicket?: number };
  Review: { courseId?: string; preferredLessonId?: string };
};
export type RootStackParamList = LearningStackParamList & {
  MainTabs: NavigatorScreenParams<RootTabParamList> | undefined;
  GamificationShop: undefined;
  ProgressCalendar: undefined;
};
/** Existing learning screens now share the root history, regardless of entry tab. */
export type CoursesStackParamList = RootStackParamList;
export type RootTabParamList = { Home: undefined; CoursesTab: undefined; Progress: undefined; Profile: undefined };
