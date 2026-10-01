import { apiRequest } from '../../../services/api/client';
import type { GamificationAggregate, ProtectorPurchase, StreakRepair } from '../types';
const path = '/me/gamification';
export const gamificationApi = {
  read: () => apiRequest<GamificationAggregate>(path),
  timezone: (timezone: string) => apiRequest<{ timezone: string }>(`${path}/timezone`, { method: 'PATCH', body: JSON.stringify({ timezone }) }),
  purchase: (requestKey: string) => apiRequest<ProtectorPurchase>(`${path}/protectors/purchase`, { method: 'POST', body: JSON.stringify({ requestKey }) }),
  repair: (requestKey: string, repairId: string) => apiRequest<StreakRepair>(`${path}/streak/repair`, { method: 'POST', body: JSON.stringify({ requestKey, repairId }) }),
};
