
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
  await p.waitForTimeout(34000);
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(1500);
  const run = async (cmd,ms=2000)=>{
    const s=logs.length;
    await p.evaluate(x=>window.__xash.Cmd_ExecuteString(x),cmd);
    await p.waitForTimeout(ms);
    return logs.slice(s).filter(l=>l.startsWith('[xash-stdout]')).map(l=>l.replace('[xash-stdout] ',''));
  };
  for (const c of ['+toggleconsole','toggleconsole','+showscores','showscores','-showscores','+forward','+duck']) {
    const o = await run(c,1600);
    console.log(`  ${c.padEnd(16)} -> ${o.length? o.join(' | ').slice(0,90) : '(silent)'}`);
  }
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
