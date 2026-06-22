import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

interface ViewerSyncSource {
  getBuildingsList: () => { id: string; name: string }[];
  getFloorsForBuilding: (id: string) => { level: number; name: string }[];
  getActiveBuildingId: () => string | null;
  getActiveFloorLevel: () => number | null;
}

/**
 * Bridges reactive Vue state to the imperative Three.js viewer.
 * Subscribes to 'ufcim:building-changed' / 'ufcim:floor-changed' custom events
 * and syncs viewer state when the viewer becomes ready or its ref changes.
 *
 * @param getViewerRef - getter for the exposed Three.js API (plain function, not a Ref)
 * @param getReady     - getter for the viewer ready flag
 */
export function useViewerSync(
  getViewerRef: () => ViewerSyncSource | null,
  getReady: () => boolean,
) {
  const activeBuildingId = ref<string | null>(null);
  const activeFloorLevel = ref<number | null>(null);
  const buildings = ref<{ id: string; name: string }[]>([]);

  const floors = computed<{ level: number; name: string }[]>(() => {
    if (!activeBuildingId.value) return [];
    return getViewerRef()?.getFloorsForBuilding(activeBuildingId.value) ?? [];
  });

  function syncState() {
    const viewer = getViewerRef();
    if (!viewer || !getReady()) return;
    activeBuildingId.value = viewer.getActiveBuildingId();
    activeFloorLevel.value = viewer.getActiveFloorLevel();
    if (buildings.value.length === 0) {
      buildings.value = viewer.getBuildingsList();
    }
  }

  const onBuildingChanged = (e: Event) => {
    const { buildingID, activeFloor } = (e as CustomEvent).detail;
    activeBuildingId.value = buildingID;
    activeFloorLevel.value = activeFloor;
  };

  const onFloorChanged = (e: Event) => {
    activeFloorLevel.value = (e as CustomEvent).detail.level;
  };

  onMounted(() => {
    window.addEventListener('ufcim:building-changed', onBuildingChanged);
    window.addEventListener('ufcim:floor-changed', onFloorChanged);
    if (getReady()) syncState();
  });

  onUnmounted(() => {
    window.removeEventListener('ufcim:building-changed', onBuildingChanged);
    window.removeEventListener('ufcim:floor-changed', onFloorChanged);
  });

  watch(getViewerRef, (newRef) => {
    if (newRef && getReady()) syncState();
  }, { immediate: true });

  watch(getReady, (isReady) => {
    if (isReady) syncState();
  }, { immediate: true });

  return { activeBuildingId, activeFloorLevel, buildings, floors };
}
