import type { NavigatorScreenParams } from '@react-navigation/native';

// Placeholders do not select or fetch a real course yet.
export type CoursesStackParamList = {
  Courses: undefined;
  CourseDetail: undefined;
  Roadmap: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  CoursesTab: NavigatorScreenParams<CoursesStackParamList> | undefined;
  Progress: undefined;
  Profile: undefined;
};
