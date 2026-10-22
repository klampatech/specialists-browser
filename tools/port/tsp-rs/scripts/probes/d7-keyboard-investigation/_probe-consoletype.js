
// Discriminate two hypotheses for "console says unknown command":
//  (a) the engine receives the letters as KEY events and runs them as
//      commands because the console's input line never got them
//  (b) something else entirely
// Open the console with a real hold, then press letters, and log both
// what our bridge saw and what the engine printed.
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
  const since = ()=>logs.length;
  const out = (s)=>logs.slice(s).filter(l=>l.startsWith('[xash-stdout]')).map(l=>l.replace('[xash-stdout] ',''));

  // open console with a real hold
  let s = since();
  await p.keyboard.down('Backquote');
  await p.waitForTimeout(1200);
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/console-open.png'});
  await p.keyboard.up('Backquote');
  await p.waitForTimeout(600);
  console.log('--- on open ---'); out(s).forEach(l=>console.log('  '+l.slice(0,110)));

  // now press letters WHILE the console is open
  s = since();
  for (const k of ['KeyZ','KeyX','KeyC','KeyQ']) {
    await p.keyboard.press(k);
    await p.waitForTimeout(700);
  }
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/console-typed.png'});
  console.log('--- after Z X C Q ---');
  const typed = out(s);
  typed.forEach(l=>console.log('  '+l.slice(0,110)));
  if (!typed.length) console.log('  (engine silent)');
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
