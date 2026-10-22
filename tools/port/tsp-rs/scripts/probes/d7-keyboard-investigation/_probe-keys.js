
// Kyle reports the game console shows keybind errors when pressing weapon
// slot keys -- i.e. keys ARE arriving somewhere. Isolate WHERE:
//   (a) does the ENGINE's own key path fire, or
//   (b) is our keyboard-bridge exec'ing commands (which would print errors)?
// Also: does bindlist actually contain the slot binds?
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; p.on('console',m=>logs.push({t:m.type(),x:m.text()}));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(34000);
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(600);

  // 1. bindlist: do the slot binds exist?
  let s=logs.length;
  await p.evaluate(()=>window.__xash.Cmd_ExecuteString('bindlist'));
  await p.waitForTimeout(2500);
  const bl=logs.slice(s).filter(l=>l.x.startsWith('[xash-stdout]')).map(l=>l.x.replace('[xash-stdout] ',''));
  console.log('=== bindlist: slot/weapon binds ===');
  bl.filter(l=>/slot|\bweapon\b|1\s|2\s|3\s|4\s/.test(l)).slice(0,18).forEach(l=>console.log('  '+l.slice(0,100)));
  console.log('  (total bindlist lines: '+bl.length+')');

  // 2. Press digit keys and capture EVERYTHING the engine says.
  s=logs.length;
  for (const k of ['Digit1','Digit2','Digit3','Digit4']) {
    await p.keyboard.press(k); await p.waitForTimeout(700);
  }
  await p.waitForTimeout(1200);
  const after=logs.slice(s);
  console.log('\n=== after pressing 1 2 3 4 (ALL console output) ===');
  after.forEach(l=>console.log(`  [${l.t}] ${l.x.slice(0,150)}`));

  // 3. Is OUR bridge the source? Check if it is installed and active.
  const bridge = await p.evaluate(()=>{
    // our keyboard-bridge logs nothing, so check for the Cmd_ExecuteString wrapper
    return { hasKeyboardBridgeGlobal: typeof window.__kb, keys: Object.keys(window).filter(k=>/bridge|keyboard/i.test(k)) };
  });
  console.log('\n=== bridge globals ===', JSON.stringify(bridge));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
