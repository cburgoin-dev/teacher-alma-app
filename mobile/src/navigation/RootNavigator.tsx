import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { CoursesNavigator } from '../features/courses/navigation/CoursesNavigator';
import { ProgressScreen } from '../features/progress/screens/ProgressScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import type { RootTabParamList } from './types';
import { NavigationIcon } from '../components/NavigationIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useWindowDimensions } from 'react-native';

const Tabs = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const bottomPadding = Math.max(insets.bottom, 8);
  const contentHeight = 62 + 18 * (Math.min(fontScale, 1.5) - 1);
  return (
    <NavigationContainer>
      <Tabs.Navigator screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#0063EE',
        tabBarInactiveTintColor: '#60759C',
        tabBarIcon: ({ color, focused }) => <NavigationIcon name={route.name} color={color} filled={focused} />,
        tabBarLabelPosition: 'below-icon',
        tabBarLabel: ({ color, children }) => <Text maxFontSizeMultiplier={1.5} style={{ color, fontSize: 12, lineHeight: 18, fontWeight: '600', includeFontPadding: false, textAlign: 'center' }}>{children}</Text>,
        tabBarIconStyle: { width: 28, height: 28, marginBottom: 3 },
        tabBarItemStyle: { paddingVertical: 0 },
        tabBarStyle: { height: contentHeight + bottomPadding, paddingTop: 7, paddingBottom: bottomPadding, borderTopColor: '#DEEAFA', backgroundColor: '#FFF' },
      })}>
        <Tabs.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
        <Tabs.Screen name="CoursesTab" component={CoursesNavigator} options={{ title: 'Cursos', headerShown: false }} />
        <Tabs.Screen name="Progress" component={ProgressScreen} options={{ title: 'Progreso' }} />
        <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
      </Tabs.Navigator>
    </NavigationContainer>
  );
}
