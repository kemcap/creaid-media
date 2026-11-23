/* Phase 1: measure the closed shared header; stagger natural-flow content. */
(()=>{
  'use strict';
  const root=document.documentElement,header=document.querySelector('#cm-global-header');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const staticStory=matchMedia('(max-height:620px),(max-width:900px) and (max-height:700px),(prefers-reduced-motion:reduce)');
  function measure(){
    if(!header||header.classList.contains('cm-header--menu-open'))return;
    root.style.setProperty('--cm-nav-height',Math.ceil(header.getBoundingClientRect().height)+'px');
  }
  measure();
  if(header&&'ResizeObserver' in window)new ResizeObserver(measure).observe(header);
  addEventListener('resize',measure,{passive:true});
  const finalCTA=document.querySelector('main .contact-panel a.button-primary,main .service-closing a.cta,main .sp-closer a,main #kontakt-abschluss a,main .j-bottom-cta a.j-button,main .l-final a.l-button,main .a-track:last-of-type a.a-btn');
  const mainSections=[...document.querySelectorAll('main > section:not(.audit-related)')];
  const last=mainSections.at(-1);
  if(finalCTA||last?.querySelector('a.a-btn[href*="kontakt"],a.a-btn[href^="mailto:"]'))document.body.classList.add('cm-has-closing-cta');
  function syncStatic(){
    root.classList.toggle('cm-static-story',staticStory.matches);
    if(staticStory.matches){
      document.querySelectorAll('main .sp-story .sp-scene,main .service-story .scene-copy').forEach(n=>n.setAttribute('aria-hidden','false'));
    }
  }
  syncStatic();staticStory.addEventListener('change',syncStatic);
  if(reduced.matches||!('IntersectionObserver' in window))return;
  const groups=document.querySelectorAll('main > .a-track:not(.sp-story),main > .service-detail,main > .service-closing,main > .j-feature-track');
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(({target,isIntersecting})=>{
      if(!isIntersecting)return;
      observer.unobserve(target);
      const cards=target.querySelectorAll('[data-step],[data-reveal],[data-panel],[data-sp-card],[data-sp-process],[data-sp-end],.sp-hub-link,.sp-hub-card,.detail-card,.j-feature-copy,.j-feature-media');
      Array.from(cards).forEach((el,i)=>{
        el.style.setProperty('--cm-flow-delay',Math.min(i,5)*90+'ms');
        el.classList.add('cm-flow-enter');
      });
    });
  },{threshold:.06});
  groups.forEach(g=>observer.observe(g));
})();
