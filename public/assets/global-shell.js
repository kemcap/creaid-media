/* Global CreAid-Media navigation; independent of page-specific scripts. */
(() => {
  'use strict';
  // Production and preview may share IONOS files; the static build defaults to production text.
  const notice = document.querySelector('[data-creaid-preview-notice]');
  if (notice && location.origin !== 'https://creaid-media.de') {
    notice.textContent = 'Designvorschau · Nicht die veröffentlichte Unternehmenswebsite';
    notice.hidden = false;
  }
  const header = document.querySelector('#cm-global-header');
  if (!header || header.classList.contains('cm-header--ready')) return;
  const button = header.querySelector('#cm-menu-toggle');
  const nav = header.querySelector('#cm-primary-nav');
  if (!button || !nav) return;
  const details = header.querySelector('.cm-header__services');
  const mobile = () => window.matchMedia('(max-width: 860px)').matches;
  // Cap stagger at 110ms so even long nested service lists remain immediately usable.
  details?.querySelectorAll('.cm-header__dropdown-kicker,.cm-header__dropdown a').forEach((item,index)=>item.style.setProperty('--cm-submenu-item-delay',`${Math.min(index,5)*22}ms`));
  const close = (restoreFocus = false) => {
    nav.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
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
})();
