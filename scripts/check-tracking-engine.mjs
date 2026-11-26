import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const code=readFileSync('public/assets/tracking-engine.js','utf8');
for(const s of [{host:'creaid-media.de'},{host:'creaid-media.de',value:false},{host:'creaid-media.de',value:true},{host:'www.creaid-media.de',value:true},{host:'vorschau.creaid-media.de',value:true},{host:'creaid-media.de.evil.example',value:true},{host:'creaid-media.de',value:true,expired:true},{host:'creaid-media.de',value:true,http:true},{host:'creaid-media.de',blocked:true}]){
 let data=s.value==null?null:JSON.stringify({version:1,analytics:s.value,time:Date.now()-(s.expired?181*86400000:0)});
 const scripts=[],handlers={},window={addEventListener:(name,cb)=>handlers[name]=cb};let reload=0;
 const document={readyState:'loading',cookie:'',head:{appendChild:s=>scripts.push(s.src)},createElement:()=>({}),addEventListener(){},querySelectorAll:()=>[]};
 const location={hostname:s.host,protocol:s.http?'http:':'https:',reload:()=>reload++};
 const localStorage={getItem:()=>{if(s.blocked)throw Error('blocked');return data;}};
 runInNewContext(code,{window,document,location,localStorage,setTimeout:()=>0,clearTimeout:()=>{}});
 window.CreAidTracking.trackLead();
 const expected=s.value===true&&!s.expired&&!s.http&&/^(www\.)?creaid-media\.de$/.test(s.host);
 assert.equal(scripts.length,expected?1:0,JSON.stringify(s));
 assert.equal(window.dataLayer.some(x=>x.event==='creaid_lead_submitted'),expected);
 assert.equal(window.dataLayer.some(x=>x.event==='creaid_analytics_granted'),expected);
 assert.equal(window.dataLayer[0][2].analytics_storage,'denied');
 if(expected){data=JSON.stringify({version:1,analytics:false,time:Date.now()});handlers.storage({key:'creaid-consent-v1'});assert.equal(reload,1);assert.equal(window['ga-disable-G-Q508SZ02YF'],true);}
}
console.log('PASS: 9 consent scenarios, production host gating, conversion gating and revocation.');
