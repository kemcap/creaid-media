(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x-a) / Math.max(.0001,b-a)); return t*t*(3-2*t); };
  const show = (p,a,b) => smooth(a,b,p);
  const set = (node, prop, value) => { if (node) node.style[prop] = value; };
  const state = new Map();
  const tracks = $$('.motion-track');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const adaptive = window.CreAidAdaptiveScroll;
  const navToggle = $('#navToggle'), nav = $('#siteNav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.innerHTML = open ? 'SCHLIESSEN <span aria-hidden="true">×</span>' : 'MENÜ <span aria-hidden="true">☰</span>';
    });
    $$('#siteNav a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open'); navToggle.setAttribute('aria-expanded','false');
      navToggle.innerHTML='MENÜ <span aria-hidden="true">☰</span>';
    }));
  }
  const nodes = {
    hero: { heading: $('.hero-heading'), lines: $$('.hero-heading>span'), intro: $('.hero-intro'), actions: $('.hero-actions'), axes: $('.axes'), stamp: $('.hero-stamp') },
    capabilities: { tiles: $$('.service-tile'), art: $$('.service-tile .tile-art'), active: $('.cap-active-index'), activeLabel: $('.cap-active-label'), heading: $('.cap-intro h2') },
    method: { cards: $$('.method-card'), line: $('.method-line span'), heading: $('.method-heading h2') },
    work: { mag: $('.work-mag'), browser: $('.work-browser'), heading: $('.work-titleline h2') },
    statementContact: { statement: $('.statement-panel'), contact: $('.contact-panel'), edge: $('.statement-mask-edge') }
  };
  function translate(el, x=0, y=0, scale=1, rotate=0) {
    if (el) el.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale}) rotate(${rotate}deg)`;
  }
  function opacity(el, x) { if (el) el.style.opacity = String(clamp(x)); }
  function updateHero(p) {
    const n=nodes.hero;
    const exit = smooth(.40,.88,p);
    n.lines.forEach((el,i)=> { opacity(el, 1 - exit * .47); translate(el,0,-exit*(18+i*18)); });
    translate(n.intro,0,-exit*28); opacity(n.intro,1-exit*.55);
    translate(n.actions,0,-exit*15); opacity(n.actions,1-exit*.45);
    // The interactive crosshair owns the axes positioning.
    translate(n.stamp,0,-exit*30);
  }
  function updateCapabilities(p) {
    // Die Servicekarten werden zeitgesteuert eingeblendet, nicht durch Scrollfortschritt gesteuert.
    const n=nodes.capabilities;
    translate(n.heading,0,-12*smooth(.1,.7,clamp(p/.9)));
  }
  function updateMethod(p){
    const n=nodes.method,k=clamp(p/.9);
    n.cards.forEach((el,i)=>{
      const r=show(k,.05+i*.25,.22+i*.25);
      opacity(el,.08+r*.92);translate(el,0,32*(1-r),.97+.03*r);
    });
    if(n.line) n.line.style.width=`${100*show(k,0,.86)}%`;
    translate(n.heading,0,-10*show(k,.0,.7));
  }
  function updateWork(p){
    // Beide Mockups erscheinen automatisch, unabhängig von der Scroll-Position.
    translate(nodes.work.heading,0,-8*show(clamp(p/.9),.15,.72));
  }
  function updateStatementContact(p) {
    const n = nodes.statementContact;
    if (!n.contact || !n.statement) return;
    const noWipe = reduced.matches || window.matchMedia('(max-width:640px),(max-height:620px),(max-width:900px) and (max-height:700px)').matches;
    const reveal = noWipe ? 1 : show(p, .32, .82);
    // Nur die fuchsiafarbene Statement-Maske gibt den fertig aufgebauten Kontakt frei.
    n.contact.style.clipPath = `inset(0 0 0 ${(1-reveal)*100}%)`;
    n.contact.inert = !noWipe && reveal < .95;
    n.contact.setAttribute('aria-hidden', String(!noWipe && reveal < .95));
    n.statement.setAttribute('aria-hidden', String(!noWipe && reveal >= .95));
    if (n.edge) {
      n.edge.style.left = `${(1-reveal)*100}%`;
      n.edge.style.opacity = String(!noWipe && reveal > .005 && reveal < .995 ? 1 : 0);
    }
  }
  const updaters={hero:updateHero,capabilities:updateCapabilities,method:updateMethod,work:updateWork,statementContact:updateStatementContact};
  function setupTimedReveals() {
    if (reduced.matches || !('IntersectionObserver' in window)) return;
    const groups = [
      {node: $('.cap-grid'), tiles: true},
      {node: $('.work-gallery'), tiles: false}
    ].filter(g=>g.node);
    if (!groups.length) return;
    document.documentElement.classList.add('cm-enhanced');
    const observer = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if (!entry.isIntersecting) return;
        const group=groups.find(g=>g.node===entry.target);
        if (!group) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
        if (group.tiles) {
          const labels=['WEBDESIGN','MARKETING','KI & AUTOMATION','BRANDING'];
          const timers=[0,233,467,700];
          timers.forEach((delay,i)=>setTimeout(()=>{
            const n=nodes.capabilities;
            if (n.active) n.active.textContent=String(i+1).padStart(2,'0');
            if (n.activeLabel) n.activeLabel.textContent=labels[i];
          }, delay));
        }
      });
    },{threshold:0.10,rootMargin:'0px 0px -8% 0px'});
    groups.forEach(g=>observer.observe(g.node));
  }
  setupTimedReveals();
  function measure(){
    tracks.forEach(t=>{
      const rect=t.getBoundingClientRect();
      const stage = t.querySelector('.motion-stage');
      state.set(t, { top:window.scrollY + rect.top, duration:Math.max(1,t.offsetHeight - (stage?.offsetHeight || window.innerHeight)) });
      adaptive?.reset(t);
    });
  }
  let scheduled = false;
  function render(){
    scheduled=false;
    if(reduced.matches){
      Object.entries(updaters).forEach(([name,fn])=>fn(1));
      $$('.stage-footer [data-percent]').forEach(e=>e.textContent='100 %');
      return;
    }
    let visibleIndex=0, local=0, easingActive=false;
    tracks.forEach((t,i)=>{
      const conf=state.get(t); if(!conf)return;
      const target=clamp((window.scrollY-conf.top)/conf.duration);
      const sample=adaptive ? adaptive.progress(t,target) : {value:target,pending:false};
      const p=sample.value;
      easingActive ||= sample.pending;
      const type=t.querySelector('[data-scene]')?.dataset.scene;
      if(type && updaters[type]) updaters[type](p);
      const meter=$(`[data-percent="${type}"]`,t);
      if(meter) meter.textContent=String(Math.round(p*100)).padStart(2,'0')+' %';
      if(window.scrollY+window.innerHeight*.50 >= conf.top) {visibleIndex=i;local=p;}
    });
    const names=['START','KOMPETENZEN','ANSATZ','ARBEITEN','CREAID-PRINZIP / KONTAKT'];
    const chapter=$('.chapter-name'), count=$('.chapter-count'), line=$('.chapter-meter i');
    if(chapter)chapter.textContent=String(visibleIndex+1).padStart(2,'0')+' / '+(visibleIndex===4 && local>.7?'KONTAKT':names[visibleIndex]);
    if(count)count.textContent=String(visibleIndex+1).padStart(2,'0')+' — 05';
    if(line)line.style.height=(100*local)+'%';
    if(easingActive) schedule();
  }
  function schedule(){ if(!scheduled){scheduled=true;requestAnimationFrame(render);} }
  let resizeTimer;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{measure();schedule()},80);},{passive:true});
  window.addEventListener('scroll',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){measure();schedule()}});
  reduced.addEventListener('change',()=>{measure();schedule()});
  window.addEventListener('load',()=>{measure();schedule()});
  measure();schedule();
  // Hero Fadenkreuz: sanfte Maus-Nachführung, kurzer Touch-Impuls, niemals Pointer-Blocking.
  const heroStage=$('.hero-stage'), cross=nodes.hero.axes;
  if(heroStage && cross){
    const fine=window.matchMedia('(hover:hover) and (pointer:fine)');
    const motion={x:.60,y:.47,targetX:.60,targetY:.47,frame:0};
    let touchFade;
    const position=e=>{
      const rect=heroStage.getBoundingClientRect();
      return {x:clamp((e.clientX-rect.left)/Math.max(1,rect.width)),
              y:clamp((e.clientY-rect.top)/Math.max(1,rect.height))};
    };
    const paint=(x,y)=>{
      cross.style.setProperty('--cm-cross-x',`${(x*100).toFixed(3)}%`);
      cross.style.setProperty('--cm-cross-y',`${(y*100).toFixed(3)}%`);
    };
    const follow=()=>{
      motion.frame=0;
      if(reduced.matches)return;
      motion.x=mix(motion.x,motion.targetX,.14);
      motion.y=mix(motion.y,motion.targetY,.14);
      paint(motion.x,motion.y);
      if(Math.abs(motion.targetX-motion.x)+Math.abs(motion.targetY-motion.y)>.001)
        motion.frame=requestAnimationFrame(follow);
    };
    const cue=()=>{if(!motion.frame && !reduced.matches)motion.frame=requestAnimationFrame(follow)};
    heroStage.addEventListener('pointermove',e=>{
      if(reduced.matches)return;
      if(e.pointerType==='touch'){
        if(!cross.classList.contains('cm-cross-touch-active'))return;
        const point=position(e);paint(point.x,point.y);
      }else if(fine.matches){
        const point=position(e);
        motion.targetX=point.x;motion.targetY=point.y;
        cue();
      }
    },{passive:true});
    heroStage.addEventListener('pointerleave',e=>{
      if(e.pointerType==='touch'||reduced.matches)return;
      motion.targetX=.60;motion.targetY=.47;cue();
    },{passive:true});
    heroStage.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='touch'||reduced.matches)return;
      clearTimeout(touchFade);
      if(motion.frame){cancelAnimationFrame(motion.frame);motion.frame=0}
      const point=position(e);
      motion.x=motion.targetX=point.x;motion.y=motion.targetY=point.y;
      paint(point.x,point.y);
      cross.classList.add('cm-cross-touch-active');
    },{passive:true});
    const fadeTouch=()=>{
      clearTimeout(touchFade);
      touchFade=setTimeout(()=>cross.classList.remove('cm-cross-touch-active'),550);
    };
    heroStage.addEventListener('pointerup',fadeTouch,{passive:true});
    heroStage.addEventListener('pointercancel',fadeTouch,{passive:true});
  }

  // Mauslicht ist reines Dekor. Kein Cursor-Replacement, kein Maus-Blocking.
  const glow=$('.cursor-glow');
  if(glow && window.matchMedia('(hover:hover) and (pointer:fine)').matches && !reduced.matches){
    let targetX=-1000,targetY=-1000,x=-1000,y=-1000;
    window.addEventListener('pointermove',e=>{targetX=e.clientX-180;targetY=e.clientY-180;},{passive:true});
    const follow=()=>{x=mix(x,targetX,.12);y=mix(y,targetY,.12);glow.style.transform=`translate3d(${x}px,${y}px,0)`;requestAnimationFrame(follow)};
    requestAnimationFrame(follow);
  }
})();
