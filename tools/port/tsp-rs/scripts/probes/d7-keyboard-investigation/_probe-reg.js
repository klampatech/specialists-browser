
// Are the Route C commands actually registered with the engine? Check via
// the engine's own cmdlist, and verify state changes rather than prints.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; p.on('console',m=>logs.push({t:m.type(),x:m.text()}));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(32000);
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(400);

  const run = async (cmd,ms=1600)=>{
    const s=logs.length;
    await p.evaluate(x=>window.__xash.Cmd_ExecuteString(x),cmd);
    await p.waitForTimeout(ms);
    return logs.slice(s).filter(l=>l.x.startsWith('[xash-stdout]')).map(l=>l.x.replace('[xash-stdout] ',''));
  };

  // cmdlist proves registration
  const cl = await run('cmdlist',2000);
  const found = cl.filter(l=>/ts_menu_open|ts_menu_slot|ts_join_team|ts_menu_close|ts_key/.test(l));
  console.log('=== cmdlist: our commands registered? ===');
  console.log(found.length? found.map(x=>'  '+x.slice(0,90)).join('\n') : '  NOT FOUND in cmdlist');
  console.log('  (cmdlist returned ' + cl.length + ' lines total)');

  // unknown-command test: a bogus command prints differently
  const bogus = await run('zzz_not_a_command',1200);
  console.log('\n=== bogus command output (for comparison) ===');
  console.log(bogus.length? bogus.map(x=>'  '+x.slice(0,90)).join('\n') : '  (silent)');
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
