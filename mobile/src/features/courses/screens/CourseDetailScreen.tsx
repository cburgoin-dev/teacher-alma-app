import { Button } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PlaceholderScreen } from '../../../components/PlaceholderScreen';
import type { CoursesStackParamList } from '../../../navigation/types';

export function CourseDetailScreen({ navigation }: NativeStackScreenProps<CoursesStackParamList, 'CourseDetail'>) {
  return (
    <PlaceholderScreen title="Course Detail">
      <Button title="Ver ruta" onPress={() => navigation.navigate('Roadmap')} />
    </PlaceholderScreen>
  );
}
