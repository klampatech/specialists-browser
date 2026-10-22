
// Run the server's own ts_status from the client console. It prints
// observer/alive/dead + iuser flags per player. That answers step 4 of
// the "stuck in Free Chase-Camera" checklist: is the SERVER calling us
// an observer, or is it the client that never left observer?
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; p.on('console',m=>logs.push(m.text()));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8&debug=1`,
    {waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(36000);
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(700);
  const run = async (cmd,ms=2500)=>{
    const s=logs.length;
    await p.evaluate(x=>window.__xash.Cmd_ExecuteString(x),cmd);
    await p.waitForTimeout(ms);
    return logs.slice(s).filter(l=>l.startsWith('[xash-stdout]')).map(l=>l.replace('[xash-stdout] ',''));
  };
  console.log('=== ts_status (server side) ===');
  (await run('ts_status', 3000)).forEach(l=>console.log('  '+l.slice(0,220)));
  console.log('\n=== again after 6s (see round state) ===');
  await p.waitForTimeout(6000);
  (await run('ts_status', 3000)).forEach(l=>console.log('  '+l.slice(0,220)));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
