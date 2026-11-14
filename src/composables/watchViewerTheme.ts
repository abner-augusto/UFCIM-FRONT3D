import { watch, type Ref } from 'vue';

export function watchViewerTheme(isDark: Ref<boolean>, setTheme: (dark: boolean) => void) {
  return watch(isDark, setTheme, { immediate: true });
}
