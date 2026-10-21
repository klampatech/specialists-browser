
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(22000);
  const r = await p.evaluate(()=>{
    const x = window.__xash;
    const em = x?.em;
    const M = em?.Module;
    return {
      xashCtor: x?.constructor?.name,
      xashOwnKeys: x?Object.keys(x):null,
      emType: typeof em,
      emKeys: em?Object.keys(em).slice(0,30):null,
      ModuleType: typeof M,
      ModuleKeys: M?Object.keys(M).slice(0,40):null,
      rawOnModule: !!(M?.__rawExports),
      rawCount: M?.__rawExports?Object.keys(M.__rawExports).length:0,
      rawOnEm: !!(em?.__rawExports),
      emProto: em?Object.getOwnPropertyNames(Object.getPrototypeOf(em)||{}).slice(0,25):null,
    };
  });
  console.log(JSON.stringify(r,null,2));
  await b.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(2)});
