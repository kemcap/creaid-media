/* Global CreAid-Media navigation; independent of page-specific scripts. */
(() => {
  'use strict';
  const header = document.querySelector('#cm-global-header');
  if (!header || header.classList.contains('cm-header--ready')) return;
  const button = header.querySelector('#cm-menu-toggle');
  const nav = header.querySelector('#cm-primary-nav');
  if (!button || !nav) return;
  const details = header.querySelector('.cm-header__services');
  const mobile = () => window.matchMedia('(max-width: 860px)').matches;
  const close = (restoreFocus = false) => {
    nav.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Hauptmenü öffnen');
    header.classList.remove('cm-header--menu-open');
    if (details) details.open = false;
    if (restoreFocus) {
      const target = mobile() ? button : details?.querySelector('summary');
      target?.focus();
    }
  };
  header.classList.add('cm-header--ready');
  button.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Hauptmenü schließen' : 'Hauptmenü öffnen');
    header.classList.toggle('cm-header--menu-open', open);
    if (!open && details) details.open = false;
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a') && mobile()) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (nav.classList.contains('is-open') || details?.open)) {
      event.preventDefault();
      close(true);
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!header.contains(event.target) && (nav.classList.contains('is-open') || details?.open)) close();
  });
  window.addEventListener('resize', () => {
    if (!mobile() && nav.classList.contains('is-open')) close();
  }, { passive: true });
  // Don't trap navigation when JavaScript is unavailable; global-shell.css
  // keeps the mobile links readable until this class is added.
})();
