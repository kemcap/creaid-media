// Exercise the proposed Balanced profile against the actual local CreAid build.
// Reports remain outside the site and the output is never deployed.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {auditBuild} from './audit.mjs';
import {suggestBalanced} from './suggest-balanced.mjs';
import {runPipeline} from './pipeline.mjs';
import {compareVisual} from './visual-regression.mjs';
import {routeFiles} from '../routes.mjs';
export async function evaluateBalanced({source,output,toolRoot,browserToolRoot}){
 const proposal=suggestBalanced(auditBuild(source));
 const result=await runPipeline({source,output,toolRoot,config:proposal.config});
 const representative=['/','/webdesign','/grafikdesign-2','/kontakt','/creaid-blog','/online-shop-entwicklung'].filter(r=>Object.hasOwn(routeFiles,r));
 const visual=await compareVisual({before:source,after:join(output,'package','site'),output:join(output,'visual-review'),toolRoot:browserToolRoot,routeFiles,routes:representative});
 const summary={
  mode:'balanced-preview-evaluation',
  selected:proposal.selected,
  optimizedFiles:result.steps.optimize?.changed??0,
  savedUncompressedSourceBytes:result.steps.optimize?.savedBytes??0,
  generatedResponsiveVariants:result.steps.responsive?.generated??0,
  responsiveMarkupChanges:result.steps.responsiveIntegration?.integrated??0,
  visualSamples:visual.rows.length,
  visualFindings:visual.rows.filter(r=>r.findings.length).length,
  visualPassed:visual.passed,
  deployment:'not performed',
  limitations:['Candidate-only preview, no automatic approval.','Uncompressed source file savings are not HTTP transfer or measured speed gains.','Generated responsive files are not used until reviewed layout mappings are integrated.','Representative Chromium screenshots do not cover every interactive state.']
 };
 writeFileSync(join(output,'balanced-evaluation.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
 return summary;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [source,output,toolRoot,browserToolRoot,...extra]=process.argv.slice(2);
 if(!source||!output||!toolRoot||!browserToolRoot||extra.length||existsSync(output))throw Error('Usage: node scripts/performance/evaluate-balanced.mjs <build> <new-output> <optimizer-tool-dir> <browser-tool-dir>');
 const result=await evaluateBalanced({source,output,toolRoot,browserToolRoot});
 console.log(JSON.stringify(result,null,2));
 if(!result.visualPassed)process.exitCode=1;
}
