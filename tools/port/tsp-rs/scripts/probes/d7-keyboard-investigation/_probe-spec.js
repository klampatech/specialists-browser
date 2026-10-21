
// Last-ditch: try to flip spec mode off via the engine's sv.* / cl.* cvars
// and report whether it actually puts the player in the game.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[];
  p.on('console',m=>logs.push({t:m.type(),x:m.text()}));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(30000);

  const probes = [
    ['cl_spectator', 'cl_spectator'],
    ['cl_spectator 0', 'cl_spectator 0'],
    ['cl_spectator_approved 0', 'cl_spectator_approved 0'],
    ['ts_specmode 0', 'ts_specmode 0'],
    ['spec_mode 0', 'spec_mode 0'],
    ['_specmode 0', '_specmode 0'],
    ['cl_lc 1', 'cl_lc 1'],
    ['cl_loadout 0', 'cl_loadout 0'],
    ['name', 'name'],
    ['ts_menu_select 7', 'ts_menu_select 7'],
    ['jointeam 1', 'jointeam 1'],
    ['impulse 22', 'impulse 22'],  // join class
  ];
  const before = logs.length;
  for (const [lbl, cmd] of probes) {
    const start = logs.length;
    await p.evaluate(c=>window.__xash.Cmd_ExecuteString(c), cmd);
    await p.waitForTimeout(900);
    const out = logs.slice(start).filter(l=>l.x.startsWith('[xash-stdout]')).map(l=>l.x);
    console.log(`${lbl.padEnd(30)} -> ${out.length ? out.join('|') : '(silent)'}`);
  }

  console.log('\n=== ALL xash-stdout tail (post-probes) ===');
  console.log(logs.slice(before).filter(l=>l.x.startsWith('[xash-stdout]')).map(l=>l.x).join('\n')||'(silent)');

  await p.screenshot({path:'/tmp/tsds/after-spec.png'});
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
