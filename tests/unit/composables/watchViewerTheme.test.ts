import { nextTick, ref } from 'vue';
import { expect, it, vi } from 'vitest';
import { watchViewerTheme } from '@/composables/watchViewerTheme';

it('changes the viewer theme without updating pin labels', async () => {
  const dark = ref(false);
  const viewer = { setThemeMode: vi.fn(), updatePinLabelStatus: vi.fn() };
  const stop = watchViewerTheme(dark, value => viewer.setThemeMode(value));
  dark.value = true;
  await nextTick();
  expect(viewer.setThemeMode.mock.calls).toEqual([[false], [true]]);
  expect(viewer.updatePinLabelStatus).not.toHaveBeenCalled();
  stop();
});
