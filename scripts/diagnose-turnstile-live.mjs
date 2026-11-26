import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>console.log('PAGE_ERROR '+e.message.slice(0,240)));
 page.on('console',m=>{const s=m.text();if(/Turnstile challenge error|Cloudflare Turnstile/.test(s))console.log('WIDGET_CONSOLE '+s.slice(0,240));});
 page.on('requestfailed',r=>{if(r.url().includes('challenges.cloudflare.com'))console.log('CHALLENGE_REQUEST_FAILED '+r.failure()?.errorText);});
 await page.goto('https://vorschau.creaid-media.de/kontakt?qa='+Date.now(),{waitUntil:'domcontentloaded',timeout:30000});
 const form=page.locator('#agencyEnquiry');
 await form.waitFor({state:'visible',timeout:15000});
 await form.scrollIntoViewIfNeeded();
 const widget=page.locator('#aTurnstile');
 await widget.waitFor({state:'visible',timeout:15000});
 await page.waitForFunction(()=>!!window.turnstile,{},{timeout:20000});
 await page.waitForTimeout(8000);
 console.log('WIDGET_STATE '+JSON.stringify(await widget.evaluate(el=>({visible:!!el.getClientRects().length,width:Math.round(el.getBoundingClientRect().width),iframes:el.querySelectorAll('iframe').length,tokenPresent:!!document.querySelector('[name="cf-turnstile-response"]')?.value,status:document.querySelector('#aFormMessage')?.textContent}))));
 console.log('WIDGET_FRAME_COUNT '+page.frames().filter(f=>f.url().includes('challenges.cloudflare.com')).length);
 await page.screenshot({path:'turnstile-live.png',fullPage:false});
}finally{await browser.close();}
