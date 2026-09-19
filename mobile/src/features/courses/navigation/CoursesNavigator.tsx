import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CoursesStackParamList } from '../../../navigation/types';
import { CoursesScreen } from '../screens/CoursesScreen';
import { CourseDetailScreen } from '../screens/CourseDetailScreen';
import { RoadmapScreen } from '../screens/RoadmapScreen';

const Stack = createNativeStackNavigator<CoursesStackParamList>();

export function CoursesNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Courses" component={CoursesScreen} options={{ title: 'Cursos' }} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} options={{ title: 'Detalle del curso' }} />
      <Stack.Screen name="Roadmap" component={RoadmapScreen} options={{ title: 'Ruta de aprendizaje' }} />
    </Stack.Navigator>
  );
}
