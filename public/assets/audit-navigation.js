(() => {
  // The shared header owns all navigation events; retain only the legacy fallback.
  if (document.querySelector('#cm-global-header')) return;
  const nav = document.querySelector('nav[aria-label="Hauptnavigation"]');
  if (!nav?.id) return;

  const button = document.querySelector(`button[aria-controls="${nav.id}"]`);
  if (!button) return;

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      button.click();
      button.focus();
    }
  });
})();
