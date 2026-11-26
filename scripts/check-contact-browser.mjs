import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
const base='http://127.0.0.1:8080',origin='https://vorschau.creaid-media.de';
const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:1440,height:900}});
let calls=0, mode='unavailable', last;
try{
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin){await route.abort();return;}
  if(url.pathname==='/api/contact.php'){
   calls++;last=route.request().postDataJSON();
   await new Promise(r=>setTimeout(r,400));
   if(mode==='network'){await route.abort();return;}
   const response=mode==='accepted'?{code:200,body:{ok:true,status:'accepted'}}:mode==='limit'?{code:429,body:{ok:false,status:'rate_limit'}}:mode==='invalid'?{code:422,body:{ok:false,status:'invalid_fields'}}:{code:503,body:{ok:false,status:'unavailable'}};
   await route.fulfill({status:response.code,contentType:'application/json',body:JSON.stringify(response.body)});return;
  }
  const res=await route.fetch({url:base+url.pathname+url.search,maxRedirects:0});
  await route.fulfill({response:res});
 });
 const page=await context.newPage();
 await page.goto(origin+'/kontakt?service=Webdesign%20%26%20Entwicklung');
 const form=page.locator('#agencyEnquiry'),status=page.locator('#aFormMessage'),fallback=page.locator('#aFormFallback'),submit=form.locator('button[type=submit]');
 await form.waitFor({state:'visible'});
 assert.equal(await form.locator('[name=service]').inputValue(),'Webdesign & Entwicklung');
 assert.equal(await fallback.isVisible(),false);
 await form.locator('[name=name]').fill('QA Kontakt');
 await form.locator('[name=email]').fill('qa@example.invalid');
 await form.locator('[name=message]').fill('Isolierter Test ohne E-Mail-Versand');
 await form.evaluate(el=>el.requestSubmit());
 await form.evaluate(el=>el.dispatchEvent(new Event('submit',{cancelable:true})));
 assert.equal(await submit.isDisabled(),true);
 await page.waitForFunction(()=>document.querySelector('#aFormMessage').textContent.includes('nicht bestätigt'));
 assert.equal(calls,1);
 assert.equal(last.website,'');
 assert.equal(last.service,'Webdesign & Entwicklung');
 assert.equal(await fallback.isVisible(),true);
 assert.match(await fallback.getAttribute('href'),/^mailto:info@creaid-media\.de/);
 assert.equal(await form.locator('[name=message]').inputValue(),'Isolierter Test ohne E-Mail-Versand');
 mode='invalid';
 await form.evaluate(el=>el.requestSubmit());
 await page.waitForFunction(()=>document.querySelector('#aFormMessage').textContent.includes('Angaben'));
 assert.equal(await fallback.isVisible(),false);
 mode='limit';
 await form.evaluate(el=>el.requestSubmit());
 await page.waitForFunction(()=>document.querySelector('#aFormMessage').textContent.includes('Zu viele'));
 assert.equal(await fallback.isVisible(),true);
 mode='network';
 await form.evaluate(el=>el.requestSubmit());
 await page.waitForFunction(()=>document.querySelector('#aFormMessage').textContent.includes('doppelte'));
 assert.equal(await fallback.isVisible(),true);
 mode='accepted';
 await form.evaluate(el=>el.requestSubmit());
 await page.waitForFunction(()=>document.querySelector('#aFormMessage').textContent.includes('erfolgreich'));
 assert.equal(await form.locator('[name=message]').inputValue(),'');
 assert.equal(await fallback.isVisible(),false);
 assert.equal(calls,5);
 console.log('Contact submission browser scenarios passed. Every endpoint response was mocked; no live requests or email sent.');
}finally{await context.close();await browser.close();}
