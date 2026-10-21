
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; p.on('console',m=>logs.push(m.text()));
  await p.goto(`https://${HOST}:5174`,{waitUntil:'domcontentloaded'}).catch(()=>{});
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(34000);
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(400);
  const run = async (cmd,ms=1800)=>{
    const s=logs.length;
    await p.evaluate(x=>window.__xash.Cmd_ExecuteString(x),cmd);
    await p.waitForTimeout(ms);
    return logs.slice(s).filter(x=>x.startsWith('[xash-stdout]')).map(x=>x.replace('[xash-stdout] ',''));
  };
  const show=(l,o)=>{console.log(`\n### ${l}`);console.log(o.length?o.map(x=>'  '+x.slice(0,140)).join('\n'):'  (no output)');};
  show('say (proves ClientCommand path)', await run('say routec_probe_hello',2500));
  show('ts_status (server cmd)', await run('ts_report_time',2000));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
