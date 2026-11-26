import assert from 'node:assert/strict';
import {suggestBalanced} from './suggest-balanced.mjs';
const audit={mode:'static-build-audit',pages:[],assets:[
 {path:'/assets/base.css',bytes:12000,pages:100},
 {path:'/assets/huge.jpg',bytes:240000,pages:2},
 {path:'/assets/photo.webp',bytes:180000,pages:5},
 {path:'/assets/small.js',bytes:100,pages:100},
 {path:'/assets/already.min.js',bytes:180000,pages:100},
 {path:'/assets/../secret.css',bytes:999999,pages:100},
 {path:'/assets/bad.sha256-abc.css',bytes:999999,pages:100}
]};
const p=suggestBalanced(audit);
assert.deepEqual(p.config.optimize.files,['assets/base.css','assets/photo.webp']);
assert.deepEqual(p.config.responsive.images,['assets/photo.webp','assets/huge.jpg']);
assert.equal(p.config.responsive.integrate,undefined);
assert.equal(p.config.hints,undefined);
assert.deepEqual(suggestBalanced({...audit,assets:[]}).config,{schemaVersion:1});
assert.throws(()=>suggestBalanced({}),/Expected original/);
console.log('PASS: Balanced proposal prioritizes eligible assets and never guesses sizes or delays scripts');
