/* Globales Menü: eine Logik für alle 59 Seiten, unabhängig von Page-Layouts. */
(() => {
  const header = document.querySelector('[data-cm-header]');
  if (!header) return;
  const toggle = header.querySelector('[data-cm-toggle]');
  const nav = header.querySelector('[data-cm-nav]');
  const services = header.querySelector('[data-cm-services]');
  if (!toggle || !nav) return;

  const closeMenu = () => {
    nav.classList.remove('cm-is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Hauptmenü öffnen');
    header.classList.remove('cm-menu-open');
    if (services) services.open = false;
  };

  toggle.addEventListener('click', () => {
    const willOpen = toggle.getAttribute('aria-expanded') !== 'true';
    if (!willOpen) return closeMenu();
    nav.classList.add('cm-is-open');
    header.classList.add('cm-menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Hauptmenü schließen');
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      if (header.contains(document.activeElement)) toggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) closeMenu();
  });
  window.matchMedia('(min-width: 981px)').addEventListener('change', (event) => {
    if (event.matches) closeMenu();
  });

  const top = document.querySelector('[data-cm-backtop]');
  top?.addEventListener('click', (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();