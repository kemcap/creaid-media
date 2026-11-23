(() => {
  'use strict';
  const tracks=[...document.querySelectorAll('.a-track:not(.sp-track)')];
  const root=document.documentElement;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=n=>Math.min(1,Math.max(0,n));
  const smooth=(a,b,t)=>{let z=clamp((t-a)/(b-a));return z*z*(3-2*z)};
  const lerp=(a,b,t)=>a+(b-a)*t;
  const menu=document.querySelector('#agencyMenu');
  const nav=document.querySelector('#agencyLinks');
  if(menu&&nav){menu.addEventListener('click',()=>{
    const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'SCHLIESSEN ×':'MENÜ ☰';
  });nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='MENÜ ☰'}));}
  let raf=0;
  function draw(){raf=0;
    let easingActive=false;
    const vh=window.innerHeight;
    tracks.forEach(track=>{
      if(getComputedStyle(track.firstElementChild).position!=='sticky')return;
      const box=track.getBoundingClientRect();
      if(box.bottom < -vh*.2 || box.top > vh*1.2)return;
      const travel=Math.max(1,track.offsetHeight-vh);
      const target=clamp(-box.top/travel);
      const sample=window.CreAidAdaptiveScroll?.progress(track,target) || {value:target,pending:false};
      const raw=sample.value,k=clamp(raw/.9); // 90/10 hold
      easingActive ||= sample.pending;
      track.style.setProperty('--a-progress',`${Math.round(raw*100)}%`);
      const percent=track.querySelector('[data-percent]');if(percent)percent.textContent=`${Math.round(raw*100).toString().padStart(2,'0')} %`;
      track.querySelectorAll('[data-step]').forEach((node,i)=>{
        const start=.02+i*.235,end=start+.19;
        const r=smooth(start,end,k);
        node.style.opacity=String(.035+.965*r);
        node.style.transform=`translate3d(${(i%2?34:-34)*(1-r)}px,${45*(1-r)}px,0) scale(${lerp(.955,1,r)})`;
      });
      track.querySelectorAll('[data-reveal]').forEach((node,i)=>{
        const start=.01+i*.20,end=start+.17;
        const r=smooth(start,end,k);
        node.style.opacity=String(.02+.98*r);
        node.style.transform=`translate3d(0,${(1-r)*35}px,0)`;
      });
      track.querySelectorAll('[data-panel]').forEach((node,i)=>{
        const start=.02+i*.245,end=start+.20;
        const r=smooth(start,end,k);
        node.style.opacity=String(.05+.95*r);
        node.style.transform=`translate3d(${(1-r)*85}px,${(1-r)*29}px,0) scale(${lerp(.92,1,r)})`;
      });
      track.querySelectorAll('[data-grow]').forEach(node=>{
        const r=smooth(.0,.82,k);node.style.transform=`scaleX(${r})`;
      });
      const active=track.querySelector('[data-active]');if(active)active.textContent=String(Math.min(3,Math.floor(k*3.0)+1)).padStart(2,'0');
    });
    if(easingActive)update();
  }
  function update(){if(!raf)raf=requestAnimationFrame(draw)}
  if(!reduce.matches){document.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update,{passive:true});requestAnimationFrame(draw);}
  const pointer=document.querySelector('.a-cursor');
  if(pointer&&!reduce.matches&&matchMedia('(hover:hover) and (pointer:fine)').matches){document.addEventListener('pointermove',e=>{pointer.style.left=`${e.clientX}px`;pointer.style.top=`${e.clientY}px`;pointer.style.opacity='1'},{passive:true});document.addEventListener('pointerleave',()=>pointer.style.opacity='0');}
  document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{const sel=document.querySelector('#aService');if(sel)sel.value=link.getAttribute('data-service');}));
  const form=document.querySelector('#agencyEnquiry');
  if(form){const params=new URLSearchParams(location.search);if(params.get('service')){const sel=form.querySelector('[name="service"]');const requested=params.get('service');const legacy={'Marketing & Branding':'Digitales Marketing'};const option=[...sel.options].find(x=>x.value===(legacy[requested]||requested));if(option)sel.value=option.value;}
    form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;
      const data=new FormData(form);
      const subject=`Projektanfrage CreAid-Media: ${String(data.get('service')||'Allgemein').slice(0,80)}`;
      const body=`Name: ${data.get('name')}\nE-Mail: ${data.get('email')}\nUnternehmen: ${data.get('company')||'–'}\nTelefon: ${data.get('phone')||'–'}\nLeistung: ${data.get('service')}\n\nProjektbeschreibung:\n${data.get('message')}`;
      document.querySelector('#aFormMessage').textContent='Ihr E-Mail-Programm wird geöffnet. Bitte die Nachricht dort noch selbst absenden.';
      window.location.href='mailto:info@creaid-media.de?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    });
    form.hidden=false;
  }
})();
