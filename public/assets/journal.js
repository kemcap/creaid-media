/* CreAid Journal V6 – progressive enhancement; indexable static HTML remains visible */
(()=>{'use strict';
 const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
 const clamp=n=>Math.max(0,Math.min(1,n));
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const toggle=$('#jToggle'),menu=$('#jNav');
 if(toggle&&menu){toggle.addEventListener('click',()=>{const open=menu.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'SCHLIESSEN ×':'MENÜ ☰';});$$('a',menu).forEach(a=>a.addEventListener('click',()=>{menu.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.textContent='MENÜ ☰';}));}
 // Reading progress on article pages only; the journal index is natural document flow.
 const readbar=$('.j-readbar>i'), article=$('#article-content');
 if(readbar&&article){
  let ticking=false;
  function progress(){ticking=false;const rect=article.getBoundingClientRect();readbar.style.width=(clamp((innerHeight*.25-rect.top)/Math.max(1,rect.height-innerHeight*.65))*100).toFixed(1)+'%';}
  const schedule=()=>{if(!ticking){ticking=true;requestAnimationFrame(progress);}};
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});progress();
 }
 // Index state stays in the URL. All article links remain in the original HTML.
 const cards=$$('#jArticles .j-card[data-cat]'),filters=$$('.j-filter'),search=$('#jSearch'),pagination=$('#jPagination');
 if(cards.length&&search&&pagination){
  const size=6,valid=new Set(filters.map(b=>b.dataset.filter));
  const index=new Map(cards.map(c=>[c,((c.dataset.keywords||'')+' '+c.textContent).toLocaleLowerCase('de')]));
  let filter='alle',term='',page=1;
  function readState(){
   const p=new URLSearchParams(location.search),f=p.get('thema');
   filter=valid.has(f)?f:'alle';search.value=(p.get('q')||'').slice(0,150);term=search.value.trim().toLocaleLowerCase('de');
   const requested=Number(p.get('seite'));page=Number.isSafeInteger(requested)&&requested>0?requested:1;
  }
  function writeState(push){
   const url=new URL(location.href);
   for(const [key,value] of [['thema',filter==='alle'?'':filter],['q',search.value.trim()],['seite',page===1?'':String(page)]]){if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);}
   if(url.href!==location.href)history[push?'pushState':'replaceState'](null,'',url);
  }
  function update(){
   const matching=cards.filter(c=>(filter==='alle'||c.dataset.cat.split(' ').includes(filter))&&(!term||index.get(c).includes(term)));
   const pages=Math.max(1,Math.ceil(matching.length/size));page=Math.min(page,pages);
   const shown=new Set(matching.slice((page-1)*size,page*size));
   cards.forEach(c=>c.hidden=!shown.has(c));
   filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
   const res=$('#jResults');if(res)res.textContent=matching.length===1?'1 Beitrag':matching.length+' Beiträge';
   const range=$('#jRange');if(range)range.textContent=matching.length?((page-1)*size+1)+'–'+Math.min(page*size,matching.length)+' von '+matching.length:'';
   $('#jEmpty')?.classList.toggle('show',!matching.length);
   $('#jPageNumber').textContent='Seite '+page+' von '+pages;
   $('#jPrev').disabled=page===1;$('#jNext').disabled=page===pages;
   pagination.hidden=matching.length<=size;
  }
  function goToResults(){const results=$('#journal-results');results?.focus({preventScroll:true});results?.scrollIntoView({block:'start',behavior:reduce?'instant':'smooth'});}
  filters.forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;page=1;update();writeState(true);}));
  search.addEventListener('input',()=>{term=search.value.trim().toLocaleLowerCase('de');page=1;update();writeState(false);});
  function changePage(delta){page+=delta;update();writeState(true);goToResults();}
  $('#jPrev')?.addEventListener('click',()=>changePage(-1));
  $('#jNext')?.addEventListener('click',()=>changePage(1));
  addEventListener('popstate',()=>{readState();update();});
  readState();update();$('.j-filterbar').hidden=false;
 }
 // Small motion, never hiding content if observers/JS fail.
 if(!document.querySelector('.j-index-editorial')&&'IntersectionObserver' in window&&!reduce){const ob=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting){e.target.classList.remove('is-pending');e.target.classList.add('visible');ob.unobserve(e.target);}}},{threshold:.075,rootMargin:'0px 0px -5% 0px'});$$('.j-reveal').forEach(e=>{e.classList.add('is-pending');ob.observe(e)});}
 else $$('.j-reveal').forEach(e=>e.classList.add('visible'));
 // Active table of contents – independent of filter/hero.
 const tocLinks=$$('.j-toc a[href^="#"],.j-toc-mobile a[href^="#"]');
 const tocTargets=new Set(tocLinks.map(a=>a.getAttribute('href').slice(1)));
 const headings=$$('.j-prose :is(h2,h3)[id]').filter(h=>tocTargets.has(h.id));
 if(headings.length){const onHeading=()=>{let current=headings[0].id;for(const h of headings){if(h.getBoundingClientRect().top<=innerHeight*.33)current=h.id;}tocLinks.forEach(a=>{const active=a.getAttribute('href')==='#'+current;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});};addEventListener('scroll',onHeading,{passive:true});addEventListener('resize',onHeading,{passive:true});onHeading();}
 $('#jShare')?.addEventListener('click',async e=>{const btn=e.currentTarget;const url=location.href.split('#')[0];try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(url);}else{const temp=document.createElement('textarea');temp.value=url;temp.style.position='fixed';temp.style.opacity='0';document.body.appendChild(temp);temp.select();if(!document.execCommand('copy'))throw new Error('copy');temp.remove();}const label=btn.textContent;btn.textContent='Link kopiert ✓';setTimeout(()=>btn.textContent=label,2000);}catch(_){btn.textContent='Link: '+url;}});
 $('#jPrint')?.addEventListener('click',()=>window.print());
})();
