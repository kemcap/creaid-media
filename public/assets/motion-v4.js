/* CREAID V4 – pin & scrub: detail cards accumulate; closing reveals in sequence. */
(()=>{
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const detail=document.querySelector('.service-detail'),closing=document.querySelector('.service-closing');
 if(!detail||!closing)return;
 const dStage=detail.querySelector('.detail-pin'),cStage=closing.querySelector('.closing-pin');
 const clamp=n=>Math.max(0,Math.min(1,n));
 const range=(p,a,b)=>clamp((p-a)/Math.max(.00001,b-a));
 const smooth=t=>t*t*(3-2*t);
 const phase=(p,a,b)=>smooth(range(p,a,b));
 const prefersShort=()=>innerHeight<=610 && innerWidth<=900;
 // Text remains in HTML in its original semantic order; word spans are only visual wrappers.
 function tokenize(element){
  if(!element)return [];
  const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT),nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  const wrappers=[];
  nodes.forEach(node=>{
   const fragment=document.createDocumentFragment();
   (node.textContent.match(/\S+|\s+/g)||[]).forEach(s=>{
    if(/^\s+$/.test(s)){fragment.append(document.createTextNode(s));return;}
    const span=document.createElement('span');span.className='motion-word';span.textContent=s;
    fragment.append(span);wrappers.push(span);
   });
   node.replaceWith(fragment);
  });
  return wrappers;
 }
 const dTitle=tokenize(detail.querySelector('.detail-top h2'));
 const cards=[...detail.querySelectorAll('.detail-card')];
 const cardTitles=cards.map(c=>tokenize(c.querySelector('h3')));
 const cardDesc=cards.map(c=>tokenize(c.querySelector('p')));
 const cTitle=tokenize(closing.querySelector('.service-closing h2'));
 const dKicker=detail.querySelector('.detail-kicker'),dLead=detail.querySelector('.detail-top>p'),dActions=detail.querySelector('.detail-actions');
 const cKicker=closing.querySelector('.micro'),cPara=closing.querySelector('.right p'),cCTA=closing.querySelector('.right .cta'),cFooter=closing.querySelector('.footer');
 const detailCue=document.createElement('div');detailCue.className='chapter-cue';detailCue.textContent='01 / 03 · SCROLLEN';detailCue.setAttribute('aria-hidden','true');dStage.append(detailCue);
 const closingCue=document.createElement('div');closingCue.className='chapter-cue';closingCue.textContent='WEITER SCROLLEN';closingCue.setAttribute('aria-hidden','true');cStage.append(closingCue);
 function textStage(el,o,y){if(!el)return;el.style.opacity=o.toFixed(4);el.style.transform=`translate3d(0,${y.toFixed(1)}px,0)`;}
 function revealWords(words,p,start,end,offset=12){
  const count=words.length||1;
  words.forEach((el,i)=>{
   const pos=i/count,st=start+(end-start)*pos*.68,stop=st+(end-start)*.33;
   const a=phase(p,st,stop);textStage(el,a,(1-a)*offset);
  });
 }
 let smoothingActive=false;
 function scrollProgress(section,stage){
  const outer=section.getBoundingClientRect(),distance=Math.max(1,outer.height-stage.getBoundingClientRect().height);
  const target=clamp(-outer.top/distance);
  const sample=window.CreAidAdaptiveScroll?.progress(section,target) || {value:target,pending:false};
  smoothingActive ||= sample.pending;
  return sample.value;
 }
 function render(){
  smoothingActive=false;
  if(reduced||prefersShort()){
   const all=[dKicker,dLead,dActions,cKicker,cPara,cCTA,cFooter,...cards,...dTitle,...cTitle,...cardTitles.flat(),...cardDesc.flat()];
   all.forEach(el=>{if(el){el.style.opacity='1';el.style.transform='none';}});
   detailCue.style.display='none';closingCue.style.display='none';
   return;
  }
  const dScroll=scrollProgress(detail,dStage),cScroll=scrollProgress(closing,cStage);
  const d=clamp(dScroll/.9),c=clamp(cScroll/.9); // 90% visual completion, 10% hold
  // Detail: headline enters, then three cards accumulate and remain on screen.
  textStage(dKicker,1,0);
  revealWords(dTitle,d,.01,.15,18);
  textStage(dLead,phase(d,.10,.22),(1-phase(d,.10,.22))*15);
  const cardWindows=[[.18,.35],[.39,.57],[.60,.78]];
  cards.forEach((card,i)=>{
   const [start,end]=cardWindows[i],t=phase(d,start,end),direction=i===1?-1:1;
   card.style.opacity=t.toFixed(4);
   card.style.transform=`translate3d(${((1-t)*direction*65).toFixed(1)}px,${((1-t)*31).toFixed(1)}px,0) rotate(${((1-t)*direction*1.8).toFixed(2)}deg) scale(${(.95+.05*t).toFixed(3)})`;
   const label=card.querySelector('.detail-no'); textStage(label,phase(d,start+.025,end-.04),(1-t)*9);
   revealWords(cardTitles[i],d,start+.03,end+.08,10);
   revealWords(cardDesc[i],d,start+.08,end+.12,7);
  });
  const action=phase(d,.79,.88);textStage(dActions,action,(1-action)*17);
  detailCue.textContent=d<.36?'01 / 03 · SCROLLEN':d<.60?'02 / 03 · SCROLLEN':d<.83?'03 / 03 · SCROLLEN':'03 / 03 · ALLE LEISTUNGEN';
  detail.style.setProperty('--detail-drift',((d-.5)*-34).toFixed(0)+'px');
  // Closing: heading → short description → CTA → footer, all stable in final 10%.
  textStage(cKicker,phase(c,.02,.16),(1-phase(c,.02,.16))*12);
  revealWords(cTitle,c,.09,.40,25);
  textStage(cPara,phase(c,.41,.60),(1-phase(c,.41,.60))*25);
  textStage(cCTA,phase(c,.60,.78),(1-phase(c,.60,.78))*29);
  textStage(cFooter,phase(c,.76,.89),(1-phase(c,.76,.89))*14);
  closing.style.setProperty('--closing-drift',((c-.5)*-53).toFixed(0)+'px');
  closingCue.textContent=c>=.89?'BEREIT FÜR IHR PROJEKT':'WEITER SCROLLEN';
  if(smoothingActive)update();
 }
 if(!reduced)document.body.classList.add('motion-ready');
 let pending=false;
 function update(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;render()})}
 addEventListener('scroll',update,{passive:true});addEventListener('resize',update,{passive:true});render();
 if(!reduced&&matchMedia('(hover:hover) and (pointer:fine)').matches){
  [dStage,cStage].forEach(el=>{let tick=false,x=0,y=0;
   el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();x=e.clientX-r.left;y=e.clientY-r.top;if(tick)return;tick=true;requestAnimationFrame(()=>{tick=false;el.style.setProperty('--mx',x+'px');el.style.setProperty('--my',y+'px')})},{passive:true});
  });
 }
})();
