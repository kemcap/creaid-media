import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {join,basename} from 'node:path';
const plans=JSON.parse(readFileSync(new URL('../src/_data/headingPlan.json',import.meta.url),'utf8'));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const plain=s=>s.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const attr=(s,name)=>s.match(new RegExp('\\b'+name+'="([^"]*)"'))?.[1];
const addClass=(a,c)=>/\bclass="/.test(a)?a.replace(/class="([^"]*)"/,(_,v)=>'class="'+v+' '+c+'"'):a+' class="'+c+'"';
function creative(level,attrs,body,label){
 const id=attr(attrs,'id'); const keep=attrs.replace(/\s+id="[^"]*"/,'');
 const sem='<h'+level+' class="cm-semantic-heading cm-semantic-h'+level+'"'+(id?' id="'+id+'"':'')+'>'+esc(label)+'</h'+level+'>';
 // Existing topic label is replaced by the visible H1, not duplicated.
 if(level===1)body=body.replace(/<span class="sp-h1-topic">[\s\S]*?<\/span>/,'');
 return sem+'<div'+addClass(keep,'cm-claim-h'+level)+'>'+body+'</div>';
}
export function transformHeadings(html,outputPath){
 if(!outputPath?.endsWith('.html'))return html;
 const key=basename(outputPath,'.html'),plan=plans[key];
 if(!plan)return html;
 const main=html.match(/<main\b[^>]*>[\s\S]*?<\/main>/);
 if(!main)throw Error('Heading plan: main missing '+key);
 let h1=0,h2=0,h3=0,faq=false,lastLevel=0;const toc=new Map();
 let section=main[0].replace(/<h([123])\b([^>]*)>([\s\S]*?)<\/h\1>/g,(all,n,a,b)=>{
   let level=Number(n),label=plain(b),id=attr(a,'id');
   if(level===1){
     h1++;lastLevel=1;
     if(plan.mode==='creative')return creative(1,a,b,plan.h1);
     if(label===plan.h1)return all;
     return '<h1'+a+'>'+esc(plan.h1)+'</h1>';
   }
   if(level===2){
     const i=h2++;
     if(plan.mode==='creative'){
       lastLevel=2;
       if(i>=plan.h2.length)throw Error('Unexpected H2 on '+key+': '+label);
       return plan.h2[i]?creative(2,a,b,plan.h2[i]):all;
     }
     if(plan.mode==='plain'){lastLevel=2;return '<h2'+a+'>'+esc(plan.h2[i]||label)+'</h2>';}
     if(plan.mode==='article'){
       if(/MEHR AUS IHRER MARKE MACHEN/i.test(label)){lastLevel=2;return creative(2,a,b,plan.cta);}
       if(/\?$/.test(label.replace(/\s*\+$/,''))&&/\s\+$/.test(label)){
         // A formerly flattened FAQ is grouped under a real H2.
         const intro=faq?'':'<h2 class="cm-semantic-heading cm-semantic-h2">Häufige Fragen</h2>';
         faq=true;lastLevel=3;
         const question=label.replace(/\s*\+$/,'').replace(/\s+\?/g,'?');
         if(id)toc.set(id,question);
         return intro+'<h3'+a+'>'+esc(question)+'</h3>';
       }
       faq=/^Häufige Fragen/i.test(label);lastLevel=2;
       const better=plan.replacements?.[label];
       if(better){if(id)toc.set(id,better);return '<h2'+a+'>'+esc(better)+'</h2>';}
       return all;
     }
     lastLevel=2;return all;
   }
   const i=h3++;
   const better=plan.mode==='plain'?plan.h3[i]:plan.h3Replacements?.[label];
   // Archive cards are subordinate to a real section heading inserted below.
   if(plan.mode==='article'&&lastLevel<2){
     lastLevel=2;return '<h2'+a+'>'+b+'</h2>';
   }
   lastLevel=3;
   return better?'<h3'+a+'>'+esc(better)+'</h3>':all;
 });
 if(plan.mode==='archive'){
   if(!section.includes('<div class="j-articles">'))throw Error('Archive list missing '+key);
   section=section.replace('<div class="j-articles">','<h2 class="cm-semantic-heading cm-semantic-h2">Beiträge zu '+esc(plan.topic)+'</h2><div class="j-articles">');
 }
 if(h1!==1)throw Error('Expected one original H1 for '+key+', found '+h1);
 if(plan.mode==='creative'&&h2!==plan.h2.length)throw Error('H2 plan mismatch '+key+' '+h2+' vs '+plan.h2.length);
 // Keep TOC text and section anchors synchronized when article headings are refined.
 for(const [id,label] of toc)section=section.replace(/<a\b([^>]*?)href="#([^"]+)"([^>]*)>[\s\S]*?<\/a>/g,(all,a,target,b)=>target===id?'<a'+a+'href="#'+target+'"'+b+'>'+esc(label)+'</a>':all);
 return html.replace(main[0],section);
}
// Preserve the selector specificity and original visual styling of demoted claims.
// The semantic heading is deliberately excluded from the old oversized heading rules.
const flag='/* cm-semantic-heading-selectors-v1 */';
export function preserveClaimStyles(output='dist'){
 const dir=join(output,'assets');if(!existsSync(dir))return;
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.css')&&f!=='heading-semantics.css')){
  const path=join(dir,file),css=readFileSync(path,'utf8');if(css.startsWith(flag))continue;
  const adjusted=css.replace(/([^{}]+)\{/g,(all,selector)=>{
    if(selector.trimStart().startsWith('@'))return all;
    const next=selector.replace(/(?<![\w.-])h([12])(?![\w-])/g,(_,n)=>':is(h'+n+':not(:where(.cm-semantic-heading)),:where(.cm-claim-h'+n+'))');
    return next+'{';
  });
  if(adjusted!==css)writeFileSync(path,flag+'\n'+adjusted);
 }
}
