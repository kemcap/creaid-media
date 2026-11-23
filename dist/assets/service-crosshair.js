/* Homepage-style decorative crosshair for service and specialty hero sections. */
(() => {
  'use strict';
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine=window.matchMedia('(hover:hover) and (pointer:fine)');
  const clamp=n=>Math.max(0,Math.min(1,n));
  document.querySelectorAll('main > .page-top, main > .sp-hero').forEach(hero=>{
    if(hero.querySelector('.cm-service-crosshair'))return;
    const cross=document.createElement('div');
    cross.className='cm-service-crosshair';
    cross.setAttribute('aria-hidden','true');
    cross.append(document.createElement('span'),document.createElement('span'),document.createElement('b'));
    hero.prepend(cross);
    hero.classList.add('cm-crosshair-ready');
    const m={x:.60,y:.47,tx:.60,ty:.47,frame:0};
    let timer=0,activeTouch=null;
    const point=e=>{
      const rect=hero.getBoundingClientRect();
      return [clamp((e.clientX-rect.left)/Math.max(1,rect.width)),
              clamp((e.clientY-rect.top)/Math.max(1,rect.height))];
    };
    const paint=(x,y)=>{
      cross.style.setProperty('--cm-cross-x',(x*100).toFixed(3)+'%');
      cross.style.setProperty('--cm-cross-y',(y*100).toFixed(3)+'%');
    };
    const follow=()=>{
      m.frame=0;if(reduced.matches)return;
      m.x+=(m.tx-m.x)*.14;m.y+=(m.ty-m.y)*.14;
      paint(m.x,m.y);
      if(Math.abs(m.tx-m.x)+Math.abs(m.ty-m.y)>.001)m.frame=requestAnimationFrame(follow);
    };
    const cue=()=>{if(!m.frame&&!reduced.matches)m.frame=requestAnimationFrame(follow)};
    hero.addEventListener('pointermove',e=>{
      if(reduced.matches)return;
      const [x,y]=point(e);
      if(e.pointerType==='touch'){
        if(activeTouch===e.pointerId){m.x=m.tx=x;m.y=m.ty=y;paint(x,y)}
      }else if(fine.matches){m.tx=x;m.ty=y;cue()}
    },{passive:true});
    hero.addEventListener('pointerleave',e=>{
      if(e.pointerType==='touch'||reduced.matches)return;
      m.tx=.60;m.ty=.47;cue();
    },{passive:true});
    hero.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='touch'||reduced.matches)return;
      clearTimeout(timer);
      if(m.frame){cancelAnimationFrame(m.frame);m.frame=0}
      activeTouch=e.pointerId;
      const [x,y]=point(e);m.x=m.tx=x;m.y=m.ty=y;paint(x,y);
      cross.classList.add('cm-cross-touch-active');
    },{passive:true});
    const fade=e=>{
      if(e.pointerType!=='touch'||activeTouch!==e.pointerId)return;
      activeTouch=null;clearTimeout(timer);
      timer=setTimeout(()=>cross.classList.remove('cm-cross-touch-active'),550);
    };
    hero.addEventListener('pointerup',fade,{passive:true});
    hero.addEventListener('pointercancel',fade,{passive:true});
    reduced.addEventListener('change',()=>{
      if(!reduced.matches)return;
      if(m.frame){cancelAnimationFrame(m.frame);m.frame=0}
      clearTimeout(timer);activeTouch=null;
      cross.classList.remove('cm-cross-touch-active');
      m.x=m.tx=.60;m.y=m.ty=.47;paint(m.x,m.y);
    });
  });
})();
