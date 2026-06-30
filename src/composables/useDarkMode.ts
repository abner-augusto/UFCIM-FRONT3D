import { ref, watch } from 'vue';

const STORAGE_KEY = 'ufcim-theme';

type ThemeTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => { finished: Promise<void> };
};

type ThemeToggleTrigger = MouseEvent | HTMLElement;

function getInitialTheme(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const isDark = ref(getInitialTheme());

function applyTheme(value: boolean) {
  document.documentElement.classList.toggle('dark', value);
  localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light');
}

function getTriggerElement(trigger?: ThemeToggleTrigger): HTMLElement | null {
  if (!trigger) return null;
  if (trigger instanceof HTMLElement) return trigger;
  return trigger.currentTarget instanceof HTMLElement ? trigger.currentTarget : null;
}

function setThemeTransitionOrigin(trigger?: ThemeToggleTrigger) {
  const root = document.documentElement;
  const element = getTriggerElement(trigger);
  const rect = element?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
  const radius = Math.ceil(Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  ));

  root.style.setProperty('--theme-transition-x', `${x}px`);
  root.style.setProperty('--theme-transition-y', `${y}px`);
  root.style.setProperty('--theme-transition-radius', `${radius}px`);
}

watch(isDark, applyTheme, { immediate: true });

export function useDarkMode() {
  function setDarkMode(value: boolean, trigger?: ThemeToggleTrigger) {
    if (isDark.value === value) return;

    const switchTheme = () => {
      isDark.value = value;
      applyTheme(value);
    };

    const transitionDocument = document as ThemeTransitionDocument;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!transitionDocument.startViewTransition || prefersReducedMotion) {
      switchTheme();
      return;
    }

    setThemeTransitionOrigin(trigger);
    void transitionDocument.startViewTransition(switchTheme).finished;
  }

  function toggleDarkMode(trigger?: ThemeToggleTrigger) {
    setDarkMode(!isDark.value, trigger);
  }

  return { isDark, setDarkMode, toggleDarkMode };
}
