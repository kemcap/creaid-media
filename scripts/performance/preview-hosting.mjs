// Opt-in hosting candidate for the dedicated CreAid preview host only.
// No remote access or deployment. HTML and errors remain no-store.
import {readFileSync,writeFileSync,existsSync,lstatSync,readdirSync,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildPerformance} from './engine.mjs';
const host='vorschau.creaid-media.de';
export const previewHostingRules=[
 '# BEGIN CREAID PREVIEW HOST CACHE',
 '<IfModule mod_headers.c>',
 'Header always set X-Robots-Tag "noindex, nofollow, noarchive"',
 '<FilesMatch "\\.sha256-[0-9a-f]{64}\\.(css|js|mjs|webp|avif|png|jpg|jpeg|gif|svg|woff2|woff|ico)$">',
 'Header always set Cache-Control "private, max-age=3600, immutable" "expr=%{HTTP_HOST} == \''+host+'\' && %{REQUEST_URI} =~ m#^/assets/# && (%{REQUEST_STATUS} == 200 || %{REQUEST_STATUS} == 206 || %{REQUEST_STATUS} == 304)"',
 '</FilesMatch>',
 '</IfModule>',
 '# END CREAID PREVIEW HOST CACHE',''
].join('\n');
function inspect(root){
 for(const e of readdirSync(root,{withFileTypes:true})){
  const p=join(root,e.name);
  if(e.isSymbolicLink())throw Error('Symlink forbidden');
  if(e.isDirectory())inspect(p);
  else if(e.isFile()&&e.name==='.htaccess'){
   const text=readFileSync(p,'utf8');
   if(/^\s*(?:AuthType|AuthUserFile|Require\s+(?:valid-user|user|group)|AuthBasicProvider)\b/im.test(text))throw Error('Protected preview: keep no-store');
   if(/BEGIN CREAID PREVIEW HOST CACHE/.test(text))throw Error('Existing hosting policy');
  }
 }
}
export function packagePreviewHosting({source,output,approved=false}){
 if(approved!==true)throw Error('Explicit approval of public static preview assets required');
 source=resolve(source);output=resolve(output);
 if(lstatSync(source).isSymbolicLink())throw Error('Invalid source');
 inspect(source);
 const report=buildPerformance({source,output,profile:'preview'});
 const file=join(output,'site','.htaccess');
 writeFileSync(file,readFileSync(file,'utf8')+previewHostingRules);
 const result={...report,profile:'preview-host-private-cache',hostname:host,htmlCache:'no-store',assetCache:'private, max-age=3600, immutable (fingerprinted static assets only)',deployment:'not performed',limitations:[...report.limitations,'Only the dedicated preview hostname enables private caching of fingerprinted assets. The shared/CDN cache is not enabled.','Do not use for authenticated/private preview content. Review the actual hosting configuration and existing server rules before upload.','No remote publishing. Back up the actual preview document root and preserve existing access controls, redirects and hosting rules.']};
 writeFileSync(join(output,'report.json'),JSON.stringify(result,null,2)+'\n');
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [source,output,approval,...extra]=process.argv.slice(2);
 if(!source||!output||extra.length||approval!=='--approve-public-preview-assets')throw Error('Usage: node scripts/performance/preview-hosting.mjs <current-preview-build> <new-output> --approve-public-preview-assets');
 const report=packagePreviewHosting({source,output,approved:true});
 console.log(JSON.stringify({profile:report.profile,hostname:report.hostname,pages:report.pages,verifiedAssets:report.verifiedAssets,deployment:report.deployment},null,2));
}
