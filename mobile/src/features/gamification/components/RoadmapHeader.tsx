import { ContextualHeader } from '../../../components/ContextualHeader';
import { GamificationMetrics } from '../../../components/GamificationMetrics';
import { useGamification } from '../hooks/useGamification';
export function RoadmapHeader({ onBack, onOpenShop }: { onBack: () => void; onOpenShop: () => void }) {
  const state = useGamification();
  return <ContextualHeader safeTop backLabel="Volver desde la ruta de aprendizaje" onBack={onBack}
    trailing={<GamificationMetrics data={state.data} loading={state.loading} error={state.error} onOpenShop={onOpenShop} />} />;
}
