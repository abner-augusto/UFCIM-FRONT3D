import { computed } from 'vue';
import type { Space } from '@/types/space';

export interface EquipmentGroup {
  name: string;
  total: number;
  working: number;
  broken: number;
  underRepair: number;
  replacementScheduled: number;
  /** MEL-015: open maintenance reports within the group. */
  openPending: number;
  openAcknowledged: number;
}

export type EquipmentSeverity = 'working' | 'warning' | 'broken';
export type EquipmentReportState = 'none' | 'pending' | 'acknowledged';

/**
 * Groups a space's equipment by name and derives a per-group status.
 * Shared by SpaceCard and RoomPopup. Each consumer maps `groupSeverity`
 * to its own CSS class (the markup differs, the logic doesn't).
 *
 * @param space - getter returning the space to read `.equipment` from
 *                (e.g. `() => detailedSpace ?? props.space`)
 */
export function useEquipmentGroups(space: () => Space | null | undefined) {
  const equipmentGroups = computed<EquipmentGroup[]>(() => {
    const equip = space()?.equipment;
    if (!equip?.length) return [];
    const map = new Map<string, EquipmentGroup>();
    for (const item of equip) {
      if (!map.has(item.name)) {
        map.set(item.name, {
          name: item.name,
          total: 0,
          working: 0,
          broken: 0,
          underRepair: 0,
          replacementScheduled: 0,
          openPending: 0,
          openAcknowledged: 0,
        });
      }
      const g = map.get(item.name)!;
      g.total++;
      if (item.status === 'working') g.working++;
      else if (item.status === 'broken') g.broken++;
      else if (item.status === 'under_repair') g.underRepair++;
      else if (item.status === 'replacement_scheduled') g.replacementScheduled++;
      if (item.openReportStatus === 'pending') g.openPending++;
      else if (item.openReportStatus === 'acknowledged') g.openAcknowledged++;
    }
    return Array.from(map.values());
  });

  function groupSeverity(g: EquipmentGroup): EquipmentSeverity {
    if (g.broken > 0) return 'broken';
    if (g.underRepair > 0 || g.replacementScheduled > 0) return 'warning';
    return 'working';
  }

  function groupStatusLabel(g: EquipmentGroup): string {
    if (g.broken > 0) return `${g.broken} com defeito`;
    if (g.underRepair > 0) return 'Em manutenção';
    if (g.replacementScheduled > 0) return 'Substituição agendada';
    return 'Funcionando';
  }

  /** Open-report state of the group — `acknowledged` is the strongest signal. */
  function groupReportState(g: EquipmentGroup): EquipmentReportState {
    if (g.openAcknowledged > 0) return 'acknowledged';
    if (g.openPending > 0) return 'pending';
    return 'none';
  }

  function reportStatusLabel(g: EquipmentGroup): string | null {
    const state = groupReportState(g);
    if (state === 'acknowledged') return 'Em análise';
    if (state === 'pending') return 'Reportado';
    return null;
  }

  return { equipmentGroups, groupSeverity, groupStatusLabel, groupReportState, reportStatusLabel };
}
