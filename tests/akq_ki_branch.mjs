import { createRequire } from 'node:module'; const require=createRequire(import.meta.url); const { chromium } = require('playwright');
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const dir = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(dir, '..', 'index.html');
let pass=0, fail=0;
const ok=(c,m)=>{ if(c){pass++;console.log('  ok -',m);} else {fail++;console.log('  FAIL -',m);} };

const browser = await chromium.launch({ args:['--allow-file-access-from-files','--disable-web-security'] });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const perr=[]; page.on('pageerror',e=>perr.push(String(e)));

// Azure mock state is switched per test via `mode`
let mode='ok';
await page.route('**/openai/**', route=>{
  if(mode==='err'){ return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:{message:'boom'}})}); }
  if(mode==='empty'){ return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({choices:[{message:{content:''}}]})}); }
  const arr=[{name:'Muster GmbH',website:'muster.de',ort:'Berlin',begruendung:'passt'},{name:'Beispiel AG',website:'beispiel.de',ort:'Köln',begruendung:'passt'}];
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({choices:[{message:{content:JSON.stringify(arr)}}]})});
});

// Seed full state (azure config + a target branche) into localStorage before the app loads.
await page.addInitScript(()=>{
  const st={
    companies:[],
    azure:{endpoint:'https://unit.test.openai.azure.com',deployment:'gpt-test',apiKey:'k-test',apiVersion:'2024-10-21'},
    settings:{akquise:{branchen:[{id:'BTEST',name:'Testbranche',passt:'Grund',aktiv:true}],firmen:[],produkt:'Tender AI'}}
  };
  try{ localStorage.setItem('also-crm-intelligence-fixed-v1', JSON.stringify(st)); }catch(e){}
});

await page.goto(url);
await page.waitForFunction(()=>typeof window.akqStore==='function' && typeof window.akqKiFirmenFinden==='function');
await page.waitForFunction(()=>window.akqStore().branchen.some(b=>b.id==='BTEST'));

// Test 1: success — akqKiFirmenFinden returns >0 and adds firms
mode='ok';
const r1 = await page.evaluate(async()=>{ const n=await window.akqKiFirmenFinden('BTEST'); return {n, firms: window.akqStore().firmen.filter(f=>f.branchenId==='BTEST').map(f=>f.name)}; });
ok(r1.n===2, 'success: 2 firms returned (got '+r1.n+')');
ok(r1.firms.includes('Muster GmbH')&&r1.firms.includes('Beispiel AG'), 'success: firms stored');

// Test 2: empty/unreadable Azure content -> 0 added, parse-warning logged
mode='empty';
const r2 = await page.evaluate(async()=>{ const n=await window.akqKiFirmenFinden('BTEST'); return {n}; });
ok(r2.n===0, 'empty: 0 firms returned (got '+r2.n+')');

// Test 3: Azure error -> akqKiFirmenFinden throws (surfaced by caller)
mode='err';
const r3 = await page.evaluate(async()=>{ try{ await window.akqKiFirmenFinden('BTEST'); return {threw:false}; }catch(e){ return {threw:true,msg:(e&&e.message)||String(e)}; } });
ok(r3.threw===true, 'error: akqKiFirmenFinden throws so caller can surface it');

// Test 4+5: end-to-end caller akqKiBranchenSuche surfaces the real cause via toast
await page.click('[data-view="akquise"]');
await page.waitForSelector('[data-bsuche="BTEST"]');
await page.check('[data-bsuche="BTEST"]');

mode='err';
await page.evaluate(()=>window.akqKiBranchenSuche());
const t4 = (await page.textContent('#toast'))||'';
ok(/KI-Fehler/.test(t4), 'caller surfaces Azure error as "KI-Fehler" (got: '+t4+')');

mode='empty';
await page.waitForSelector('[data-bsuche="BTEST"]'); // panel re-rendered after render()
await page.check('[data-bsuche="BTEST"]');
await page.evaluate(()=>window.akqKiBranchenSuche());
const t5 = (await page.textContent('#toast'))||'';
ok(/Azure-Antwort leer|Verbindung testen/.test(t5), 'caller surfaces empty response with Azure hint (got: '+t5+')');

ok(perr.length===0, 'no page errors ('+perr.join('|')+')');

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
