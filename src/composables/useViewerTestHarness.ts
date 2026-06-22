import { onMounted, onUnmounted } from 'vue';

export interface ViewerTestHarness {
  /** Focus the pin for `modelId` and open its RoomPopup (same path as a pin click). */
  openRoom: (modelId: string) => void | Promise<void>;
  /** Close the currently open RoomPopup. */
  closePopup: () => void;
  /** Focus a building/block by its manifest id (e.g. "bloco1", "pavilhao"). */
  focusBuilding: (id: string | null) => void;
  /** Switch the active floor level. */
  focusFloor: (level: number) => void;
  /** List the rooms known to the viewer, for test discovery. */
  listRooms: () => Array<{ modelId: string; name: string }>;
}

/**
 * Dev-only test harness: exposes `window.__ufcimViewer` so the 3D viewer's
 * pin/popup interactions can be driven programmatically from automated browser
 * tests (clicking WebGL pin sprites by pixel coordinate is unreliable).
 *
 * Guarded by `import.meta.env.DEV`, so the registration — and therefore the
 * whole closure it captures — is dead-code-eliminated from production builds.
 *
 * Usage from a test/devtools console:
 *   window.__ufcimViewer.listRooms()
 *   await window.__ufcimViewer.openRoom('<modelId>')
 *   window.__ufcimViewer.closePopup()
 */
export function useViewerTestHarness(harness: ViewerTestHarness) {
  if (!import.meta.env.DEV) return;

  onMounted(() => {
    (window as unknown as Record<string, unknown>).__ufcimViewer = harness;
    console.info('[viewer-test] window.__ufcimViewer ready →', Object.keys(harness).join(', '));
  });

  onUnmounted(() => {
    delete (window as unknown as Record<string, unknown>).__ufcimViewer;
  });
}
