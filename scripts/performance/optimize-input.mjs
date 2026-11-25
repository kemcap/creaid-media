// Optional allowlisted asset optimization before fingerprinting. Never modifies source.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, lstatSync, realpathSync, readdirSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { resolve, dirname, extname, relative, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync, brotliCompressSync } from 'node:zlib';

export const versions=Object.freeze({esbuild:'0.25.12',sharp:'0.34.1'});
const sha=b=>createHash('sha256').update(b).digest('hex');
const within=(a,b)=>{const r=relative(a,b);return r===''||(!r.startsWith('..'+sep)&&r!=='..'&&!r.startsWith(sep));};
function realFuture(p){return existsSync(p)?realpathSync(p):join(realFuture(dirname(p)),relative(dirname(p),p));}
function inventory(root){
  const all=[];
  for(const entry of readdirSync(root,{withFileTypes:true})){
    const p=join(root,entry.name);
    if(entry.isSymbolicLink())throw Error('Symlink not allowed: '+p);
    if(entry.isDirectory())all.push(...inventory(p));
    else if(entry.isFile())all.push(p);
    else throw Error('Nonregular file: '+p);
  }
  return all;
}
function loadTools(toolRoot, need){
  const require=createRequire(join(resolve(toolRoot),'package.json'));
  const result={};
  for(const name of need){
    const actual=require(name+'/package.json').version;
    if(actual!==versions[name])throw Error('Expected '+name+'@'+versions[name]+', found '+actual);
    result[name]=require(name);
  }
  return result;
}
const dimensions=meta=>[meta.width,meta.height,meta.orientation??1,meta.hasAlpha??false,meta.space,meta.depth];
function sizeRow(path,kind,before,after,reason){
  return {path,kind,originalBytes:before.length,optimizedBytes:after.length,savedBytes:before.length-after.length,originalSha256:sha(before),optimizedSha256:sha(after),reason};
}
async function losslessImage(sharp,bytes,ext){
  const base=sharp(bytes,{failOn:'error',limitInputPixels:40_000_000});
  const meta=await base.metadata();
  // Leave animated, color-managed, high-bit-depth and rotated originals alone.
  if((meta.pages??1)>1||meta.icc||meta.exif||meta.iptc||meta.xmp||meta.orientation>1||meta.depth!=='uchar'||meta.space!=='srgb')
    return {bytes,reason:'complex-image-preserved'};
  const encoder=sharp(bytes,{failOn:'error',limitInputPixels:40_000_000});
  const candidate=await (ext==='.png'?encoder.png({compressionLevel:9,adaptiveFiltering:true,palette:false}):encoder.webp({lossless:true,effort:6})).toBuffer();
  if(candidate.length>=bytes.length)return {bytes,reason:'no-byte-saving'};
  const newMeta=await sharp(candidate).metadata();
  if(JSON.stringify(dimensions(meta))!==JSON.stringify(dimensions(newMeta)))return {bytes,reason:'image-properties-changed'};
  const [a,b]=await Promise.all([sharp(bytes).raw().toBuffer({resolveWithObject:true}),sharp(candidate).raw().toBuffer({resolveWithObject:true})]);
  if(a.info.channels!==b.info.channels||!a.data.equals(b.data))return {bytes,reason:'pixel-difference'};
  return {bytes:candidate,reason:'pixel-identical-lossless'};
}
export async function optimizeInput({source,output,config,toolRoot}){
  source=resolve(source);output=resolve(output);
  if(!config||!Array.isArray(config.files)||!config.files.length||config.files.length>2000)throw Error('Provide explicit files allowlist (1–2000 entries)');
  if(!existsSync(join(source,'index.html'))||!existsSync(join(source,'assets'))||lstatSync(source).isSymbolicLink()||existsSync(output)||within(realpathSync(source),realFuture(output))||within(realFuture(output),realpathSync(source)))throw Error('Expected isolated static input/output');
  const all=inventory(source);
  // Conservative SRI gate; do not alter any CSS/JS if the input uses integrity attributes.
  const hasSRI=all.filter(p=>/\.html?$/i.test(p)).some(p=>/\bintegrity\s*=/i.test(readFileSync(p,'utf8')));
  const entries=[...new Set(config.files)].map(path=>{
    if(typeof path!=='string'||!/^assets\/[A-Za-z0-9._/-]+$/.test(path)||path.split('/').some(x=>!x||x==='.'||x==='..')||/\.sha256-|\.min\./i.test(path))throw Error('Unsafe or already optimized path: '+path);
    const p=join(source,path),ext=extname(path).toLowerCase();
    if(!existsSync(p)||!lstatSync(p).isFile()||!['.css','.js','.mjs','.png','.webp'].includes(ext))throw Error('Unsupported or missing selected asset: '+path);
    return {path,p,ext,kind:['.png','.webp'].includes(ext)?'image':'code'};
  });
  const need=new Set(entries.map(e=>e.kind==='image'?'sharp':'esbuild'));
  const tools=loadTools(toolRoot,need);
  const rows=[];
  mkdirSync(output,{recursive:false});
  try{
    const site=join(output,'site');
    cpSync(source,site,{recursive:true,errorOnExist:true,force:false});
    for(const e of entries){
      const before=readFileSync(e.p);let after=before,reason='unchanged';
      if(e.kind==='image'){
        const result=await losslessImage(tools.sharp,before,e.ext);after=result.bytes;reason=result.reason;
      }else if(hasSRI){reason='sri-present-preserved';}
      else if(/sourceMappingURL\s*=/.test(before.toString('utf8'))){reason='sourcemap-preserved';}
      else{
        // No identifier mangling, bundling, target downleveling or syntax optimizations.
        const result=await tools.esbuild.transform(before.toString('utf8'),{
          loader:e.ext==='.css'?'css':'js',sourcefile:e.path,target:'esnext',
          minifyWhitespace:true,minifyIdentifiers:false,minifySyntax:false,
          legalComments:'inline',charset:'utf8',sourcemap:false
        });
        if(result.warnings.length){reason='parser-warning-preserved';}
        else {
          const candidate=Buffer.from(result.code);
          if(candidate.length<before.length){after=candidate;reason='whitespace-minified';}
          else reason='no-byte-saving';
        }
      }
      if(after!==before)writeFileSync(join(site,e.path),after);
      const row=sizeRow(e.path,e.kind,before,after,reason);
      if(e.kind==='code')Object.assign(row,{originalGzip:gzipSync(before).length,optimizedGzip:gzipSync(after).length,originalBrotli:brotliCompressSync(before).length,optimizedBrotli:brotliCompressSync(after).length});
      rows.push(row);
    }
    const report={toolVersions:versions,selected:entries.length,changed:rows.filter(r=>r.savedBytes>0).length,savedBytes:rows.reduce((n,r)=>n+r.savedBytes,0),rows,notes:['Output is an unapproved build copy; review visual/browser regression before fingerprinting.','Image compression preserves decoded pixels and selected metadata properties; JPEG/AVIF/animated/complex files not transformed.','No HTML, srcset, responsive sizing, format conversion, or source build changes.']};
    writeFileSync(join(output,'optimization-report.json'),JSON.stringify(report,null,2)+'\n');
    return report;
  }catch(error){rmSync(output,{recursive:true,force:true});throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [source,output,configFile,toolRoot,...extra]=process.argv.slice(2);
  if(!source||!output||!configFile||!toolRoot||extra.length)throw Error('Usage: node scripts/performance/optimize-input.mjs <build> <new-output> <allowlist.json> <tool-install-dir>');
  const report=await optimizeInput({source,output,config:JSON.parse(readFileSync(configFile,'utf8')),toolRoot});
  console.log(JSON.stringify({selected:report.selected,changed:report.changed,savedBytes:report.savedBytes},null,2));
}
