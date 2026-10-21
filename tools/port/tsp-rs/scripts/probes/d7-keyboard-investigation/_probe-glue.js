
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  // capture the actual glue source the browser fetched
  let glueSrc=null;
  p.on('response', async r=>{
    if (/generated\/xash\.js/.test(r.url())) {
      try { glueSrc = await r.text(); } catch(e){}
    }
  });
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(20000);

  console.log('glue fetched:', glueSrc? glueSrc.length+' bytes' : 'NOT CAPTURED');
  if (glueSrc) {
    console.log('glue contains __rawExports:', glueSrc.includes('__rawExports'));
    const i = glueSrc.indexOf('function assignWasmExports');
    console.log('glue assignWasmExports:', glueSrc.slice(i, i+120));
  }

  const r = await p.evaluate(()=>{
    // Search for the marker anywhere reachable
    const hits=[];
    for (const k of Object.keys(window)) {
      try {
        const v = window[k];
        if (v && typeof v==='object') {
          if (v.__rawExports) hits.push('window.'+k+'.__rawExports ('+Object.keys(v.__rawExports).length+')');
          if (v.Module && v.Module.__rawExports) hits.push('window.'+k+'.Module.__rawExports ('+Object.keys(v.Module.__rawExports).length+')');
        }
      } catch(e){}
    }
    const M = window.__xash?.em?.Module;
    return {
      hits,
      // What object does assignWasmExports see as Module? Find a known binding.
      hasCmdExec: typeof M?._Cmd_ExecuteString,
      emIsModule: window.__xash?.em === M,
      emCtor: window.__xash?.em?.constructor?.name,
      emHasModuleProp: 'Module' in (window.__xash?.em||{}),
    };
  });
  console.log(JSON.stringify(r,null,2));
  await b.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(2)});
