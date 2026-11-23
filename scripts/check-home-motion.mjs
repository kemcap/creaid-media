import {readFileSync} from 'node:fs';

const source = readFileSync('src/pages/index.njk','utf8');
const html = readFileSync('dist/index.html','utf8');
const css = readFileSync('dist/assets/home-motion-v5.css','utf8');
const js = readFileSync('dist/assets/home-motion-v5.js','utf8');
const fallback = readFileSync('dist/assets/no-script.css','utf8');
function assert(condition,message){if(!condition)throw new Error(message);}

assert(source.includes('track-statement-contact'), 'Statement/contact must share one motion track');
assert(!source.includes('class="motion-track track-contact"'), 'Standalone contact track must be removed');
assert(!source.includes('class="motion-track track-statement"'), 'Standalone statement track must be removed');
assert(!source.includes('partials/footer-home.njk'), 'Legacy footer must be removed from contact section');
assert(html.includes('class="statement-panel"'), 'Fuchsia statement layer not rendered');
assert(html.includes('class="contact-panel"'), 'Dark contact layer not rendered');
assert(html.includes('class="statement-mask-edge"'), 'Mask edge missing');
assert(html.includes('id="kontakt"'), 'Contact anchor missing');
assert(html.indexOf('id="cm-global-footer"') > html.indexOf('</main>'), 'Global footer must be outside the combined scene');
assert((html.match(/id="cm-global-footer"/g)||[]).length===1, 'Expected exactly one footer');
assert(css.includes('.statement-contact-stage .statement-panel') && css.includes('background:var(--pink)'), 'Fuchsia statement background missing');
assert(css.includes('.statement-contact-stage .contact-panel') && css.includes('background:#17181a'), 'Dark contact background missing');
assert(css.includes('clip-path:inset(0 0 0 100%)'), 'Mask initial state missing');
assert(js.includes('show(p, .32, .82)'), 'Mask scroll window missing');
assert(js.includes('contact.style.clipPath'), 'Scroll-bound mask update missing');
assert(!js.includes('function updateContact('), 'Old scroll-dependent contact text animation must be removed');

assert(css.includes('nth-child(4){animation-delay:.7s}'), 'Last service card must start at 0.7 seconds');
assert(css.includes('nth-child(2){animation-delay:.233s}'), 'Service cards must stagger automatically');
assert(css.includes('cm-work-editorial-enter') && css.includes('cm-work-browser-enter'), 'Timed mockup animations missing');
assert(js.includes('IntersectionObserver') && js.includes('setupTimedReveals'), 'Time-based intersection-triggered sequences missing');
const capCode=js.slice(js.indexOf('function updateCapabilities('),js.indexOf('function updateMethod('));
const workCode=js.slice(js.indexOf('function updateWork('),js.indexOf('function updateStatementContact('));
assert(!capCode.includes('n.tiles.forEach') && !workCode.includes('opacity(n.mag'), 'Service and work mockups must not be scrubbed by scroll');
assert(fallback.includes('track-statement-contact') && fallback.includes('clip-path:none!important'), 'No-JS fallback missing');
assert(css.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced motion fallback missing');

// Scroll-track durations are deliberately short for static gallery/capability scenes.
for (const [name,height] of [
  ['track-hero',118],['track-capabilities',155],['track-method',185],
  ['track-work',150],['track-statement-contact',195]
]) {
  assert(source.includes('class="motion-track '+name+'"') && source.includes('--track:'+height+'vh'),
    name+' must use the compact scroll distance '+height+'vh');
}
const heroBalance = readFileSync('dist/assets/hero-balance.css','utf8');
assert(heroBalance.includes('height:calc(100dvh - 92px)') &&
       heroBalance.includes('height:calc(100dvh - 76px)'),
       'Hero stage and ticker must fit the visible desktop/mobile viewport');
assert(js.includes('stage?.offsetHeight || window.innerHeight'),
       'Scroll progress must be measured against the sticky stage height');
const globalCSS = readFileSync('dist/assets/global-shell.css','utf8');
assert(globalCSS.includes('Compact global footer'), 'Compact footer CSS missing');
assert(globalCSS.includes('padding:38px 0 34px') &&
       globalCSS.includes('padding:29px 0 33px'),
       'Compact footer spacing missing');
assert(html.includes('Ideen verdienen <em>Wirkung.</em>'),
       'Compact footer heading must use natural wrapping');

console.log('Homepage verified: time-staggered cards and mockups, one mask-based statement/contact section, separate global footer, fallback states.');

assert(html.includes('<span class="pink-dot" aria-hidden="true"></span>'),'Decorative hero ball missing');
assert(css.includes('animation:cm-hero-ball-hop 3s infinite'),'Hero ball needs a three-second loop');
assert(css.includes('margin-left:.15em')&&css.includes('translateY(-.65em)')&&css.includes('translateY(-.20em)'),'Hero ball spacing and rebound must match approved prototype');
assert(css.includes('animation:none!important;transform:none!important'),'Reduced-motion fallback missing');
console.log('PASS: decorative homepage ball, elastic rebound, spacing and reduced motion.');
