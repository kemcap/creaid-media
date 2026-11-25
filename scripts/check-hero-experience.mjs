import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const load=path=>readFileSync(path,'utf8');
const files=readdirSync('dist').filter(name=>name.endsWith('.html'));
assert.ok(files.length>=50, 'Expected complete HTML preview');
for(const name of files) {
  const html=load('dist/'+name);
  assert.ok(html.includes('href="/assets/hero-balance.css"'),name+' missing hero layout');
  assert.ok(html.includes('src="/assets/adaptive-scroll.js"'),name+' missing adaptive input helper');
}
const index=load('dist/index.html');
assert.equal((index.match(/class="cm-hero-ticker__group"/g)||[]).length,2,'Ticker needs identical seamless sequences');
assert.equal((index.match(/class="cm-hero-ticker__item"/g)||[]).length,8,'Four services duplicated in ticker');
for(const phrase of ['Webdesign &amp; Entwicklung','Digitales Marketing','Branding &amp; Grafikdesign','KI &amp; Automatisierung']) {
  assert.ok(index.includes(phrase),'Ticker missing '+phrase);
}
assert.ok(!index.includes('ANALYSE / KONZEPT / UMSETZUNG</span></div>'),'Old static hero floor still present');
assert.ok(index.includes('class="axes"'),'Original crosshair removed');
assert.ok(index.includes('class="motion-track track-statement-contact"'),'Mask scroll scene must stay intact');
assert.equal((index.match(/id="cm-global-footer"/g)||[]).length,1,'Only one global footer is allowed');
const balance=load('dist/assets/hero-balance.css');
for(const selector of [
  '.hero-stage .hero-content',
  'main > .a-normal:first-of-type > .a-shell.a-l',
  '.page-top .service-hero-inner',
  '.j-hero .j-shell',
  '.l-hero .l-hero-in',
  '.cm-hero-ticker__track',
  '.hero-stage .axes b'
])assert.ok(balance.includes(selector),'Missing layout or interaction style: '+selector);
assert.ok(balance.includes('justify-content:center'),'Desktop centering missing');
assert.ok(balance.includes('position:relative;height:auto;min-height:700px;overflow:visible'),'Short desktop viewports must not clip hero CTAs');
assert.ok(balance.includes('min(10.05vw,13vh)'),'Viewport-height responsive typography missing');
assert.ok(balance.includes('31s linear infinite'),'Ticker must run smoothly');
assert.ok(balance.includes('translate3d(-50%,0,0)'),'Ticker loop incomplete');
assert.ok(balance.includes('@media (prefers-reduced-motion:reduce)'),'Ticker needs reduced-motion fallback');
assert.ok(balance.includes('cm-cross-touch-active'),'Mobile crosshair visual state missing');
const homeJS=load('dist/assets/home-motion-v5.js');
assert.ok(homeJS.includes('adaptive.progress(t,target)'),'Home animations must use adaptive progress');
assert.ok(homeJS.includes('pointerdown')&&homeJS.includes('pointermove')&&homeJS.includes('pointercancel'),'Crosshair needs mouse/touch handling');
assert.ok(homeJS.includes("const timers=[0,233,467,700]"),'Keep existing service card timing');
assert.ok(homeJS.includes('contact.style.clipPath'),'Keep existing statement/contact wipe');
for(const file of ['agency-pages.js','specialty-pages.js','journal.js','motion-v4.js','scrollstory.js']){
  assert.ok(load('dist/assets/'+file).includes('CreAidAdaptiveScroll?.progress'),file+' not using shared input smoothing');
}
const events={};
let clock=0;
const media={matches:false};
const fakeWindow={
  innerHeight:900,
  matchMedia:()=>media,
  addEventListener:(name,handler,options)=>(events[name]??=[]).push({handler,options})
};
runInNewContext(load('dist/assets/adaptive-scroll.js'),{window:fakeWindow,performance:{now:()=>clock}});
const controller=fakeWindow.CreAidAdaptiveScroll;
assert.equal(typeof controller.progress,'function','Adaptive progress API missing');
const node={};
assert.equal(controller.progress(node,0).value,0,'First paint should never animate from zero unnecessarily');
clock=20;
events.wheel[0].handler({deltaMode:1,deltaY:3});
clock=36;
const step=controller.progress(node,1);
assert.ok(step.pending && step.value>0 && step.value<1,'Wheel steps should ease animation progress');
clock=72;
const step2=controller.progress(node,1);
assert.ok(step2.value>step.value && step2.value<1,'Wheel easing must converge smoothly');
clock=700;
assert.equal(controller.progress(node,1).value,1,'Controller must catch up when wheel becomes idle');
clock=800;
events.keydown[0].handler({key:'PageDown'});
assert.equal(controller.progress(node,.15).value,.15,'Keyboard input must not be delayed');
clock=1600;
events.pointerdown[0].handler({pointerType:'touch'});
assert.equal(controller.progress(node,.8).value,.8,'Touch interaction must use native progress');
media.matches=true;
assert.equal(controller.progress(node,.2).value,.2,'Reduced motion must bypass smoothing');
assert.ok(events.wheel[0].options.passive,'Wheel events must not be intercepted');

// Shared compact tracks and interactive service hero coverage.
for(const filename of ['webdesign.html','branding.html','marketing.html','ki-automatisierung.html']){
  const page=load('dist/'+filename);
  for(const part of ['class="page-top"','service-story','service-detail','service-closing','/assets/service-crosshair.js'])
    assert.ok(page.includes(part),filename+' missing '+part);
}
for(const filename of ['leistungen.html','onlineshops-ecommerce.html','google-ads-social-media.html','printdesign-editorial.html','seo-content-marketing.html','ki-workflows-crm.html','webdesign-handwerker.html']){
  const page=load('dist/'+filename);
  assert.ok(page.includes('sp-hero')&&page.includes('/assets/service-crosshair.js'),filename+' missing shared hero crosshair');
  assert.ok(page.includes('sp-track'),filename+' missing specialty chapters');
}
for(const expected of [
  'main > .service-story.web-story {height:235svh}',
  'main > .a-track.sp-story {height:235vh',
  'main > .service-story.web-story {height:265svh}',
  '.sp-hero.cm-crosshair-ready > .a-grid-cross {display:none}'
])assert.ok(balance.includes(expected),'Missing shared motion rule: '+expected);
const crossJS=load('dist/assets/service-crosshair.js');
const pointerHandlers={}, props={}, classes=new Set();
const fakeHero={
 querySelector:()=>null, prepend(el){this.cross=el},
 classList:{add:s=>classes.add(s)},
 getBoundingClientRect:()=>({left:0,top:0,width:1000,height:500}),
 addEventListener:(name,fn,opts)=>pointerHandlers[name]={fn,opts}
};
const crossClasses=new Set();
const fakeCross={setAttribute(k,v){this[k]=v},append(){},
 style:{setProperty:(k,v)=>props[k]=v},
 classList:{add:x=>crossClasses.add(x),remove:x=>crossClasses.delete(x)}};
let nextFrame, touchTimer;
const noMotion={matches:false,addEventListener(){}};
runInNewContext(crossJS,{
 document:{querySelectorAll:()=>[fakeHero],createElement:tag=>tag==='div'?fakeCross:{}},
 window:{matchMedia:q=>q.includes('reduced-motion')?noMotion:{matches:true}},
 requestAnimationFrame:fn=>{nextFrame=fn;return 1},cancelAnimationFrame:()=>{nextFrame=null},
 setTimeout:fn=>{touchTimer=fn;return 1},clearTimeout:()=>{touchTimer=null}
});
assert.ok(classes.has('cm-crosshair-ready')&&fakeCross['aria-hidden']==='true');
assert.ok(pointerHandlers.pointermove.opts.passive,'Do not intercept native scroll');
pointerHandlers.pointermove.fn({pointerType:'mouse',clientX:900,clientY:100});
assert.ok(nextFrame);nextFrame();
assert.ok(parseFloat(props['--cm-cross-x'])>60,'Mouse follow failed');
pointerHandlers.pointerdown.fn({pointerType:'touch',pointerId:1,clientX:250,clientY:125});
assert.equal(props['--cm-cross-x'],'25.000%');
assert.ok(crossClasses.has('cm-cross-touch-active'));
pointerHandlers.pointercancel.fn({pointerType:'touch',pointerId:1});
assert.ok(touchTimer);touchTimer();
assert.ok(!crossClasses.has('cm-cross-touch-active'),'Touch effect did not fade');
console.log('PASS: '+files.length+' pages, responsive hero rules, looping service ticker, accessible crosshair, adaptive motion behavior.');

// Phase 1 regression checks: common viewport system and natural scroll flow.
const ux=load('dist/assets/ux-phase1.css'), uxJS=load('dist/assets/ux-phase1.js');
for(const name of files){
  const html=load('dist/'+name);
  assert.ok(html.includes('/assets/ux-phase1.css')&&html.includes('/assets/ux-phase1.js'),name+' missing global UX assets');
}
for(const rule of ['--cm-nav-height','100dvh - var(--cm-nav-height)','body > .topline','main > .a-track:not(.sp-story)','main > .service-detail','main > .j-feature-track','main > .track-capabilities','main > .track-work','@media(max-height:620px)','cm-has-closing-cta','.cm-flow-enter','.j-article-hero'])assert.ok(ux.includes(rule),'Missing Phase 1 rule '+rule);
assert.ok(uxJS.includes('ResizeObserver')&&uxJS.includes('IntersectionObserver'),'Header measurement and time-based reveals missing');
assert.ok(homeJS.includes('(max-height:620px)'),'Homepage short viewport mask fallback missing');
assert.ok(load('dist/assets/specialty-pages.js').includes("querySelectorAll('.sp-track.sp-story')"),'Static specialty cards should not be scroll-scrubbed');
console.log('PASS: Phase 1 shared viewport, natural flow, accessible low-height fallbacks, compact footer on all '+files.length+' pages.');

// Phase 2: explicit contact entry and all service topics, across the site.
const contact=load('dist/kontakt.html');
const topics=['Webdesign &amp; Entwicklung','Digitales Marketing','Branding &amp; Grafikdesign','KI &amp; Automatisierung','Onlineshop &amp; E-Commerce','Google Ads &amp; Social Media','SEO &amp; Content-Marketing','Printdesign &amp; Editorial','KI-Workflows &amp; CRM','Webdesign für Handwerker'];
for(const topic of topics)assert.ok(contact.includes('value="'+topic+'"'),'Missing inquiry topic '+topic);
for(const name of ['webdesign','marketing','branding','ki-automatisierung','onlineshops-ecommerce','google-ads-social-media','seo-content-marketing','printdesign-editorial','ki-workflows-crm','webdesign-handwerker']){
  const page=load('dist/'+name+'.html');assert.ok(page.includes('/kontakt?service='),'No service-specific inquiry on '+name);assert.ok(!page.includes('ANIMATION ENTDECKEN <span>'),'Animation still primary on '+name);assert.ok(!page.includes('%26amp;'),'Malformed mailto encoding on '+name);
}
assert.ok(load('dist/index.html').includes('href="/kontakt#anfrage">Projekt besprechen'));
assert.ok(load('dist/referenzen.html').includes('id="arbeitsproben"'));
assert.ok(contact.includes('name="company"')&&contact.includes('name="phone"'));
for(const name of files){const page=load('dist/'+name);assert.ok(page.includes('cm-header__specialties'),name+' missing specialty navigation');assert.ok(!page.includes('Profiladresse noch nicht hinterlegt'),name+' unlinked social placeholder');}
console.log('PASS: Phase 2 CTA hierarchy, 10 service topics, grouped navigation and portfolio provenance.');

 // Phase 3: content depth, complete journal, stable URL mapping and valid metadata.
const pageMeta=JSON.parse(load('src/_data/pages.json'));
const postIndex=JSON.parse(load('src/_data/postsIndex.json'));
const routeMap=JSON.parse(load('src/_data/routes.json'));
const serviceDepth=JSON.parse(load('src/_data/serviceDepth.json'));
const previewDrafts=JSON.parse(load('src/_data/wordpressPreviewDrafts.json'));
const previewArticles=JSON.parse(load('src/_data/wordpressPreviewArticles.json'));
const importCount=Object.keys(previewDrafts).length+Object.keys(previewArticles).length;
assert.equal(Object.keys(pageMeta).length,99+importCount);
assert.equal(postIndex.length,39+importCount);
assert.equal(Object.values(pageMeta).filter(p=>p.isPost).length,39+importCount);
assert.equal(new Set(postIndex.map(p=>p.slug)).size,39+importCount);
const journal=load('dist/blog.html');
assert.equal((journal.match(/class="j-card j-reveal"/g)||[]).length,39+importCount);
assert.ok(journal.includes('href="/ki-automatisierung-fuer-unternehmen"'));
assert.equal(Object.keys(serviceDepth).length,12);
for(const [key,info] of Object.entries(serviceDepth)){
  const html=load('dist/'+key+'.html');
  assert.ok(html.includes('id="projektumfang"'),key+' missing concrete scope');
  assert.ok(html.includes('class="cm-depth-grid"')&&info.groups.length===3);
  assert.equal(JSON.parse(pageMeta[key].structuredData)['@type'],'Service');
}
const titles=new Set(),desc=new Set(),canonicals=new Set();
for(const [key,p] of Object.entries(pageMeta)){
  assert.ok(p.title&&p.description&&p.canonical);
  assert.ok(!titles.has(p.title)&&!desc.has(p.description)&&!canonicals.has(p.canonical),'Duplicate metadata '+key);
  titles.add(p.title);desc.add(p.description);canonicals.add(p.canonical);
  assert.equal(p.canonical,'https://creaid-media.de'+routeMap[key],'Production URL changed: '+key);
  assert.equal(p.robots,'noindex,nofollow,noarchive','Preview must remain noindex');
  const html=load('dist/'+key+'.html');
  assert.ok(html.includes('/assets/content-phase3.css'));
  if(p.structuredData){const schema=JSON.parse(p.structuredData);assert.ok(schema['@context']==='https://schema.org');}
  if(p.isPost){
    assert.ok(postIndex.some(x=>x.slug===key));
    if(Object.hasOwn(previewDrafts,key)){
      assert.ok(html.includes('WORDPRESS-ENTWURF')&&html.includes('<h2'));
      assert.equal(p.structuredData,undefined);
    }else assert.equal(JSON.parse(p.structuredData)['@type'],'BlogPosting');
  }
}
console.log('PASS: Phase 3 content scope on 12 services, all journal cards, unique metadata and stable URLs.');

 // Phase 4: keep legal status honest, avoid automatic third-party resources/storage.
const privacy=load('dist/datenschutz.html'), imprint=load('dist/impressum.html'), cookies=load('dist/cookie-einstellungen.html'), legalJs=load('dist/assets/legal-pages.js');
assert.ok(!privacy.includes('{placeholder('),'Unrendered legal placeholders');
assert.ok(privacy.includes('GitHub Pages')&&privacy.includes('GitHub-Datenschutzerklärung'));
assert.ok(privacy.includes('keine neue Cookie-Präferenz')&&privacy.includes('direkte HubSpot-Übermittlung ist nicht eingerichtet'));
assert.ok(imprint.includes('ENTWURF')&&imprint.includes('amtliche Geschäftsanschrift'));
assert.ok(!cookies.includes('id="lSaveConsent"')&&!legalJs.includes('localStorage.setItem'));
assert.ok(legalJs.includes("localStorage.removeItem('creaid-prototype-consent-v1')"));
for(const name of files){
 const html=load('dist/'+name);
 assert.ok(html.includes('href="/assets/qa-phase4.css"'));
 for(const match of html.matchAll(/<(?:script|img|iframe|video|audio|source)\b[^>]*\bsrc=["']([^"']+)["']/gi)){
  assert.ok(!/^(?:https?:)?\/\//i.test(match[1]),'Unexpected external resource '+name+': '+match[1]);
 }
 for(const match of html.matchAll(/<link\b[^>]*>/gi)){
  if(/\brel=["'](?:stylesheet|preload|preconnect|prefetch|dns-prefetch)["']/i.test(match[0]))assert.ok(!/\bhref=["'](?:https?:)?\/\//i.test(match[0]),'Unexpected external link resource '+name);
 }
}
console.log('PASS: Phase 4 legal draft integrity, no automatic external HTML resources and no new preference storage.');

// Phase 5: original sitemap coverage, no accidental URL loss.
const legacyCoverage=JSON.parse(load('src/_data/legacySitemapCoverage.json'));
const aliasMap=JSON.parse(load('src/_data/aliases.json'));
assert.equal(legacyCoverage.length,87);
assert.equal(new Set(legacyCoverage.map(row=>row.url)).size,87);
for(const row of legacyCoverage){assert.ok(Object.values(routeMap).includes(row.target),'Missing target '+row.url);assert.ok(row.url===row.target||aliasMap[row.url]===row.target,'Missing legacy alias '+row.url);}
for(const name of ['webdesign-aerzte','webdesign-immobilienmakler']){const html=load('dist/'+name+'.html');assert.ok(html.includes('sp-hero')&&html.includes('sp-story')&&html.includes('id="projektumfang"')&&html.includes('/assets/service-crosshair.js'));assert.ok(html.includes('/kontakt?service='));assert.ok(contact.includes('value="'+serviceDepth[name].topic+'"'));}
for(const row of legacyCoverage.filter(x=>x.url.startsWith('/category/'))){const key=Object.keys(routeMap).find(k=>routeMap[k]===row.url);assert.ok(load('dist/'+key+'.html').includes('class="j-card"'));}
console.log('PASS: 87 original sitemap URLs mapped, 99 content pages, 20 archives and 2 restored industry landing pages.');

// Phase 6: full page-specific semantic outline, rendered in HTML before JS.
const headingPlan=JSON.parse(load('src/_data/headingPlan.json'));
assert.equal(Object.keys(headingPlan).length,99);
const decode=t=>t.replace(/(?:&#8288;|\u2060)?<span class="cm-heading-dot" aria-hidden="true">(\.?)<\/span>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const uniqueH1=new Set();
for(const [key,plan] of Object.entries(headingPlan)){
 const html=load('dist/'+key+'.html'),main=html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0];
 assert.ok(main,key+' missing main');
 const hs=[...main.matchAll(/<h([123])\b[^>]*>([\s\S]*?)<\/h\1>/g)];
 assert.equal((html.match(/<h1\b/g)||[]).length,1,key+' must have exactly one H1');
 assert.equal(decode(hs[0][2]),plan.h1,key+' H1 mismatch');
 assert.ok(!uniqueH1.has(plan.h1),'Duplicate H1 '+plan.h1);uniqueH1.add(plan.h1);
 let previous=1;
 for(const h of hs){
  const level=Number(h[1]);assert.ok(level<=previous+1,key+' heading hierarchy jumps: '+decode(h[2]));previous=level;
 }
 assert.ok(html.includes('/assets/heading-semantics.css'),key+' missing semantic stylesheet');
 if(plan.mode==='creative')assert.ok(main.includes('cm-claim-h1')&&main.includes('cm-semantic-h1'),key+' claim not retained');
 if(plan.mode==='archive')assert.ok(main.includes('Beiträge zu '),key+' missing archive section heading');
}
assert.ok(load('dist/index.html').includes('ERSTE HILFE')&&load('dist/index.html').includes('hero-heading'));
assert.ok(load('dist/assets/home-motion-v5.js').includes('.cap-intro .cm-claim-h2'));
assert.ok(load('dist/assets/motion-v4.js').includes('.detail-top .cm-claim-h2'));
console.log('PASS: all 99 pages have unique, visible H1 headings and no H1–H3 level jumps; creative claims and animation hooks preserved.');


// Phase 6 layout regression: explicit placements preserve the original heading
// column when the visible semantic heading adds an extra direct grid child.
const headingLayoutCss=load('dist/assets/heading-semantics.css');
assert.equal(headingLayoutCss,load('public/assets/heading-semantics.css'),'Heading layout source and generated CSS differ');
for(const rule of [
 'main .method-heading>.cm-semantic-h2{grid-column:1;grid-row:1',
 'main .method-heading>.cm-claim-h2{grid-column:1;grid-row:2',
 'main .method-heading:has(>.cm-claim-h2)>p{grid-column:2;grid-row:2',
 'main .detail-top>.cm-semantic-h2{grid-column:2;grid-row:1',
 'main .detail-top>.cm-claim-h2{grid-column:2;grid-row:2',
 'main .detail-top:has(>.cm-claim-h2)>p{grid-column:3;grid-row:2',
 '@media (min-width:531px)',
 '@media (min-width:1081px)'
])assert.ok(headingLayoutCss.includes(rule),'Missing responsive heading placement: '+rule);
console.log('PASS: explicit responsive semantic heading grid placements retained.');

assert.ok(!balance.includes('main > .service-detail {height:'),'Flow detail must not have a competing scroll height');
assert.ok(!balance.includes('main > .a-track {height:'),'Only real story tracks may have a pinned scroll height');
assert.ok(fakeWindow.CreAidMotion?.staticStory && fakeWindow.CreAidMotion?.reduced,'Shared motion preferences missing');
assert.ok(load('dist/assets/fonts.css').includes('--cm-brand-berry:#b3284f'));
console.log('PASS: shared motion preferences, single scroll-height ownership, brand tokens.');

// Guard against accidental querySelector in collection-based Journal code.
const journalScript=load('dist/assets/journal.js');
assert.ok(journalScript.includes("const tocLinks=$$('.j-toc"),'TOC links must be a collection, even when empty');
assert.ok(journalScript.includes("const headings=$$('.j-prose"),'TOC headings must be a collection');
assert.equal(journalScript,load('public/assets/journal.js'),'Journal source/dist mismatch');
