import type { NavigatorScreenParams } from '@react-navigation/native';
import type { LessonOutcome } from '../features/lessons/types';

export type CoursesStackParamList = {
  Courses: undefined;
  CourseDetail: { courseId: string };
  Roadmap: { courseId: string };
  Lesson: { courseId: string; lessonId: string };
  LessonResult: { courseId: string; result: LessonOutcome };
};

export type RootTabParamList = {
  Home: undefined;
  CoursesTab: NavigatorScreenParams<CoursesStackParamList> | undefined;
  Progress: undefined;
  Profile: undefined;
};
