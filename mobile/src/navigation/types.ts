import type { NavigatorScreenParams } from '@react-navigation/native';
import type { LessonOutcome } from '../features/lessons/types';

export type CoursesStackParamList = {
  Courses: undefined;
  CourseDetail: { courseId: string };
  Roadmap: { courseId: string; completionTicket?: number };
  UnitChallenge: { courseId: string; unitChallengeId: string; completionTicket?: number };
  Lesson: { courseId: string; lessonId: string; completionTicket?: number };
  LessonResult: { courseId: string; result: LessonOutcome; completionTicket?: number };
  Review: { courseId?: string; preferredLessonId?: string };
};

export type RootTabParamList = {
  Home: undefined;
  CoursesTab: NavigatorScreenParams<CoursesStackParamList> | undefined;
  Progress: undefined;
  Profile: undefined;
};
