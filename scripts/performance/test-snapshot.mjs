import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {snapshotBuild,restoreBuild} from './snapshot.mjs';
const root=mkdtempSync(join(tmpdir(),'creaid-snapshot-'));
try{
  const source=join(root,'dist'),snap=join(root,'snapshot'),restored=join(root,'restored');
  mkdirSync(join(source,'assets','empty'),{recursive:true});
  writeFileSync(join(source,'index.html'),'<h1>original</h1>');
  writeFileSync(join(source,'assets','file.bin'),Buffer.from([0,1,255]));
  writeFileSync(join(source,'.htaccess'),'# private fixture');
  assert.equal(snapshotBuild({source,output:snap}).files,3);
  writeFileSync(join(source,'index.html'),'<h1>changed</h1>');
  assert.equal(restoreBuild({snapshot:snap,output:restored}).restored,true);
  assert.equal(readFileSync(join(restored,'index.html'),'utf8'),'<h1>original</h1>');
  assert.deepEqual(readFileSync(join(restored,'assets','file.bin')),Buffer.from([0,1,255]));
  assert.ok(existsSync(join(restored,'assets','empty')));
  assert.throws(()=>restoreBuild({snapshot:snap,output:restored}),/isolated/);
  assert.throws(()=>snapshotBuild({source,output:join(source,'bad')}),/isolated/);
  writeFileSync(join(snap,'site','index.html'),'tampered');
  assert.throws(()=>restoreBuild({snapshot:snap,output:join(root,'bad')}),/integrity/);
  assert.ok(!existsSync(join(root,'bad')));
  if(process.platform!=='win32'){
    symlinkSync(join(source,'index.html'),join(source,'link.html'));
    assert.throws(()=>snapshotBuild({source,output:join(root,'unsafe')}),/Symlink/);
  }
  console.log('PASS: snapshot integrity, original preservation, rollback copy and tamper detection');
}finally{rmSync(root,{recursive:true,force:true});}
