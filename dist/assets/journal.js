/* CreAid Journal V6 – progressive enhancement; indexable static HTML remains visible */
(()=>{'use strict';
 const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
 const clamp=n=>Math.max(0,Math.min(1,n));
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const toggle=$('#jToggle'),menu=$('#jNav');
 if(toggle&&menu){toggle.addEventListener('click',()=>{const open=menu.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'SCHLIESSEN ×':'MENÜ ☰';});$$('a',menu).forEach(a=>a.addEventListener('click',()=>{menu.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.textContent='MENÜ ☰';}));}
 // Scroll-scrubbed featured story with final 90–100% hold.
 const feature=$('.j-feature-track'),fc=$('.j-feature-copy'),fm=$('.j-feature-media'),fi=$('.j-feature-media img'),hero=$('.j-hero-title'),heroArt=$('.j-hero-art');
 const readbar=$('.j-readbar>i'), article=$('#article-content');
 let ticking=false;
 function progress(){ticking=false;let easingActive=false;
  if(feature&&fc&&fm&&!reduce){const top=feature.getBoundingClientRect().top;const distance=Math.max(1,feature.offsetHeight-innerHeight);const target=clamp(-top/distance);
   const sample=window.CreAidAdaptiveScroll?.progress(feature,target) || {value:target,pending:false};
   const raw=sample.value,p=clamp(raw/.9);
   easingActive ||= sample.pending;
   const intro=clamp((p-.04)/.4),image=clamp((p-.12)/.42);
   fc.style.transform=`translate3d(0,${(1-intro)*42}px,0)`;fc.style.opacity=String(.30+intro*.70);
   fm.style.transform=`translate3d(${(1-image)*55}px,${(1-image)*36}px,0) scale(${.90+.1*image})`;fm.style.opacity=String(.22+.78*image);
   if(fi)fi.style.transform=`scale(${1.13-.08*p})`;
   const meter=$('[data-feature-progress]');if(meter)meter.textContent=String(Math.round(raw*100)).padStart(2,'0')+' %';
  }
  if(hero&&!reduce){const rect=hero.getBoundingClientRect(),p=clamp((110-rect.top)/Math.max(innerHeight,1));hero.style.transform=`translate3d(0,${-p*46}px,0)`;if(heroArt)heroArt.style.transform=`translate3d(0,${-p*60}px,0) rotate(${7+p*5}deg)`;}
  if(readbar&&article){const start=article.getBoundingClientRect().top;const end=article.getBoundingClientRect().bottom;const total=Math.max(1,end-start-innerHeight*.65);readbar.style.width=(clamp((innerHeight*.25-start)/total)*100).toFixed(1)+'%';}
  if(easingActive)schedule();
 }
 function schedule(){if(!ticking){ticking=true;requestAnimationFrame(progress);}}
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});progress();
 // Cards are already in the document. Filters only change their presentation.
 const cards=$$('.j-card[data-cat]'),filters=$$('.j-filter'),search=$('#jSearch'),pagination=$('#jPagination');
 const requested=new URLSearchParams(location.search).get('thema');
 let filter=filters.some(button=>button.dataset.filter===requested)?requested:'alle',term='',page=1;const pageSize=6;filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
 function update(){if(!cards.length)return;
  const matching=cards.filter(c=>(filter==='alle'||c.dataset.cat?.split(' ').includes(filter))&&(!term||((c.dataset.keywords||'')+' '+c.textContent).toLocaleLowerCase('de').includes(term)));
  const pages=Math.max(1,Math.ceil(matching.length/pageSize));page=Math.min(page,pages);
  cards.forEach(c=>{c.hidden=!matching.includes(c)||Math.floor(matching.indexOf(c)/pageSize)!==page-1;});
  const res=$('#jResults');if(res)res.textContent=matching.length===1?'1 Beitrag':matching.length+' Beiträge';
  const empty=$('#jEmpty');if(empty)empty.classList.toggle('show',!matching.length);
  const number=$('#jPageNumber'),prev=$('#jPrev'),next=$('#jNext');
  if(number)number.textContent=page+' / '+pages;
  if(prev)prev.disabled=page===1;
  if(next)next.disabled=page===pages;
  if(pagination)pagination.hidden=matching.length<=pageSize;
 }
 filters.forEach(f=>f.addEventListener('click',()=>{filter=f.dataset.filter;page=1;filters.forEach(b=>b.setAttribute('aria-pressed',String(b===f)));update();}));
 if(search)search.addEventListener('input',()=>{term=search.value.trim().toLocaleLowerCase('de');page=1;update();});
 $('#jPrev')?.addEventListener('click',()=>{page--;update();$('#artikel')?.scrollIntoView({behavior:reduce?'instant':'smooth'});});
 $('#jNext')?.addEventListener('click',()=>{page++;update();$('#artikel')?.scrollIntoView({behavior:reduce?'instant':'smooth'});});
 update();
 // Small motion, never hiding content if observers/JS fail.
 if('IntersectionObserver' in window&&!reduce){const ob=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting){e.target.classList.remove('is-pending');e.target.classList.add('visible');ob.unobserve(e.target);}}},{threshold:.075,rootMargin:'0px 0px -5% 0px'});$$('.j-reveal').forEach(e=>{e.classList.add('is-pending');ob.observe(e)});}
 else $$('.j-reveal').forEach(e=>e.classList.add('visible'));
 // Active table of contents – independent of filter/hero.
 const headings=$$('.j-prose h2[id]'),tocLinks=$$('.j-toc a[href^="#"],.j-toc-mobile a[href^="#"]');
 if(headings.length){const onHeading=()=>{let current=headings[0].id;for(const h of headings){if(h.getBoundingClientRect().top<=innerHeight*.33)current=h.id;}tocLinks.forEach(a=>{const active=a.getAttribute('href')==='#'+current;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});};addEventListener('scroll',onHeading,{passive:true});onHeading();}
 $('#jShare')?.addEventListener('click',async e=>{const btn=e.currentTarget;const url=location.href.split('#')[0];try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(url);}else{const temp=document.createElement('textarea');temp.value=url;temp.style.position='fixed';temp.style.opacity='0';document.body.appendChild(temp);temp.select();if(!document.execCommand('copy'))throw new Error('copy');temp.remove();}const label=btn.textContent;btn.textContent='Link kopiert ✓';setTimeout(()=>btn.textContent=label,2000);}catch(_){btn.textContent='Link: '+url;}});
 $('#jPrint')?.addEventListener('click',()=>window.print());
})();
