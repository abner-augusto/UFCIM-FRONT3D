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
