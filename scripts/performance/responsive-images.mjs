// Generate responsive WebP candidates for explicit source images. No HTML changes.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, realpathSync, readdirSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { join, resolve, dirname, relative, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { versions } from './optimize-input.mjs';

const within=(a,b)=>{const r=relative(a,b);return r===''||(!r.startsWith('..'+sep)&&r!=='..'&&!r.startsWith(sep));};
const future=p=>existsSync(p)?realpathSync(p):join(future(dirname(p)),relative(dirname(p),p));
function scan(root){for(const e of readdirSync(root,{withFileTypes:true})){const p=join(root,e.name);if(e.isSymbolicLink())throw Error('Symlink not allowed: '+p);if(e.isDirectory())scan(p);else if(!e.isFile())throw Error('Unsupported file: '+p);}}
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function responsiveCandidates({source,output,config,toolRoot}){
  source=resolve(source);output=resolve(output);
  if(!existsSync(join(source,'index.html'))||lstatSync(source).isSymbolicLink()||existsSync(output)||within(realpathSync(source),future(output))||within(future(output),realpathSync(source)))throw Error('Use isolated static input and new output');
  scan(source);
  if(!Array.isArray(config?.images)||!config.images.length||config.images.length>200)throw Error('Provide images allowlist (1–200)');
  const widths=[...new Set(config.widths??[320,480,768,1024,1440])].sort((a,b)=>a-b);
  const quality=config.quality??82;
  if(!widths.length||widths.length>8||widths.some(x=>!Number.isSafeInteger(x)||x<160||x>2400)||!Number.isSafeInteger(quality)||quality<70||quality>95)throw Error('Invalid widths/quality');
  const require=createRequire(join(resolve(toolRoot),'package.json'));
  if(require('sharp/package.json').version!==versions.sharp)throw Error('Unexpected sharp version');
  const sharp=require('sharp');
  const entries=[...new Set(config.images)].map(path=>{
    if(typeof path!=='string'||!/^assets\/[A-Za-z0-9._/-]+\.(?:jpg|jpeg|png|webp)$/i.test(path)||path.split('/').some(x=>!x||x==='.'||x==='..')||/\.sha256-|\.responsive-/i.test(path))throw Error('Invalid image path: '+path);
    const file=join(source,path);
    if(!existsSync(file)||!lstatSync(file).isFile())throw Error('Missing image: '+path);
    return {path,file};
  });
  mkdirSync(output,{recursive:false});
  try{
    const site=join(output,'site');cpSync(source,site,{recursive:true,errorOnExist:true,force:false});
    const rows=[];
    for(const {path,file} of entries){
      const bytes=readFileSync(file);
      const meta=await sharp(bytes,{failOn:'error',limitInputPixels:40_000_000}).metadata();
      const row={original:'/'+path,originalBytes:bytes.length,width:meta.width,height:meta.height,variants:[],status:'generated'};
      if(!meta.width||!meta.height||(meta.pages??1)>1||meta.icc||meta.exif||meta.iptc||meta.xmp||meta.orientation>1||meta.depth!=='uchar'||meta.space!=='srgb'){
        row.status='complex-image-preserved';rows.push(row);continue;
      }
      for(const width of widths.filter(w=>w<meta.width)){
        const {data,info}=await sharp(bytes,{failOn:'error',limitInputPixels:40_000_000}).resize({width,withoutEnlargement:true}).webp({quality,alphaQuality:100,effort:5}).toBuffer({resolveWithObject:true});
        if(data.length>=bytes.length||info.width!==width)continue;
        const expected=meta.height*width/meta.width;
        if(Math.abs(info.height-expected)>1)throw Error('Aspect ratio changed: '+path);
        const suffix='.responsive-'+width+'w-'+sha(data).slice(0,16)+'.webp';
        const dest=path.slice(0,-extname(path).length)+suffix;
        const out=join(site,dest);
        if(existsSync(out)){if(!readFileSync(out).equals(data))throw Error('Responsive asset collision');}
        else writeFileSync(out,data,{flag:'wx'});
        row.variants.push({url:'/'+dest,width:info.width,height:info.height,bytes:data.length,sha256:sha(data)});
      }
      if(!row.variants.length)row.status='no-smaller-variant';
      else row.srcsetCandidate=[...row.variants.map(v=>v.url+' '+v.width+'w'),row.original+' '+row.width+'w'].join(', ');
      rows.push(row);
    }
    const report={mode:'responsive-candidates',quality,widths,rows,generated:rows.reduce((n,r)=>n+r.variants.length,0),limitations:['Lossy resized WebP candidates; visual quality approval required.','Originals and all HTML unchanged. Integrate srcset with actual layout-specific sizes manually before fingerprinting. Do not reuse srcset indiscriminately across different crops or picture sources.','No upscaling; complex or animated images preserved. Generated variants are not necessarily transferred until integrated into markup.']};
    writeFileSync(join(output,'responsive-report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
  }catch(error){rmSync(output,{recursive:true,force:true});throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [source,output,configFile,toolRoot,...extra]=process.argv.slice(2);
  if(!source||!output||!configFile||!toolRoot||extra.length)throw Error('Usage: node scripts/performance/responsive-images.mjs <build> <new-output> <allowlist.json> <tool-dir>');
  const result=await responsiveCandidates({source,output,config:JSON.parse(readFileSync(configFile,'utf8')),toolRoot});
  console.log(JSON.stringify({generated:result.generated,images:result.rows.length},null,2));
}
