import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const origin='https://vorschau.creaid-media.de';
 const res=await page.goto(origin+'/kontakt?qa=live-send-'+Date.now(),{waitUntil:'load',timeout:30000});
 assert.equal(res.status(),200);
 const form=page.locator('#agencyEnquiry');
 await form.waitFor({state:'visible'});
 const button=form.locator('button[type=submit]');
 assert.match(await button.innerText(),/Anfrage senden/);
 await form.locator('[name=name]').fill('CreAid-Media Live-Funktionstest');
 await form.locator('[name=email]').fill('formular@creaid-media.de');
 await form.locator('[name=message]').fill('INTERNER TECHNISCHER BROWSERTEST – keine Kundenanfrage. Keine Antwort erforderlich.');
 assert.equal(await form.locator('[name=website]').inputValue(),'');
 // A single real submit; no retry or second send on an uncertain outcome.
 const responsePromise=page.waitForResponse(r=>r.url()===origin+'/api/contact.php'&&r.request().method()==='POST',{timeout:30000});
 await button.click({timeout:10000});
 const response=await responsePromise;
 let result;try{result=await response.json()}catch{result={status:'non_json'};}
 console.log('LIVE_SUBMISSION_RESPONSE '+JSON.stringify({http:response.status(),status:typeof result.status==='string'&&/^[a-z_]+$/.test(result.status)?result.status:'unexpected',ok:result.ok===true}));
 await page.waitForFunction(()=>!document.querySelector('#agencyEnquiry').hasAttribute('aria-busy'),{},{timeout:10000});
 const status=await page.locator('#aFormMessage').innerText();
 console.log('LIVE_SUBMISSION_UI '+status.slice(0,300));
 assert.equal(response.status(),200);
 assert.equal(result.ok,true);
 assert.equal(result.status,'accepted');
 assert.match(status,/erfolgreich/);
 assert.equal(await form.locator('[name=message]').inputValue(),'');
 console.log('LIVE_BROWSER_SMTP_ACCEPTED: one internal test, not a customer enquiry; mailbox delivery must be checked separately.');
}finally{await browser.close();}
