import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { chromium } from 'playwright';

const code = ts.transpileModule(readFileSync('src/lib/draggable-loop.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText.replace('export function', 'function');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setContent(`<style>.row{width:600px;overflow:hidden;touch-action:pan-y}.track{display:flex;width:max-content}.half{display:flex;width:1200px}a{display:block;width:120px;height:100px;background:purple}</style>
    ${[0,1].map(i => `<div class="row" id="row${i}"><div class="track">${[0,1].map(()=>`<div class="half">${Array.from({length:10},()=>'<a href="#profile">Photo</a>').join('')}</div>`).join('')}</div></div>`).join('')}`);
  await page.addScriptTag({ content: code + `
    window.cleanups = [...document.querySelectorAll('.row')].map((row,i)=>attachDraggableLoop(row,row.firstElementChild,Boolean(i)));
    window.clicks=0;document.addEventListener('click',e=>{e.preventDefault();window.clicks++});` });
  const x = () => page.locator('#row0 .track').evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
  await page.mouse.move(200, 50);
  await page.waitForTimeout(100);
  const before = await x();
  await page.waitForTimeout(150);
  assert.ok(await x() < before, 'Hover must not pause');
  await page.mouse.down();
  await page.mouse.move(100, 50, {steps:5});
  const released = await x();
  await page.mouse.up();
  assert.equal(await page.evaluate(()=>window.clicks),0,'Dragging must not activate links');
  assert.ok(Math.abs((await x())-released)<10,'Release must not reset the position');
  await page.waitForTimeout(150);
  assert.ok(await x()<released,'Loop must continue after release');
  await page.mouse.click(200,50);
  assert.equal(await page.evaluate(()=>window.clicks),1,'A normal click must still work');
  const bottom = () => page.locator('#row1 .track').evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
  const bottomBefore=await bottom();
  await page.waitForTimeout(100);
  assert.ok(await bottom()>bottomBefore,'Bottom row must move right');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(50);
  const stopped=await x();
  await page.waitForTimeout(100);
  assert.equal(await x(),stopped,'Reduced motion stops automatic movement');
  await page.evaluate(()=>window.cleanups.forEach(fn=>fn()));
  console.log('PASS: hover, drag, continuous release, click suppression, normal links, reverse direction, reduced motion');
} finally { await browser.close(); }
