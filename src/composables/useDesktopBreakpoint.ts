import { onMounted, onUnmounted, ref } from 'vue';

export function useDesktopBreakpoint(query = '(min-width: 768px)') {
  const mediaQuery = window.matchMedia(query);
  const isDesktop = ref(mediaQuery.matches);

  function handleMediaChange(event: MediaQueryListEvent | MediaQueryList) {
    isDesktop.value = event.matches;
  }

  onMounted(() => {
    mediaQuery.addEventListener('change', handleMediaChange);
  });

  onUnmounted(() => {
    mediaQuery.removeEventListener('change', handleMediaChange);
  });

  return { isDesktop };
}
