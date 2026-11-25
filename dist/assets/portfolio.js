(()=>{const root=document.querySelector('.cm-portfolio');if(!root)return;
const cards=[...root.querySelectorAll('.cm-portfolio__item')],filters=root.querySelector('.cm-portfolio__filters'),buttons=[...filters.querySelectorAll('button')],count=root.querySelector('.cm-portfolio__count'),dialog=root.querySelector('dialog');
let current=null,trigger=null;
const visible=()=>cards.filter(c=>!c.hidden);
filters.hidden=false;
for(const b of buttons)b.addEventListener('click',()=>{const category=b.dataset.filter;for(const other of buttons)other.setAttribute('aria-pressed',String(other===b));for(const card of cards)card.hidden=category!=='all'&&card.dataset.category!==category;count.textContent=visible().length+' Arbeitsproben';});
if(typeof dialog.showModal!=='function')return;
const show=card=>{current=card;const link=card.querySelector('a'),img=card.querySelector('img'),large=dialog.querySelector('.cm-portfolio__dialog-image');large.src=link.href;large.alt=img.alt;dialog.querySelector('#portfolio-dialog-title').textContent=card.querySelector('h3').textContent;const v=visible();dialog.querySelector('[data-portfolio-position]').textContent=(v.indexOf(card)+1)+' / '+v.length;dialog.querySelector('[data-portfolio-prev]').disabled=v.length<2;dialog.querySelector('[data-portfolio-next]').disabled=v.length<2;};
const move=step=>{const v=visible();if(v.length&&current)show(v[(v.indexOf(current)+step+v.length)%v.length]);};
for(const card of cards){const a=card.querySelector('a');a.addEventListener('click',e=>{if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();trigger=a;show(card);dialog.showModal();dialog.querySelector('[data-portfolio-close]').focus();});}
dialog.querySelector('[data-portfolio-close]').addEventListener('click',()=>dialog.close());
dialog.querySelector('[data-portfolio-prev]').addEventListener('click',()=>move(-1));
dialog.querySelector('[data-portfolio-next]').addEventListener('click',()=>move(1));
dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}else if(e.key==='ArrowRight'){e.preventDefault();move(1);}});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{if(trigger)trigger.focus();trigger=null;current=null;});
})();