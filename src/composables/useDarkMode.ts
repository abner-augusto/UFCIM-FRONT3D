import { ref } from 'vue';

const STORAGE_KEY = 'ufcim-theme';

type ThemeTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => { finished: Promise<void> };
};

type ThemeToggleTrigger = MouseEvent | HTMLElement;

function readPreference(): boolean | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' ? true : stored === 'light' ? false : null;
  } catch {
    return null;
  }
}

const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
let preference = readPreference();
const isDark = ref(preference ?? systemTheme.matches);

function applyTheme(value: boolean) {
  document.documentElement.classList.toggle('dark', value);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value ? '#1c1c1c' : '#00697D');
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

applyTheme(isDark.value);
systemTheme.addEventListener('change', (event) => {
  if (preference === null) {
    isDark.value = event.matches;
    applyTheme(event.matches);
  }
});
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  preference = event.newValue === 'dark' ? true : event.newValue === 'light' ? false : null;
  isDark.value = preference ?? systemTheme.matches;
  applyTheme(isDark.value);
});

export function useDarkMode() {
  function setDarkMode(value: boolean, trigger?: ThemeToggleTrigger) {
    if (isDark.value === value) return;

    const switchTheme = () => {
      preference = value === systemTheme.matches ? null : value;
      try {
        if (preference === null) localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light');
      } catch { void 0; }
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
