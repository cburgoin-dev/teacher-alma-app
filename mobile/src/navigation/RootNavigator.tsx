import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { CoursesNavigator } from '../features/courses/navigation/CoursesNavigator';
import { ProgressScreen } from '../features/progress/screens/ProgressScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import type { RootTabParamList } from './types';

const Tabs = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Tabs.Navigator screenOptions={{
        tabBarActiveTintColor: '#183b70',
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: { fontSize: 13 },
      }}>
        <Tabs.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
        <Tabs.Screen name="CoursesTab" component={CoursesNavigator} options={{ title: 'Cursos', headerShown: false }} />
        <Tabs.Screen name="Progress" component={ProgressScreen} options={{ title: 'Progreso' }} />
        <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
      </Tabs.Navigator>
    </NavigationContainer>
  );
}
