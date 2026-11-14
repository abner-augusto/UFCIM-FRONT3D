import { ref } from 'vue';

export function focusPageHeading() {
  const headings = document.querySelectorAll<HTMLElement>('#conteudo h1');
  const heading = headings[headings.length - 1];
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

export function preventNavigationFocusRestore(event: Event) {
  event.preventDefault();
  setTimeout(focusPageHeading, 0);
}

export function useNavigationCloseFocus() {
  const navigating = ref(false);
  function markNavigating(value = true) {
    navigating.value = value;
  }
  function reset() {
    navigating.value = false;
  }
  function onCloseAutoFocus(event: Event) {
    if (navigating.value) preventNavigationFocusRestore(event);
  }
  return { markNavigating, reset, onCloseAutoFocus };
}
