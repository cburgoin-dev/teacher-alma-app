import { useState } from 'react';
import { View, Text } from 'react-native';
import { Button } from '../../courses/components/ui';
import { StreakCelebration } from './StreakCelebration';
import { devCelebrationPreview } from '../devStreakReplay';
import type { GamificationAggregate } from '../types';
export function DevStreakReplay({ data }: { data: GamificationAggregate | null }) {
  const [preview, setPreview] = useState<ReturnType<typeof devCelebrationPreview>>(null);
  const [iteration, setIteration] = useState(0);
  if (!__DEV__) return null;
  return <View style={{ gap: 8 }}>
    <Text style={{ color: '#61759D', fontSize: 12 }}>DEV · Prueba visual sin modificar datos</Text>
    <Button title="DEV · Reproducir celebración" tone="blue" disabled={!data} onPress={() => setPreview(devCelebrationPreview(data))} />
    {preview ? <StreakCelebration key={iteration} delta={preview.delta} devLabel={preview.label}
      onReplay={() => setIteration(value => value + 1)} onContinue={() => setPreview(null)} /> : null}
  </View>;
}
