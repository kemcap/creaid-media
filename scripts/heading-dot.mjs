// Decorative signature: keep the original homepage ball and existing punctuation.
// Applied at build time, so no layout change after the first paint.
const ball = '<span class="cm-heading-dot" aria-hidden="true"></span>';
const punctuationBall = '<span class="cm-heading-dot" aria-hidden="true">.</span>';
const trailingClosers = String.raw`((?:\s*<\/(?:span|em|strong|b|i|small)>\s*)*)$`;
export function decorateHeading(body){
 if(/class="[^"]*\bcm-heading-dot\b/.test(body))return body;
 if(new RegExp('<span class="pink-dot" aria-hidden="true"><\\/span>'+trailingClosers).test(body))return body;
 // Replace terminal legacy dot marks, preserving surrounding typography spans.
 const legacy=new RegExp('<span\\b[^>]*class="[^"]*\\b(?:pink-point|pink-dot|a-dot|j-pink|statement-period)\\b[^"]*"[^>]*>\\s*\\.\\s*<\\/span>'+trailingClosers,'i');
 if(legacy.test(body))return body.replace(legacy,(_,end)=>'&#8288;'+punctuationBall+end);
 const period=new RegExp('\\.\\s*'+trailingClosers,'i');
 if(period.test(body))return body.replace(period,(_,end)=>'&#8288;'+punctuationBall+end);
 return body.replace(new RegExp(trailingClosers,'i'),(_,end)=>'&#8288;'+ball+end);
}
// Keep the terminal word and signature together only on the Phase-5 reviewed headings.
const journalPilotKeys=new Set(['firmennamen-entwickeln-lassen','webdesign-fuer-dachdecker-firma','webdesign-fuer-arztpraxen','seo-grundlagen-lokale-dienstleister']);
function journalHeadingTail(body){
 const decorated=decorateHeading(body);
 // These archive/pilot H1 headings are plain text. Leave other markup untouched.
 if(!/^[^<>]+$/.test(body))return decorated;
 return decorated.replace(/([^\s<>&-]+)(&#8288;<span class="cm-heading-dot" aria-hidden="true">(?:\.)?<\/span>)$/u,(_,word,dot)=>'<span class="cm-journal-dot-tail">'+word+dot+'</span>');
}
export function decoratePageHeadings(html,outputPath){
 if(!outputPath?.endsWith('.html'))return html;
 return html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/,main=>main.replace(/<h([12])\b([^>]*)>([\s\S]*?)<\/h\1>/g,(all,level,attrs,body)=>{
  if(/\bcm-semantic-heading\b/.test(attrs))return all;
  // Real H1 titles on archives, legacy pages and editorial articles; selected large H2s.
  const key=outputPath.split(/[\\/]/).at(-1).replace(/\.html$/,'');
  if(level==='1'&&(/\bcm-archive-title\b/.test(attrs)||journalPilotKeys.has(key)))return '<h'+level+attrs+'>'+journalHeadingTail(body)+'</h'+level+'>';
  if(level==='1'||/\bid="cm-pricing-title(?:-[^"]+)?"/.test(attrs))return '<h'+level+attrs+'>'+decorateHeading(body)+'</h'+level+'>';
  return all;
 }));
}
