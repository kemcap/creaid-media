import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='https://vorschau.creaid-media.de';
const browser=await chromium.launch({headless:true});
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message.slice(0,200)));
  let requests=0;
  await page.route('**/api/contact.php',async route=>{
   requests++;
   const r=route.request();
   const data=r.postDataJSON();
   assert.equal(data.website,'');assert.equal(r.headers()['origin'],origin);
   await route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"status":"accepted"}'});
  });
  try{
   const res=await page.goto(origin+'/kontakt?qa=live-contact-'+Date.now(),{waitUntil:'load',timeout:30000});
   assert.equal(res.status(),200);
   const form=page.locator('#agencyEnquiry');
   await form.waitFor({state:'visible',timeout:10000});
   await form.locator('[name=name]').fill('CreAid Browser QA');
   await form.locator('[name=email]').fill('formular@creaid-media.de');
   await form.locator('[name=message]').fill('Browser-Diagnose ohne E-Mail-Versand');
   const button=form.locator('button[type=submit]');
   console.log(JSON.stringify({viewport:viewport.width,button:await button.innerText(),errors}));
   assert.match(await button.innerText(),/Anfrage senden/);
   await button.click({timeout:12000});
   await page.waitForFunction(()=>document.querySelector('#aFormMessage').textContent.includes('erfolgreich'),{},{timeout:10000});
   assert.equal(requests,1);
   assert.equal(await form.locator('[name=message]').inputValue(),'');
   console.log('LIVE_BROWSER_OK '+viewport.width);
  }catch(e){
   const button=page.locator('#agencyEnquiry button[type=submit]');
   if(await button.count()) console.log(JSON.stringify(await button.evaluate(el=>{const r=el.getBoundingClientRect();const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {button:el.textContent,rect:{x:r.x,y:r.y,w:r.width,h:r.height},hit:top?.tagName,hitClass:top?.className,status:document.querySelector('#aFormMessage')?.textContent};})));
   console.log(JSON.stringify({viewport:viewport.width,errors,requests}));
   await page.screenshot({path:'contact-live-'+viewport.width+'.png',fullPage:true});
   throw e;
  }finally{await context.close();}
 }
 const get=await fetch(origin+'/api/contact.php',{redirect:'manual',cache:'no-store'});
 const g=await get.json();console.log('GET endpoint',get.status,g.status);assert.equal(get.status,405);
 const post=await fetch(origin+'/api/contact.php',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://invalid.example'},body:'{}',redirect:'manual'});
 const p=await post.json();console.log('Wrong-origin endpoint',post.status,p.status);assert.equal(post.status,403);assert.equal(p.status,'origin');
 console.log('LIVE_CONTACT_DIAGNOSTIC_OK: no email sent.');
}finally{await browser.close();}
