import type { NavigatorScreenParams } from '@react-navigation/native';
import type { LessonResult } from '../features/lessons/types';

export type CoursesStackParamList = {
  Courses: undefined;
  CourseDetail: { courseId: string };
  Roadmap: { courseId: string };
  Lesson: { courseId: string; lessonId: string };
  LessonResult: { courseId: string; result: LessonResult };
};

export type RootTabParamList = {
  Home: undefined;
  CoursesTab: NavigatorScreenParams<CoursesStackParamList> | undefined;
  Progress: undefined;
  Profile: undefined;
};
