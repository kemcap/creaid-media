/* CreAid V3 – optional native scroll-driven motion. No paid templates, no network. */
(()=>{
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const detail=document.querySelector('.service-detail'),closing=document.querySelector('.service-closing');
 if(!detail||!closing)return;
 const clamp=n=>Math.min(1,Math.max(0,n));
 const range=(p,a,b)=>clamp((p-a)/(b-a));
 const ease=x=>x*x*(3-2*x);
 function words(element){
  if(!element)return [];
  const nodes=[];
  const tw=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
  while(tw.nextNode())nodes.push(tw.currentNode);
  const wrappers=[];
  nodes.forEach(node=>{
   const parts=node.nodeValue.match(/\S+|\s+/g)||[];
   const frag=document.createDocumentFragment();
   parts.forEach(part=>{
    if(/^\s+$/.test(part)){frag.appendChild(document.createTextNode(part));return;}
    const span=document.createElement('span');span.className='motion-word';span.textContent=part;
    frag.appendChild(span);wrappers.push(span);
   });node.replaceWith(frag);
  });
  return wrappers;
 }
 const detailWords=words(detail.querySelector('.detail-top h2'));
 const closeWords=words(closing.querySelector('.service-closing h2'));
 const cards=[...detail.querySelectorAll('.detail-card')];
 const cardWords=cards.map(card=>words(card.querySelector('p')));
 const detailKicker=detail.querySelector('.detail-kicker');
 const detailLead=detail.querySelector('.detail-top>p');
 const detailActions=detail.querySelector('.detail-actions');
 const closeKicker=closing.querySelector('.micro');
 const closeRight=closing.querySelector('.right');
 const closeFooter=closing.querySelector('.footer');
 const allWords=[...detailWords,...closeWords,...cardWords.flat()];
 function alphaTranslate(el,opacity,y,scale=1){
  if(!el)return;
  el.style.opacity=opacity.toFixed(3);
  el.style.transform=`translate3d(0,${y.toFixed(1)}px,0) scale(${scale.toFixed(3)})`;
 }
 function revealWords(items,p,start,end,offset=14){
  const max=Math.max(1,items.length);
  items.forEach((el,i)=>{
   const t=ease(range(p,start+i/max*(end-start)*.65,start+i/max*(end-start)*.65+(end-start)*.35));
   alphaTranslate(el,t,(1-t)*offset);
  });
 }
 function position(section){
  const r=section.getBoundingClientRect();
  return clamp((innerHeight-r.top)/(innerHeight+Math.min(r.height,innerHeight)*.30));
 }
 function draw(){
  const a=position(detail),b=position(closing);
  revealWords(detailWords,a,.11,.49,24);
  alphaTranslate(detailKicker,ease(range(a,.06,.22)),(1-ease(range(a,.06,.22)))*15);
  alphaTranslate(detailLead,ease(range(a,.28,.49)),(1-ease(range(a,.28,.49)))*15);
  cards.forEach((card,i)=>{
   const t=ease(range(a,.25+i*.11,.54+i*.11));
   const direction=i%2===0?1:-1;
   card.style.opacity=t.toFixed(3);
   card.style.transform=`translate3d(${(1-t)*direction*64}px,${(1-t)*58}px,0) rotate(${(1-t)*direction*2}deg)`;
   const words=cardWords[i];const no=card.querySelector('.detail-no'),title=card.querySelector('h3');
   alphaTranslate(no,ease(range(a,.26+i*.11,.39+i*.11)),10*(1-t));
   alphaTranslate(title,ease(range(a,.34+i*.11,.49+i*.11)),15*(1-t));
   revealWords(words,a,.41+i*.10,.67+i*.09,7);
  });
  alphaTranslate(detailActions,ease(range(a,.60,.79)),(1-ease(range(a,.60,.79)))*20);
  detail.style.setProperty('--detail-drift',((a-.5)*-65).toFixed(0)+'px');
  revealWords(closeWords,b,.11,.57,27);
  alphaTranslate(closeKicker,ease(range(b,.07,.23)),(1-ease(range(b,.07,.23)))*12);
  alphaTranslate(closeRight,ease(range(b,.42,.72)),(1-ease(range(b,.42,.72)))*46);
  alphaTranslate(closeFooter,ease(range(b,.53,.82)),(1-ease(range(b,.53,.82)))*18);
  closing.style.setProperty('--closing-drift',((b-.5)*-85).toFixed(0)+'px');
 }
 if(!reduced){
  document.body.classList.add('motion-ready');
  let ticking=false;
  const update=()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;draw()})};
  addEventListener('scroll',update,{passive:true});addEventListener('resize',update,{passive:true});draw();
 }
 // Desktop-only, restrained fuchsia light follows cursor. Native cursor stays visible.
 if(!reduced && matchMedia('(hover:hover) and (pointer:fine)').matches){
  document.querySelectorAll('.page-top,.service-story .web-pin,.service-detail,.service-closing').forEach(el=>{
   let scheduled=false,x=0,y=0;
   el.addEventListener('pointermove',ev=>{
    const r=el.getBoundingClientRect();x=ev.clientX-r.left;y=ev.clientY-r.top;
    if(scheduled)return; scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;el.style.setProperty('--mx',x+'px');el.style.setProperty('--my',y+'px')});
   },{passive:true});
  });
 }
})();
