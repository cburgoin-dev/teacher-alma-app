import { Button } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PlaceholderScreen } from '../../../components/PlaceholderScreen';
import type { CoursesStackParamList } from '../../../navigation/types';

export function RoadmapScreen({ navigation }: NativeStackScreenProps<CoursesStackParamList, 'Roadmap'>) {
  return (
    <PlaceholderScreen title="Roadmap">
      <Button title="Volver a cursos" onPress={() => navigation.popToTop()} />
    </PlaceholderScreen>
  );
}
