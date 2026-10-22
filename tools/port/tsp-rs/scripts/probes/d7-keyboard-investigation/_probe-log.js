
// Verify: (1) spam gone by default, (2) ?debug=1 shows key logs,
// (3) what actually happens on digit keys.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
async function run(url, label, keys){
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; p.on('console',m=>logs.push(m.text()));
  await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(33000);
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(600);
  const s=logs.length;
  for(const k of keys){ await p.keyboard.press(k); await p.waitForTimeout(800); }
  await p.waitForTimeout(1200);
  const after=logs.slice(s);
  const total=after.length;
  const bridge=after.filter(l=>l.includes('[bridge-send]')||l.includes('[bridge-recv]')).length;
  console.log(`\n=== ${label} ===`);
  console.log(`  console lines during 3 keypresses: ${total}  (bridge spam: ${bridge})`);
  after.slice(0,26).forEach(l=>console.log('   '+l.slice(0,135)));
  await b.close();
  return {total, bridge};
}
(async()=>{
  const base=`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`;
  const r1=await run(base, 'DEFAULT (no ?debug)', ['Digit1','Digit2','KeyB']);
  const r2=await run(base+'&debug=1', '?debug=1', ['Digit1','Digit2','KeyB']);
  console.log('\n=== SUMMARY ===');
  console.log(`  default: ${r1.total} lines / ${r1.bridge} bridge`);
  console.log(`  ?debug=1: ${r2.total} lines / ${r2.bridge} bridge`);
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
