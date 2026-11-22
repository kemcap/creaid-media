(() => {
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const items=document.querySelectorAll('.l-enter');if(!reduced)document.body.classList.add('l-motion-ready');
if(reduced || !('IntersectionObserver' in window)){items.forEach(el=>el.classList.add('is-visible'));}
else{const ob=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('is-visible');ob.unobserve(entry.target)}}},{threshold:0.09,rootMargin:'0px 0px -5% 0px'});items.forEach(el=>ob.observe(el));}
const save=document.getElementById('lSaveConsent');
const reset=document.getElementById('lResetConsent');
const feedback=document.getElementById('lConsentFeedback');
const key='creaid-prototype-consent-v1';
let transient=null;
function show(){if(!feedback)return;let value=transient;
 try{value=JSON.parse(localStorage.getItem(key))||transient;}catch(e){}
 if(value&&value.necessary){feedback.textContent=(value.temporary?'Temporär ausgewählt (Browser blockiert die Speicherung): ':'Gespeichert: ')+ 'Nur notwendige Einstellungen · '+new Date(value.updated).toLocaleString('de-DE');feedback.dataset.ok='true';return;}
 feedback.textContent='Noch keine Auswahl auf dieser Demo-Seite gespeichert.';feedback.dataset.ok='false';}
if(save){save.addEventListener('click',()=>{const choice={necessary:true,statistics:false,marketing:false,updated:new Date().toISOString()};try{localStorage.setItem(key,JSON.stringify(choice));transient=null;}catch(e){transient={...choice,temporary:true};}show()});}
if(reset){reset.addEventListener('click',()=>{transient=null;try{localStorage.removeItem(key)}catch(e){}show()});}
show();
})();