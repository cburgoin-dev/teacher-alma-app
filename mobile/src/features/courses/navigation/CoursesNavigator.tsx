import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CoursesStackParamList } from '../../../navigation/types';
import { CoursesScreen } from '../screens/CoursesScreen';
import { CourseDetailScreen } from '../screens/CourseDetailScreen';
import { RoadmapScreen } from '../screens/RoadmapScreen';

const Stack = createNativeStackNavigator<CoursesStackParamList>();

export function CoursesNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: '#101B4D', headerShadowVisible: false, headerTitleStyle: { fontSize: 19, fontWeight: '700' }, contentStyle: { backgroundColor: '#FFF' } }}>
      <Stack.Screen name="Courses" component={CoursesScreen} options={{ title: 'Cursos', headerShown: false }} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} options={{ title: 'Detalle del curso' }} />
      <Stack.Screen name="Roadmap" component={RoadmapScreen} options={{ title: 'Ruta de aprendizaje' }} />
    </Stack.Navigator>
  );
}
