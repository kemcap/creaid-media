/* CreAid-Media Tracking Engine V1.0 — basic consent mode; no optional network before grant. */
(() => {
  'use strict';
  const KEY = 'creaid-consent-v1', VERSION = 1, TTL = 180 * 86400000;
  const GTM = 'GTM-KZDHN3XK', GA = 'G-Q508SZ02YF';
  const live = /^(www\.)?creaid-media\.de$/.test(location.hostname) && location.protocol === 'https:';
  const denied = {analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};
  const layer = window.dataLayer = window.dataLayer || [];
  function gtag(){layer.push(arguments);}
  gtag('consent','default',{...denied});
  function read(){
    try {
      const v=JSON.parse(localStorage.getItem(KEY));
      return v && v.version===VERSION && typeof v.analytics==='boolean' && Number.isFinite(v.time) && v.time<=Date.now() && Date.now()-v.time<TTL ? v : null;
    } catch { return null; }
  }
  let choice=read(), started=false, root, returnFocus, expiryTimer;
  function grant(){
    if(!live || started || !choice?.analytics) return;
    started=true;
    window['ga-disable-'+GA]=false;
    gtag('consent','update',{...denied,analytics_storage:'granted'});
    layer.push({'gtm.start':Date.now(),event:'gtm.js'});
    layer.push({event:'creaid_analytics_granted'});
    const script=document.createElement('script');
    script.async=true; script.src='https://www.googletagmanager.com/gtm.js?id='+GTM;
    script.id='creaid-gtm'; document.head.appendChild(script);
  }
  function clearAnalyticsCookies(){
    const domains=['',location.hostname,'creaid-media.de','.creaid-media.de'];
    for(const part of document.cookie.split(';')){
      const name=part.split('=')[0].trim();
      if(!/^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name)) continue;
      for(const domain of domains) document.cookie=name+'=; Max-Age=0; path=/; Secure; SameSite=Lax'+(domain?'; domain='+domain:'');
    }
  }
  function stop(){
    if(!live) return;
    window['ga-disable-'+GA]=true;
    if(started) gtag('consent','update',{...denied});
    clearAnalyticsCookies();
  }
  function schedule(){
    clearTimeout(expiryTimer);
    if(!choice) return;
    expiryTimer=setTimeout(check,Math.min(2147483647,Math.max(1,choice.time+TTL-Date.now())));
  }
  function check(){
    if(choice && Date.now()-choice.time>=TTL){
      choice=null; stop(); if(started){location.reload();return;} if(root) view(false);
    } else schedule();
  }
  function view(details,focus=true){
    if(!root) return;
    const $=id=>root.getElementById(id);
    $('panel').hidden=false; $('first').hidden=details; $('settings').hidden=!details;
    $('stats').checked=!!choice?.analytics;
    $('panel').setAttribute('aria-labelledby',details?'settingsHeading':'heading');
    $('feedback').textContent='';
    if(focus) $(details?'settingsHeading':'heading').focus({preventScroll:true});
  }
  function updateStatus(){
    document.querySelectorAll('[data-creaid-consent-status]').forEach(el=>{el.textContent=(live?'':'Vorschau · ')+(choice?(choice.analytics?'Statistik erlaubt':'Nur notwendige Einstellungen'):'Noch keine Auswahl');});
  }
  function save(analytics){
    const wasStarted=started;
    choice={version:VERSION,time:Date.now(),analytics};
    let persisted=false;
    try{localStorage.setItem(KEY,JSON.stringify(choice));persisted=true;}catch{try{localStorage.removeItem(KEY);}catch{}}
    if(analytics) grant(); else stop();
    schedule(); updateStatus();
    if(!analytics && wasStarted && persisted){location.reload();return;}
    if(root){
      if(!persisted){root.getElementById('feedback').textContent='Die Auswahl konnte nicht dauerhaft gespeichert werden. Sie gilt nur für diese Seite.';return;}
      root.getElementById('panel').hidden=true;
      if(returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
      returnFocus=null;
    }
  }
  function openSettings(){returnFocus=document.activeElement;view(true);}
  window.CreAidTracking=Object.freeze({
    openSettings,
    getConsent:()=>({analytics:!!choice?.analytics,decided:!!choice,live}),
    trackLead:()=>{if(live && started && choice?.analytics && Date.now()-choice.time<TTL)layer.push({event:'creaid_lead_submitted'});}
  });
  if(choice?.analytics) grant(); else if(live) stop();
  schedule();
  window.addEventListener('storage',e=>{
    if(e.key!==KEY && e.key!==null)return;
    choice=read(); updateStatus(); schedule();
    if(!choice?.analytics){stop();if(started){location.reload();return;}if(!choice&&root)view(false);}
    else grant();
    if(root && choice)root.getElementById('panel').hidden=true;
  });
  window.addEventListener('pageshow',()=>{const current=read();if(choice?.analytics&&!current?.analytics){choice=current;stop();if(started){location.reload();return;}}check();});
  function mount(){
    const host=document.createElement('div');host.id='creaid-consent-host';document.body.appendChild(host);
    root=host.attachShadow({mode:'open'});
    const style=document.createElement('style');style.textContent=CSS;
    root.appendChild(style);
    const wrap=document.createElement('div');wrap.innerHTML=UI;root.appendChild(wrap);
    root.getElementById('preview').hidden=live;
    if(!live) root.querySelector('.intro').textContent='In dieser Vorschau können Sie die spätere Statistik-Einwilligung ausprobieren. Es werden keine Google-Dienste geladen. Sie entscheiden selbst.';
    root.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>save(b.dataset.choice==='all'||(b.dataset.choice==='save'&&root.getElementById('stats').checked))));
    root.getElementById('custom').addEventListener('click',()=>view(true));
    root.getElementById('back').addEventListener('click',()=>view(false));
    root.addEventListener('keydown',e=>{if(e.key==='Escape'&&choice){root.getElementById('panel').hidden=true;returnFocus?.focus({preventScroll:true});returnFocus=null;}});
    document.querySelectorAll('[data-creaid-consent-open]').forEach(el=>el.addEventListener('click',openSettings));
    updateStatus();
    if(!choice && !/^\/(?:datenschutz|impressum|cookie-einstellungen)(?:\.html|\/)?$/.test(location.pathname))view(false,false);
  }
  const CSS="\n:host{--pink:#FA225B;--ink:#1a1a1b;--line:#dcd9da;--muted:#5e5b60}*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:#151516;color:#fff}button,a,input,summary{-webkit-tap-highlight-color:transparent}button,input,summary{cursor:pointer}button{font:inherit}a{color:inherit}button:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #FA225B;outline-offset:4px}button:disabled{cursor:default} [hidden]{display:none!important}.demo{background:#29292b;padding:10px clamp(16px,4vw,64px);display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;color:#dedcdf}.demo button{border:1px solid #777;background:none;color:white;padding:8px 12px;border-radius:4px}.siteheader{display:flex;justify-content:space-between;align-items:center;padding:28px clamp(20px,6vw,90px);border-bottom:1px solid #ffffff17;gap:20px}.siteheader img{width:230px;max-width:55vw}.nav{display:flex;gap:28px;font-size:13px;color:#c1bfc1}.hero{position:relative;overflow:hidden;min-height:510px;padding:86px clamp(24px,7vw,100px) 110px;background:radial-gradient(ellipse at 95% 55%,#420915 0,transparent 60%),#1a1a1b}.hero:after{content:\"\";position:absolute;width:44vw;height:44vw;right:-14vw;top:0;border:1px solid #fa225b44;transform:rotate(-25deg);border-radius:23%;box-shadow:0 0 0 44px #fa225b0c,0 0 0 88px #fa225b08;pointer-events:none}.eyebrow{font-size:11px;font-weight:750;letter-spacing:.18em;text-transform:uppercase;color:var(--pink)}h1{font-size:clamp(43px,7vw,100px);line-height:.99;letter-spacing:-.065em;margin:24px 0;max-width:800px;position:relative;z-index:1}h1 em{color:var(--pink);font-style:normal}.hero p{font-size:18px;line-height:1.6;color:#bdb9bc;max-width:490px}.tag{display:inline-block;border-bottom:1px solid var(--pink);padding:12px 0;font-weight:bold;font-size:14px}.below{padding:34px clamp(24px,7vw,100px);display:flex;gap:50px;flex-wrap:wrap;background:#222224;color:#bbb;font-size:14px}.footer{padding:24px clamp(24px,7vw,100px) 120px;display:flex;gap:22px;flex-wrap:wrap;font-size:13px;color:#bdb9bc}.footer button{background:none;color:inherit;border:0;padding:0;text-decoration:underline}.panel{position:fixed;z-index:10;right:24px;bottom:24px;width:min(520px,calc(100% - 48px));background:#fff;color:var(--ink);border:1px solid #e4e0e2;border-radius:12px;box-shadow:0 18px 75px #0008;overflow:auto;max-height:calc(100dvh - 48px);overscroll-behavior:contain;animation:enter .23s ease-out}.panel:before{content:\"\";height:4px;background:var(--pink);display:block}.inner{padding:24px 26px 21px}.top{display:flex;align-items:center;justify-content:space-between;gap:12px}.mark{display:flex;align-items:center;gap:9px;font-size:11px;letter-spacing:.12em;font-weight:750;text-transform:uppercase;color:#B3284F}.mark svg{width:25px;height:25px}.version{font-size:11px;color:var(--muted)}h2{font-size:30px;line-height:1.1;letter-spacing:-.045em;margin:17px 0 10px} .intro{font-size:14px;line-height:1.58;margin:0 0 16px;color:#514e52}.links{display:flex;gap:15px;flex-wrap:wrap;font-size:12px;color:#514e52;margin:0 0 18px}.links a{text-underline-offset:3px}.actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.action{border:1px solid var(--ink);background:var(--ink);color:#fff;border-radius:5px;font-size:14px;font-weight:650;min-height:46px;padding:11px 8px;transition:background .15s}.action:hover{background:#414143}.secondary{grid-column:1/-1;background:#fff;color:#1a1a1b;border:1px solid #c9c5c7}.secondary:hover{background:#f4f2f3}.meta{font-size:11px;color:#6a666a;text-align:center;margin:13px 0 0}.categories{border-top:1px solid var(--line);margin:14px 0 17px}.category{padding:11px 0;border-bottom:1px solid var(--line)}.catrow{display:flex;align-items:center;justify-content:space-between;gap:12px}.category strong{font-size:14px}.category p{font-size:12px;line-height:1.45;color:var(--muted);margin:5px 0 0}.always{font-size:11px;font-weight:700;color:#555}.toggle{appearance:none;width:42px;height:24px;border:1px solid #817e81;border-radius:20px;background:#dedbdd;position:relative;flex:none;margin:0}.toggle:before{content:\"\";width:16px;height:16px;position:absolute;left:3px;top:3px;background:#fff;border:1px solid #b7b3b5;border-radius:50%;transition:transform .15s}.toggle:checked{background:#B3284F;border-color:#B3284F}.toggle:checked:before{transform:translateX(18px);border-color:white}.category details{font-size:12px;color:#5e5b60;margin-top:6px}.category summary{width:fit-content;text-decoration:underline;text-underline-offset:3px}.back{border:0;background:none;font-size:13px;color:#565256;padding:8px 0;margin-top:2px;text-decoration:underline}.reopen{position:fixed;bottom:20px;right:24px;z-index:9;border:1px solid #777;background:#222;color:white;border-radius:5px;padding:12px 16px;font-size:13px;box-shadow:0 5px 24px #0004}.status{font-size:12px;color:#bcb9bc}.demo-note{font-size:11px;color:#6a666a;margin:10px 0 0;line-height:1.4}@keyframes enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@media(max-width:600px){.nav{display:none}.siteheader{padding:22px}.hero{padding:55px 24px 85px;min-height:390px}.panel{right:10px;bottom:10px;width:calc(100% - 20px);max-height:calc(100dvh - 20px)}.inner{padding:19px 17px 16px}h2{font-size:26px}.intro{font-size:13px}.actions{gap:8px}.action{font-size:13px;min-height:45px}.demo{align-items:flex-start}.demo button{flex-shrink:0}.below{gap:20px}.reopen{right:12px;bottom:12px}}@media(max-width:340px){.actions{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}\n\n/* V2: friendly editorial treatment, equally visible consent choices */\n.panel{width:min(550px,calc(100% - 48px));border-radius:10px;box-shadow:0 18px 65px #0007}.inner{padding:27px 28px 23px}.mark{letter-spacing:.13em}.mark svg{width:23px;height:23px}h2{font-size:32px;letter-spacing:-.05em;line-height:1.08;margin:20px 0 13px}.intro{font-size:14px;line-height:1.62;color:#4b494b;margin-bottom:17px}.purpose{display:flex;flex-wrap:wrap;gap:12px 18px;align-items:center;padding:12px 0 15px;border-top:1px solid #eee9eb;border-bottom:1px solid #eee9eb;margin-bottom:14px}.purpose span{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#4b494b}.purpose svg{width:18px;height:18px;color:#B3284F}.links{margin-bottom:17px}.action:not(.secondary){background:#B3284F;border-color:#B3284F;color:white;font-weight:700;min-height:49px}.action:not(.secondary):hover{background:#8d203e;border-color:#8d203e}.secondary{min-height:44px}.meta{line-height:1.5;margin-top:14px}.panel:before{height:4px}.version{font-weight:600}.actions{gap:9px}@media(max-width:600px){.panel{width:calc(100% - 20px)}.inner{padding:19px 17px 16px}h2{font-size:27px}.purpose{gap:8px 12px}.purpose span{font-size:11px}.purpose svg{width:16px;height:16px}.intro{font-size:13px}.meta{font-size:11px}}@media(max-width:340px){h2{font-size:24px}.actions{grid-template-columns:1fr}}\n\n/* V3: full-width acceptance; direct, readable secondary choices */\n#first .primary-actions{grid-template-columns:1fr 1fr;gap:8px}\n#first .primary-actions .accept{grid-column:1/-1;background:#FA225B;border-color:#FA225B;color:#1A1A1B;font-size:16px;min-height:56px;font-weight:750;white-space:nowrap}\n#first .primary-actions .accept:hover{background:#ff4c7b;border-color:#ff4c7b}\n#first .primary-actions .alternative{min-height:44px;padding:9px 6px;background:#fff;color:#1a1a1b;border:1px solid #8c878a;font-size:13px;font-weight:600;line-height:1.3}\n#first .primary-actions .alternative:hover{background:#f3f0f1;border-color:#1a1a1b}\n@media(max-width:340px){#first .primary-actions{grid-template-columns:1fr 1fr}#first .primary-actions .alternative{font-size:12px}}\n\n#first .primary-actions{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}\n#first .primary-actions .accept span{margin-left:8px}\n#first .links{justify-content:center;margin:13px 0 0}\n\n:host{font-family:Inter,Arial,sans-serif;color:#1a1a1b} .panel{z-index:2147483000} .panel h2{color:#1a1a1b} .panel a{color:inherit} .panel button{cursor:pointer} .panel .intro{color:#514e52}";
  const UI="<section class=\"panel\" id=\"panel\" hidden aria-labelledby=\"heading\"><div class=\"inner\"><div class=\"top\"><span class=\"mark\"><svg viewBox=\"0 0 32 32\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" aria-hidden=\"true\"><path d=\"M16 3c2 5 6 7 11 7 0 11-4 15-11 19C9 25 5 21 5 10c5 0 9-2 11-7Z\"/><path d=\"m11 16 3 3 7-7\"/></svg>Datenschutz</span><span class=\"version\">CreAid-Media</span></div><div id=\"first\"><h2 id=\"heading\" tabindex=\"-1\">Gemeinsam machen wir diese Website besser.</h2><p class=\"intro\">Mit Ihrer Einwilligung verwenden wir Google Analytics, um die Nutzung unserer Website zu verstehen und unsere Inhalte zu verbessern. Sie können die Statistik ablehnen oder Ihre Auswahl jederzeit ändern.</p><div class=\"purpose\"><span>✓ Notwendig</span><span>Statistik · Google Analytics</span></div><div class=\"actions primary-actions\"><button class=\"action accept\" data-choice=\"all\">Akzeptieren und weiter <span aria-hidden=\"true\">→</span></button><button class=\"action alternative\" data-choice=\"deny\">Nur notwendige &amp; weiter</button><button class=\"action alternative\" id=\"custom\">Individuelle Einstellungen</button></div><div class=\"links\"><a href=\"/datenschutz\">Datenschutzerklärung</a><a href=\"/impressum\">Impressum</a></div><p class=\"meta\">Auch ohne optionale Cookies bleibt die Website nutzbar. Ihre Auswahl können Sie jederzeit ändern oder widerrufen.</p></div><div id=\"settings\" hidden><button class=\"back\" id=\"back\">← Zurück</button><h2 id=\"settingsHeading\" tabindex=\"-1\">Cookie-Einstellungen</h2><p class=\"intro\">Entscheiden Sie, ob Sie Statistik erlauben möchten. Marketing und externe Medien sind derzeit nicht als optionale Dienste eingebunden.</p><div class=\"categories\"><div class=\"category\"><div class=\"catrow\"><strong>Notwendig</strong><span class=\"always\">Immer aktiv</span></div><p>Grundfunktionen und lokale Speicherung Ihrer Auswahl für höchstens 180 Tage.</p></div><div class=\"category\"><div class=\"catrow\"><label for=\"stats\"><strong>Statistik</strong></label><input class=\"toggle\" type=\"checkbox\" id=\"stats\" role=\"switch\"></div><p>Google Analytics: Messung der Website-Nutzung. Anbieterinformationen, Cookies und Datenübermittlung siehe <a href=\"/datenschutz\">Datenschutz</a>.</p></div></div><div class=\"actions\"><button class=\"action\" data-choice=\"deny\">Nur notwendige</button><button class=\"action\" data-choice=\"all\">Alle akzeptieren</button><button class=\"action secondary\" data-choice=\"save\">Auswahl speichern</button></div></div><p id=\"preview\" class=\"demo-note\" hidden>Vorschau: Ihre Auswahl wird lokal getestet. Keine Google-Skripte oder Analytics-Anfragen.</p><p id=\"feedback\" class=\"demo-note\" role=\"status\"></p></div></section>";
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
