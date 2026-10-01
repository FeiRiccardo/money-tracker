/**
 * Keeps --app-height / --app-top in sync with the visual viewport, so the app (and the pinned Save
 * button) stays above the on-screen keyboard on phones where the keyboard does not resize the page.
 */
export function trackViewport(): void {
  const vv = window.visualViewport;
  if (!vv) return;
  const root = document.documentElement.style;
  const update = () => {
    root.setProperty('--app-height', `${vv.height}px`);
    root.setProperty('--app-top', `${vv.offsetTop}px`);
  };
  update();
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
}
