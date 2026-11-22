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
    statement: { chunks: $$('.statement-layout h2>span'), cross: $('.statement-cross') },
    contact: { lines: $$('.contact-copy h2>span, .contact-copy h2>em'), aside: $('.contact-aside'), cta: $('.contact-aside .button-primary'), footer: $('.site-footer'), graphic: $('.contact-graphic') }
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
    translate(n.axes, 0, exit*30); translate(n.stamp,0,-exit*30);
  }
  function updateCapabilities(p) {
    const n=nodes.capabilities, k=clamp(p/.9);
    const starts=[.00,.15,.32,.49];
    n.tiles.forEach((el,i)=>{
      const r = show(k,starts[i],starts[i]+.14);
      opacity(el, .09 + r*.91);
      translate(el,25*(1-r),42*(1-r), .94 + .06*r);
      const art=n.art[i]; if(art) art.style.rotate = `${(1-r)*-15 + Math.sin(k*7+i)*3}deg`;
    });
    const idx = Math.min(3, k<.19?0:k<.39?1:k<.60?2:3);
    if(n.active) n.active.textContent=String(idx+1).padStart(2,'0');
    if(n.activeLabel) n.activeLabel.textContent=['WEBDESIGN','MARKETING','KI & AUTOMATION','BRANDING'][idx];
    translate(n.heading,0,-12*smooth(.1,.7,k));
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
    const n=nodes.work,k=clamp(p/.9);
    const start = show(k,.01,.23), second = show(k,.34,.59);
    opacity(n.mag,.1+.9*start);translate(n.mag,25*(1-start)-15*second,38*(1-start),.90+.1*start - .035*second,-3+3*start);
    opacity(n.browser,.04+.96*second);translate(n.browser,95*(1-second),25*(1-second),.86+.14*second,3*(1-second));
    translate(n.heading,0,-8*show(k,.15,.72));
  }
  function updateStatement(p){
    const n=nodes.statement,k=clamp(p/.9);
    const timings=[[0,.18],[.17,.37],[.35,.58],[.54,.78]];
    n.chunks.forEach((el,i)=>{
      const r=show(k,timings[i][0],timings[i][1]);
      opacity(el,.05+.95*r);translate(el,(i%2?55:-55)*(1-r),22*(1-r),.94+.06*r);
    });
    if(n.cross) n.cross.style.transform=`rotate(${k*180}deg)`;
  }
  function updateContact(p){
    const n=nodes.contact,k=clamp(p/.9);
    n.lines.forEach((el,i)=>{
      const r=show(k,.02+i*.13,.17+i*.13);
      opacity(el,.04+.96*r);translate(el,-33*(1-r),20*(1-r));
    });
    const a=show(k,.54,.73), b=show(k,.69,.83), c=show(k,.72,.88);
    opacity(n.aside,.04+.96*a);translate(n.aside,45*(1-a),20*(1-a));
    opacity(n.cta,.16+.84*b);translate(n.cta,0,20*(1-b));
    opacity(n.footer,.12+.88*c);translate(n.footer,0,18*(1-c));
    if(n.graphic) n.graphic.style.transform=`translate3d(${k*50}px,${-k*15}px,0)`;
  }
  const updaters={hero:updateHero,capabilities:updateCapabilities,method:updateMethod,work:updateWork,statement:updateStatement,contact:updateContact};
  function measure(){
    tracks.forEach(t=>{
      const rect=t.getBoundingClientRect();
      state.set(t, { top:window.scrollY + rect.top, duration:Math.max(1,t.offsetHeight - window.innerHeight) });
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
    let visibleIndex=0, local=0;
    tracks.forEach((t,i)=>{
      const conf=state.get(t); if(!conf)return;
      const p=clamp((window.scrollY-conf.top)/conf.duration);
      const type=t.querySelector('[data-scene]')?.dataset.scene;
      if(type && updaters[type]) updaters[type](p);
      const meter=$(`[data-percent="${type}"]`,t);
      if(meter) meter.textContent=String(Math.round(p*100)).padStart(2,'0')+' %';
      if(window.scrollY+window.innerHeight*.50 >= conf.top) {visibleIndex=i;local=p;}
    });
    const names=['START','KOMPETENZEN','ANSATZ','ARBEITEN','CREAID-PRINZIP','KONTAKT'];
    const chapter=$('.chapter-name'), count=$('.chapter-count'), line=$('.chapter-meter i');
    if(chapter)chapter.textContent=String(visibleIndex+1).padStart(2,'0')+' / '+names[visibleIndex];
    if(count)count.textContent=String(visibleIndex+1).padStart(2,'0')+' — 06';
    if(line)line.style.height=(100*local)+'%';
  }
  function schedule(){ if(!scheduled){scheduled=true;requestAnimationFrame(render);} }
  let resizeTimer;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{measure();schedule()},80);},{passive:true});
  window.addEventListener('scroll',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){measure();schedule()}});
  reduced.addEventListener('change',()=>{measure();schedule()});
  window.addEventListener('load',()=>{measure();schedule()});
  measure();schedule();
  // Mauslicht ist reines Dekor. Kein Cursor-Replacement, kein Maus-Blocking.
  const glow=$('.cursor-glow');
  if(glow && window.matchMedia('(hover:hover) and (pointer:fine)').matches && !reduced.matches){
    let targetX=-1000,targetY=-1000,x=-1000,y=-1000;
    window.addEventListener('pointermove',e=>{targetX=e.clientX-180;targetY=e.clientY-180;},{passive:true});
    const follow=()=>{x=mix(x,targetX,.12);y=mix(y,targetY,.12);glow.style.transform=`translate3d(${x}px,${y}px,0)`;requestAnimationFrame(follow)};
    requestAnimationFrame(follow);
  }
})();
