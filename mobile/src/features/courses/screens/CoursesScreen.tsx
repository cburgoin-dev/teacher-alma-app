import { Button } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PlaceholderScreen } from '../../../components/PlaceholderScreen';
import type { CoursesStackParamList } from '../../../navigation/types';

export function CoursesScreen({ navigation }: NativeStackScreenProps<CoursesStackParamList, 'Courses'>) {
  return (
    <PlaceholderScreen title="Courses">
      <Button title="Ver detalle" onPress={() => navigation.navigate('CourseDetail')} />
    </PlaceholderScreen>
  );
}
