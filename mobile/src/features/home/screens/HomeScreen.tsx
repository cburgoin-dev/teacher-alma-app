import { PlaceholderScreen } from '../../../components/PlaceholderScreen';
import { View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../../../navigation/types';
import { Button } from '../../courses/components/ui';

export function HomeScreen({ navigation }: BottomTabScreenProps<RootTabParamList, 'Home'>) {
  return <View style={{ flex: 1 }}><PlaceholderScreen title="Inicio" />
    {__DEV__ ? <View style={{ padding: 20 }}><Button title="DEV · Abrir Review" tone="blue"
      onPress={() => navigation.navigate('CoursesTab', { screen: 'Review', params: {} })} /></View> : null}
  </View>;
}
