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
        <View accessible accessibilityLabel="La Teacher Alma" style={s.brand}>
          <View accessible={false} style={s.brandMark}><View style={s.capBase} /><View style={s.capTop} /><View style={s.tassel} /></View>
          <View><Text style={s.teacher}>La Teacher</Text><Text style={s.alma}>Alma</Text></View>
        </View>
        <Text style={styles.title}>Explorar cursos</Text>
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
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 13 },
  teacher: { color: colors.blue, fontWeight: '800', fontSize: 16, lineHeight: 18 },
  alma: { color: colors.red, fontWeight: '800', fontSize: 23, lineHeight: 25 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  brandMark: { width: 33, height: 33 },
  capBase: { width: 22, height: 15, backgroundColor: colors.blue, borderRadius: 7, position: 'absolute', left: 7, top: 14, transform: [{ rotate: '-18deg' }] },
  capTop: { width: 29, height: 15, backgroundColor: colors.blue, position: 'absolute', left: 2, top: 4, transform: [{ rotate: '-25deg' }, { skewX: '-25deg' }] },
  tassel: { position: 'absolute', left: 2, top: 17, width: 3, height: 11, borderRadius: 2, backgroundColor: colors.red, transform: [{ rotate: '25deg' }] },
});
