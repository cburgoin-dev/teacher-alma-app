import { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CoursesStackParamList } from '../../../navigation/types';
import { coursesApi } from '../api/courses';
import { useCourseResource } from '../hooks/useCourseResource';
import { catalogDestination } from '../presentation';
import { colors, ResourceState, styles } from '../components/ui';
import { CourseCard } from '../components/CourseCard';
import { AlmaLogo } from '../../../components/AlmaLogo';

export function CoursesScreen({ navigation }: NativeStackScreenProps<CoursesStackParamList, 'Courses'>) {
  const resource = useCourseResource(useCallback((signal: AbortSignal) => coursesApi.catalog(signal), []));
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.page}>
    <FlatList
      data={resource.error ? [] : resource.data?.courses ?? []}
      keyExtractor={course => course.id}
      contentContainerStyle={s.list}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      refreshControl={<RefreshControl refreshing={resource.loading && !!resource.data} onRefresh={resource.retry} tintColor={colors.blue} />}
      ListHeaderComponent={<View style={s.header}>
        <AlmaLogo />
        <Text style={[styles.title, { fontSize: 26, lineHeight: 31 }]}>Explorar cursos</Text>
        <Text style={s.subtitle}>Elige tu próximo paso y sigue aprendiendo inglés.</Text>
      </View>}
      ListEmptyComponent={<ResourceState loading={resource.loading} error={resource.error} retry={resource.error ? resource.retry : undefined} empty="Pronto encontrarás aquí nuevos cursos para aprender." />}
      renderItem={({ item }) => <CourseCard course={item} onPress={() => navigation.navigate(catalogDestination(item), { courseId: item.id })} />}
    />
  </SafeAreaView>;
}
const s = StyleSheet.create({
  list: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 22, flexGrow: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { paddingBottom: 16, gap: 5 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 22 },
});
