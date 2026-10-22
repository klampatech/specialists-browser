
// Verify instant commands fire once (not +cmd/-cmd) and that the engine
// actually reacts. Press slot keys and buy.
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
  await p.waitForTimeout(33000);
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(600);
  const s=logs.length;
  for (const k of ['Digit1','Digit2','Digit3','KeyB','KeyR','KeyF']) {
    await p.keyboard.press(k); await p.waitForTimeout(700);
  }
  await p.waitForTimeout(1000);
  const after=logs.slice(s);
  console.log('=== [key] + engine lines ===');
  after.forEach(l=>console.log('  '+l.slice(0,150)));
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/keys-fixed.png'});
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
