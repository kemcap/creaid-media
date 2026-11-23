(() => { 'use strict';
 const tracks=[...document.querySelectorAll('.sp-track.sp-story')]; if(!tracks.length)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 if(reduced.matches)return;
 const clamp=x=>Math.max(0,Math.min(1,x));
 const ease=(a,b,x)=>{const t=clamp((x-a)/Math.max(.0001,b-a));return t*t*(3-2*t)};
 let pending=false;
 function paint(){pending=false;let easingActive=false;const vh=window.innerHeight;
  tracks.forEach(track=>{
    if(window.matchMedia('(max-height:620px),(max-width:900px) and (max-height:700px),(prefers-reduced-motion:reduce)').matches){track.querySelectorAll('.sp-scene').forEach(n=>n.setAttribute('aria-hidden','false'));return;}
    const rect=track.getBoundingClientRect();if(rect.bottom<0||rect.top>vh)return;
    const travel=Math.max(1,track.offsetHeight-vh),target=clamp(-rect.top/travel);
    const sample=window.CreAidAdaptiveScroll?.progress(track,target) || {value:target,pending:false};
    const raw=sample.value,k=clamp(raw/.9);
    easingActive ||= sample.pending;
    track.style.setProperty('--a-progress', `${Math.round(raw*100)}%`);
    const percentage=track.querySelector('[data-percent]');if(percentage)percentage.textContent=`${String(Math.round(raw*100)).padStart(2,'0')} %`;
    // Scenes: fade previous out before next takes center stage; final composition holds through 90–100%.
    const sceneNodes=[...track.querySelectorAll('.sp-scene')];
    const artNodes=[...track.querySelectorAll('.sp-art-panel')];
    const weights=[1-ease(.30,.42,k),ease(.33,.46,k)*(1-ease(.63,.75,k)),ease(.68,.82,k)];
    sceneNodes.forEach((node,i)=>{const w=weights[i]??0;node.style.opacity=String(w);node.style.transform=`translate3d(${(1-w)*(i===0?-25:25)}px,${(1-w)*25}px,0)`;node.style.pointerEvents=w>.92?'auto':'none';node.setAttribute('aria-hidden',String(w<.3));});
    artNodes.forEach((node,i)=>{const w=weights[i]??0;node.style.opacity=String(w);node.style.transform=`translate3d(${(1-w)*45}px,${(1-w)*18}px,0) scale(${(.95+.05*w).toFixed(3)})`;});
    track.querySelectorAll('[data-sp-card]').forEach((node,i)=>{const w=ease(.03+i*.245,.19+i*.245,k);node.style.opacity=String(.03+.97*w);node.style.transform=`translate3d(${(i%2?-65:65)*(1-w)}px,${(1-w)*22}px,0)`;});
    track.querySelectorAll('[data-sp-process]').forEach((node,i)=>{const w=ease(.04+i*.235,.23+i*.235,k);node.style.opacity=String(.04+.96*w);node.style.transform=`translate3d(0,${(1-w)*35}px,0)`;});
    track.querySelectorAll('[data-sp-faq]').forEach((node,i)=>{const w=ease(.04+i*.27,.27+i*.27,k);node.style.opacity=String(.03+.97*w);node.style.transform=`translate3d(${(i%2?55:-55)*(1-w)}px,${(1-w)*26}px,0)`;});
    track.querySelectorAll('[data-sp-end]').forEach((node,i)=>{const w=ease(.04+i*.26,.24+i*.26,k);node.style.opacity=String(.03+.97*w);node.style.transform=`translate3d(0,${(1-w)*46}px,0)`;});
    track.querySelectorAll('.sp-hub-link,.sp-hub-card').forEach((node,i)=>{const w=ease(.03+(i%6)*.12,.22+(i%6)*.12,k);node.style.opacity=String(.2+.8*w);node.style.transform=`translate3d(0,${(1-w)*25}px,0)`;});
  });
  if(easingActive)request();
 }
 function request(){if(!pending){pending=true;window.requestAnimationFrame(paint);}}
 window.addEventListener('scroll',request,{passive:true});window.addEventListener('resize',request,{passive:true});request();
})();