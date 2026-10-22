
// Does a real left-click spawn us? The port already wires +attack ->
// key_tap -> server_cmd("respawn") on ts30, so if this fails the block is
// gate_open(). Click with the real mouse and watch the server.
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const HOST='100.95.111.112';
const CONSOLE='/tmp/tsds/engine.console';
const srv=(c)=>{try{execSync(`echo ${JSON.stringify(c)} >> ${CONSOLE}`,{timeout:4000})}catch(e){}};
const st=()=>{try{return execSync("grep -E '\\[ts\\]  #5' /tmp/tsds/xash.stdout | tail -2").toString()}catch(e){return''}};
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; p.on('console',m=>logs.push(m.text()));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8&debug=1`,
    {waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(34000);
  await p.click('#canvas',{position:{x:640,y:400}});
  await p.waitForTimeout(2500);
  console.log('--- before click ---'); console.log(st());
  console.log('\n>>> LEFT CLICK (fire) x3');
  for(let i=0;i<3;i++){ await p.mouse.down(); await p.waitForTimeout(140); await p.mouse.up(); await p.waitForTimeout(1400); }
  srv('ts_status'); await new Promise(r=>setTimeout(r,1800));
  console.log('--- after clicks ---'); console.log(st());
  const key=logs.filter(l=>l.includes('attack')).map(l=>l.replace('[xash-stdout] ',''));
  console.log('\nbridge attack lines:'); key.slice(-6).forEach(l=>console.log('  '+l.slice(0,120)));
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/firetospawn.png'});
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
