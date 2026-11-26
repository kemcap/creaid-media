(() => {
  'use strict';
  const tracks=[...document.querySelectorAll('.a-track:not(.sp-track)')];
  const root=document.documentElement;
  const reduce=window.CreAidMotion?.reduced || matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=n=>Math.min(1,Math.max(0,n));
  const smooth=(a,b,t)=>{let z=clamp((t-a)/(b-a));return z*z*(3-2*z)};
  const lerp=(a,b,t)=>a+(b-a)*t;
  const menu=document.querySelector('#agencyMenu');
  const nav=document.querySelector('#agencyLinks');
  if(menu&&nav){menu.addEventListener('click',()=>{
    const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'SCHLIESSEN ×':'MENÜ ☰';
  });nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='MENÜ ☰'}));}
  let raf=0;
  function draw(){raf=0;if(reduce.matches)return;
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
  if(tracks.length){document.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update,{passive:true});reduce.addEventListener('change',update);update();}
  const pointer=document.querySelector('.a-cursor');
  if(pointer&&!reduce.matches&&matchMedia('(hover:hover) and (pointer:fine)').matches){document.addEventListener('pointermove',e=>{pointer.style.left=`${e.clientX}px`;pointer.style.top=`${e.clientY}px`;pointer.style.opacity='1'},{passive:true});document.addEventListener('pointerleave',()=>pointer.style.opacity='0');}
  document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{const sel=document.querySelector('#aService');if(sel)sel.value=link.getAttribute('data-service');}));
  const form=document.querySelector('#agencyEnquiry');
  if(form){const params=new URLSearchParams(location.search);if(params.get('service')){const sel=form.querySelector('[name="service"]');const requested=params.get('service');const legacy={'Marketing & Branding':'Digitales Marketing'};const option=[...sel.options].find(x=>x.value===(legacy[requested]||requested));if(option)sel.value=option.value;}
    const packageName=params.get('paket');const allowedPackages=["Starter","Wachstum","Dominanz","Praxis-Kompakt","Praxis-Plus","Praxis-Premium","Immo-Kompakt","Immo-Plus","Immo-Premium","Conversion-Kompakt","Conversion-Plus","Conversion-Premium","Ads Basis","Ads Aktiv","Ads Performance","Ads Start","Ads Wachstum","Ads Premium","Kompakt","Plus","Premium","Einmalige Wartung","Jahreswartung","WhatsApp-Button mit Direktverlinkung","Hinweis-Popup","Öffnungszeiten-/Verfügbarkeitsmodul","Google Maps-Einbindung","Google Business Profil-Einrichtung","FAQ-Bereich","Teamseite (allgemein)","Teamseite-Upgrade auf Einzelprofile","Blogbereich","Blog-Erweiterung","Mehrsprachigkeit"];const message=form.querySelector('[name="message"]');if(allowedPackages.includes(packageName)&&message&&!message.value)message.value='Ich interessiere mich für das Paket '+packageName+'.\n\n';
    const direct=location.origin==='https://vorschau.creaid-media.de';
    const submit=form.querySelector('button[type="submit"]');
    const status=document.querySelector('#aFormMessage');
    const fallback=document.querySelector('#aFormFallback');
    const hint=document.querySelector('#aFormHint');
    const intro=document.querySelector('#aFormIntro');
    let pending=false;
    const captcha=form.querySelector('#aTurnstile');
    const sitekey=direct?captcha?.dataset.sitekey:'';
    const slot=form.querySelector('#aSubmitSlot');
    let captchaToken='',widgetId=null,captchaFailed=false,challengeWait=null;
    function showVerified(verified){
      if(!sitekey)return;
      slot.classList.toggle('is-verified',verified);
      captcha.inert=verified;
      submit.disabled=pending||!verified;
    }
    function settleCaptcha(ok){
      if(challengeWait){const finish=challengeWait;challengeWait=null;finish(ok);}
    }
    function failCaptcha(text){
      captchaToken='';captchaFailed=true;showVerified(false);settleCaptcha(false);
      fallback.href=mailto(new FormData(form));fallback.hidden=false;
      status.textContent=text;
    }
    // Render only after the parent form is visible. Give the visitor real feedback.
    form.hidden=false;
    if(sitekey){
      slot.classList.add('is-protected');
      captcha.hidden=false;
      slot.classList.toggle('is-compact',slot.getBoundingClientRect().width<300);
      showVerified(false);
      const script=document.createElement('script');
      script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=creaidTurnstileLoaded';
      script.async=true;
      const loadTimer=setTimeout(()=>failCaptcha('Die Sicherheitsprüfung konnte nicht geladen werden. Bitte versuchen Sie es erneut oder nutzen Sie E-Mail.'),20000);
      window.creaidTurnstileLoaded=()=>{
        clearTimeout(loadTimer);
        try{
          if(widgetId!==null)return;
          const compact=slot.getBoundingClientRect().width<300;
          slot.classList.toggle('is-compact',compact);
          widgetId=window.turnstile.render('#aTurnstile',{sitekey,action:'contact',theme:'dark',language:'de',size:compact?'compact':'flexible',appearance:'always',
            callback:token=>{const wasFailed=captchaFailed;captchaToken=token;captchaFailed=false;showVerified(true);if(wasFailed&&!pending){status.textContent='';fallback.hidden=true;}settleCaptcha(true);},
            'expired-callback':()=>{captchaToken='';showVerified(false);},
            'timeout-callback':()=>failCaptcha('Die Sicherheitsprüfung ist abgelaufen. Bitte erneut versuchen.'),
            'error-callback':code=>{console.warn('Turnstile challenge error:',String(code));failCaptcha('Die Sicherheitsprüfung ist momentan nicht verfügbar. Bitte erneut versuchen oder E-Mail nutzen.');}
          });
        }catch(error){console.warn('Turnstile render failed:',error?.message||'unknown');failCaptcha('Die Sicherheitsprüfung konnte nicht gestartet werden. Bitte laden Sie die Seite neu.');}
      };
      script.onerror=()=>{clearTimeout(loadTimer);failCaptcha('Die Sicherheitsprüfung konnte nicht geladen werden. Bitte prüfen Sie Ihren Browser oder nutzen Sie E-Mail.');};
      document.head.appendChild(script);
    }
    async function awaitCaptcha(){
      if(!sitekey||captchaToken)return true;
      showVerified(false);
      if(captchaFailed&&widgetId!==null){
        captchaFailed=false;
        try{window.turnstile.reset(widgetId);}catch{return false;}
      }
      if(captchaFailed)return false;
      return new Promise(resolve=>{
        const timer=setTimeout(()=>{challengeWait=null;resolve(false);},20000);
        challengeWait=ok=>{clearTimeout(timer);resolve(ok);};
      });
    }
    function mailto(data){
      const subject='Projektanfrage CreAid-Media: '+String(data.get('service')||'Allgemein').slice(0,80);
      const body='Name: '+data.get('name')+'\nE-Mail: '+data.get('email')+'\nUnternehmen: '+(data.get('company')||'–')+'\nTelefon: '+(data.get('phone')||'–')+'\nLeistung: '+data.get('service')+'\n\nProjektbeschreibung:\n'+data.get('message');
      return 'mailto:info@creaid-media.de?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    }
    fallback.addEventListener('click',()=>{fallback.href=mailto(new FormData(form));});
    if(direct){
      submit.textContent='Anfrage senden ↗';
      hint.firstChild.textContent='* Pflichtfelder. Ihre Angaben werden direkt an CreAid-Media übermittelt. ';
      intro.textContent='Ein paar Angaben genügen für den Einstieg. Beschreiben Sie kurz Ihr Vorhaben. Alternativ erreichen Sie uns telefonisch oder per E-Mail.';
    }
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(pending||!form.reportValidity())return;
      const data=new FormData(form);
      if(!direct){
        status.textContent='Ihr E-Mail-Programm wird geöffnet. Bitte die Nachricht dort noch selbst absenden.';
        window.location.href=mailto(data);return;
      }
      pending=true;submit.disabled=true;form.setAttribute('aria-busy','true');
      if(sitekey&&!captchaToken){
        status.textContent='Sicherheitsprüfung läuft … Bitte bestätigen Sie gegebenenfalls das sichtbare Prüfkästchen.';
        if(!await awaitCaptcha()||!captchaToken){
          status.textContent='Die Sicherheitsprüfung konnte nicht abgeschlossen werden. Bitte erneut versuchen oder E-Mail nutzen.';
          fallback.href=mailto(data);fallback.hidden=false;
          pending=false;showVerified(!!captchaToken);form.removeAttribute('aria-busy');
          return;
        }
      }
      fallback.hidden=true;fallback.removeAttribute('href');
      status.textContent='Ihre Anfrage wird übermittelt …';
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),40000);
      try{
        const fields=['name','email','company','phone','service','message','website'];
        const payload=Object.fromEntries(fields.map(key=>[key,String(data.get(key)||'')]));
        if(sitekey)payload.turnstile_token=captchaToken;
        const response=await fetch('/api/contact.php',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,body:JSON.stringify(payload)});
        const result=await response.json();
        if(response.ok&&result.ok===true&&result.status==='accepted'){
          status.textContent='Vielen Dank! Ihre Anfrage wurde erfolgreich übermittelt.';
          form.reset();
        }else if(result.status==='captcha_required'||result.status==='captcha_invalid'){
          status.textContent='Die Sicherheitsprüfung ist abgelaufen oder fehlgeschlagen. Bitte erneut bestätigen.';
        }else if(response.status===422){
          status.textContent='Bitte prüfen Sie Ihre Angaben. Ihre Nachricht wurde nicht versendet.';
        }else if(response.status===429){
          status.textContent='Zu viele Anfragen. Bitte warten Sie einige Minuten oder nutzen Sie die E-Mail-Alternative.';
          fallback.href=mailto(data);fallback.hidden=false;
        }else{
          status.textContent='Der Versand konnte nicht bestätigt werden. Ihre Angaben bleiben erhalten. Alternativ können Sie eine E-Mail vorbereiten.';
          fallback.href=mailto(data);fallback.hidden=false;
        }
      }catch{
        status.textContent='Der Versand konnte nicht bestätigt werden. Bitte nicht sofort erneut senden, um doppelte Nachrichten zu vermeiden. Ihre Angaben bleiben erhalten.';
        fallback.href=mailto(data);fallback.hidden=false;
      }finally{
        clearTimeout(timer);pending=false;
        if(sitekey){captchaToken='';showVerified(false);if(widgetId!==null){try{window.turnstile?.reset(widgetId);}catch{failCaptcha('Die Sicherheitsprüfung konnte nicht neu gestartet werden. Bitte nutzen Sie E-Mail.');}}}else submit.disabled=false;
        form.removeAttribute('aria-busy');
      }
    });
    form.hidden=false;
  }
})();
