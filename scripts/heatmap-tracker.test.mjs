import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {chromium} from 'playwright';
const code=ts.transpileModule(readFileSync('src/hooks/useHeatmapTracker.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:390,height:800}});
  await page.goto('about:blank');
  await page.setContent('<a href="#test" style="display:block;height:100px">Public link</a><form><input value="PRIVATE TEXT"><a href="#private">Private form</a></form>');
  await page.addScriptTag({content:`
    window.calls=[]; window.allowed=true; window.staff=false;
    const exports={};
    const require=(name)=>{
      if(name==='react')return {useEffect:fn=>{window.cleanup=fn()}};
      if(name==='next/navigation')return {usePathname:()=>'/test'};
      if(name.includes('useCookieConsent'))return {useCookieConsent:()=>({consentData:{hasConsented:allowed,preferences:{analytics:allowed}}})};
      if(name.includes('useUserRoles'))return {useUserRoles:()=>({loading:false,error:null,canAccessAdmin:staff,canAccessModerator:false})};
      if(name.includes('supabase'))return {supabase:{rpc:(name,args)=>{calls.push({name,args});return Promise.resolve({error:null})}}};
    };
    if(!crypto.randomUUID)crypto.randomUUID=()=> '00000000-0000-4000-8000-000000000321';
    ${code}
    window.start=exports.useHeatmapTracker;
    document.addEventListener('click',event=>event.preventDefault());
    start();
  `});
  await page.locator('body > a').click();
  const calls=await page.evaluate(()=>calls);
  assert.equal(calls.length,1);
  assert.equal(calls[0].args.p_device,'mobile');
  assert.deepEqual(Object.keys(calls[0].args.p_clicks[0]).sort(),['height','width','x','y']);
  await page.waitForTimeout(170);
  await page.locator('form a').click();
  assert.equal(await page.evaluate(()=>calls.length),1,'Forms excluded');
  await page.evaluate(()=>{cleanup();allowed=false;start()});
  await page.locator('body > a').click();
  assert.equal(await page.evaluate(()=>calls.length),1,'No analytics without consent');
  await page.evaluate(()=>{allowed=true;staff=true;start()});
  await page.locator('body > a').click();
  assert.equal(await page.evaluate(()=>calls.length),1,'Team traffic excluded');
  console.log('PASS: real click, mobile classification, coordinate-only payload, form privacy, consent, staff exclusion');
} finally {await browser.close()}
