(() => {
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const items=document.querySelectorAll('.l-enter');if(!reduced)document.body.classList.add('l-motion-ready');
if(reduced || !('IntersectionObserver' in window)){items.forEach(el=>el.classList.add('is-visible'));}
else{const ob=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('is-visible');ob.unobserve(entry.target)}}},{threshold:0.09,rootMargin:'0px 0px -5% 0px'});items.forEach(el=>ob.observe(el));}
const reset=document.getElementById('lResetConsent');
const feedback=document.getElementById('lConsentFeedback');
if(reset&&feedback)reset.addEventListener('click',()=>{
  try{localStorage.removeItem('creaid-prototype-consent-v1');feedback.textContent='Alte Demo-Präferenz entfernt. Es wurde keine neue Präferenz gespeichert.';feedback.dataset.ok='true';}
  catch(e){feedback.textContent='Der Browser verhindert den Zugriff auf den lokalen Speicher. Sie können die Website-Daten in den Browsereinstellungen löschen.';feedback.dataset.ok='false';}
});
})();
