import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const bundle=execFileSync('bun',['build','scripts/fixtures/heatmap-preview.tsx','--target','browser'],{encoding:'utf8',maxBuffer:10000000});
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1000,height:900}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://heatmap.test/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/preview')return route.fulfill({contentType:'text/html',body:'<style>html,body{margin:0}header{height:100vh;background:purple}main{height:2000px;background:beige}</style><header>Hero</header><main>Page content</main>'});
    if(url.pathname==='/bundle.js')return route.fulfill({contentType:'text/javascript; charset=utf-8',body:bundle});
    return route.fulfill({contentType:'text/html; charset=utf-8',body:'<meta charset="utf-8"><style>body{margin:0}#root{width:100%}.overflow-y-auto{overflow-y:auto}.overflow-x-hidden{overflow-x:hidden}svg{position:absolute;inset:0;pointer-events:none}</style><div id="root"></div><script src="/bundle.js"></script>'});
  });
  await page.goto('http://heatmap.test/');
  await page.locator('iframe').waitFor();
  await page.waitForTimeout(250);
  const host=page.getByLabel('Prévia rolável do mapa de calor');
  const initial=await host.evaluate(el=>({height:el.scrollHeight,width:el.scrollWidth,client:el.clientWidth}));
  assert.ok(initial.width<=initial.client,'No horizontal scrollbar');
  assert.ok(initial.height<2200,'Viewport-height hero must not grow indefinitely');
  await page.waitForTimeout(600);
  assert.equal(await host.evaluate(el=>el.scrollHeight),initial.height,'Stable page height');
  await host.evaluate(el=>el.scrollTop=700);
  await page.screenshot();
  await page.waitForTimeout(150);
  const position=await page.locator('iframe').evaluate(el=>({y:el.contentWindow.scrollY,height:el.contentDocument.documentElement.scrollHeight,viewport:el.contentWindow.innerHeight}));
  assert.equal(position.viewport,700,'Iframe viewport remains fixed');
  assert.ok(position.y>900,`Preview scroll synchronized: ${JSON.stringify({position,initial,host:await host.evaluate(el=>({top:el.scrollTop,height:el.clientHeight,style:el.getAttribute('style')})),errors})}`);
  async function assertHeatAlignment(width) {
    const state=await page.locator('iframe').evaluate(el=>({y:el.contentWindow.scrollY,height:el.contentDocument.documentElement.scrollHeight}));
    const bounds=await host.boundingBox();
    const scale=await host.evaluate((el,width)=>el.clientWidth/width,width);
    const circle=await page.locator('circle').boundingBox();
    const screenY=circle.y+circle.height/2;
    assert.ok(Math.abs(screenY-(bounds.y+(state.height/2-state.y)*scale))<3,'Heat stays aligned with the same document location');
    return screenY;
  }
  await assertHeatAlignment(1440);
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(200);
  assert.ok(await host.evaluate(el=>el.scrollWidth<=el.clientWidth),'Mobile has no horizontal overflow');
  for(const width of [390,820]) {
    await page.setViewportSize({width:1200,height:900});
    await page.goto(`http://heatmap.test/?width=${width}`);
    await page.locator('iframe').waitFor();
    await page.waitForTimeout(200);
    const bounds=await host.boundingBox();
    assert.equal(bounds.width,width,'Device preview is constrained to its reference width');
    assert.ok(Math.abs(bounds.x-(1200-width)/2)<2,'Device preview is centered');
    const before=await assertHeatAlignment(width);
    await host.evaluate(el=>el.scrollTop=900);
    await page.screenshot();
    await page.waitForTimeout(150);
    const after=await assertHeatAlignment(width);
    assert.ok(Math.abs(before-after-900)<3,'Mobile/tablet heat moves by the scrolled distance instead of staying fixed');
    await host.evaluate(el=>el.scrollTop=650);
    await page.screenshot();
    await page.waitForTimeout(150);
    const back=await assertHeatAlignment(width);
    assert.ok(Math.abs(back-after-250)<3,'Heat returns with upward scrolling');
    await page.setViewportSize({width:320,height:844});
    await page.waitForTimeout(200);
    assert.ok(await host.evaluate(el=>el.scrollWidth<=el.clientWidth),'Small screens scale without horizontal overflow');
    await host.evaluate(el=>el.scrollTop=500);
    await page.screenshot();
    await page.waitForTimeout(150);
    await assertHeatAlignment(width);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: fixed viewport, stable height, centered mobile/tablet frames, no horizontal overflow, synchronized heat point, mobile resize, no browser errors');
} finally {await browser.close()}
