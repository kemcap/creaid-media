import assert from 'node:assert/strict';
import {canonicalPageLinks} from './canonical-page-links.mjs';
const tests=[
 ['<a href="/leistungen/webdesign?qa=1&amp;test=2#details">A</a>','<a href="/webdesign?qa=1&amp;test=2#details">A</a>'],
 ["<a href='/webdesign/'>A</a>","<a href='/webdesign'>A</a>"],
 ['<a href="http://www.creaid-media.de/branding.html">A</a>','<a href="/grafikdesign-2">A</a>'],
 ['<a href="/kontakt?service=Webdesign%20%26%20Entwicklung#anfrage">A</a>','<a href="/kontakt?service=Webdesign%20%26%20Entwicklung#anfrage">A</a>'],
 ['<a href="#details">A</a>','<a href="#details">A</a>'],
 ['<a href="https://other.example/webdesign/">A</a>','<a href="https://other.example/webdesign/">A</a>'],
 ['<a href="/assets/demos/demo.html">A</a>','<a href="/assets/demos/demo.html">A</a>'],
 ['<script>const t=\'<a href="/branding.html">A</a>\';</script>','<script>const t=\'<a href="/branding.html">A</a>\';</script>'],
 ['<a data-href="/branding.html" href="/webdesign/">A</a>','<a data-href="/branding.html" href="/webdesign">A</a>'],
 ['<form action="/kontakt"><button>Send</button></form>','<form action="/kontakt"><button>Send</button></form>'],
 ['<a href="/unmapped">A</a>','<a href="/unmapped">A</a>'],
 ['<link rel="canonical" href="https://creaid-media.de/webdesign">','<link rel="canonical" href="https://creaid-media.de/webdesign">']
];
for(const [input,expected] of tests)assert.equal(canonicalPageLinks(input),expected);
console.log('PASS: '+tests.length+' scoped internal link transformation cases.');
