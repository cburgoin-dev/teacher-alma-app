import type { NavigatorScreenParams } from '@react-navigation/native';

export type CoursesStackParamList = {
  Courses: undefined;
  CourseDetail: { courseId: string };
  Roadmap: { courseId: string };
};

export type RootTabParamList = {
  Home: undefined;
  CoursesTab: NavigatorScreenParams<CoursesStackParamList> | undefined;
  Progress: undefined;
  Profile: undefined;
};
