import { ref, watch } from 'vue';

const STORAGE_KEY = 'ufcim-theme';

function getInitialTheme(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const isDark = ref(getInitialTheme());

watch(isDark, (value) => {
  document.documentElement.classList.toggle('dark', value);
  localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light');
}, { immediate: true });

export function useDarkMode() {
  function toggleDarkMode() {
    isDark.value = !isDark.value;
  }

  return { isDark, toggleDarkMode };
}
