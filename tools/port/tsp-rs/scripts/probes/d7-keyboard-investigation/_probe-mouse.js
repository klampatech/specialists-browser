
// Is mousedown reaching the canvas, and is the bridge's handler installed?
// DOM-level positive control, per the discipline.
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const HOST='100.95.111.112';
const CONSOLE='/tmp/tsds/engine.console';
const srv=(c)=>{try{execSync(`echo ${JSON.stringify(c)} >> ${CONSOLE}`,{timeout:4000})}catch(e){}};
const st=()=>{try{return execSync("grep -E '\\[ts\\]  #5' /tmp/tsds/xash.stdout | tail -1").toString().trim()}catch(e){return''}};
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
  await p.waitForTimeout(2000);

  // POSITIVE CONTROL: does mousedown fire on the canvas at all?
  await p.evaluate(()=>{
    window.__md=[]; window.__mdcanvas=[];
    document.addEventListener('mousedown',e=>window.__md.push(e.target.id||e.target.tagName),true);
    const c=document.getElementById('canvas');
    if(c) c.addEventListener('mousedown',()=>window.__mdcanvas.push(1));
  });
  await p.mouse.down(); await p.waitForTimeout(200); await p.mouse.up();
  await p.waitForTimeout(1200);
  console.log('DOM mousedown saw:', await p.evaluate(()=>window.__md.join(',')));
  console.log('canvas listener saw:', await p.evaluate(()=>window.__mdcanvas.length));
  console.log('bridge installed?', logs.filter(l=>l.includes('bridges installed')).map(l=>l.replace('[xash-stdout] ','')).join('|')||'(not logged)');
  console.log('pointerLock:', await p.evaluate(()=>document.pointerLockElement?.id ?? 'none'));
  console.log('\nbefore:', st());
  await p.mouse.down(); await p.waitForTimeout(150); await p.mouse.up();
  await p.waitForTimeout(2500);
  srv('ts_status'); await new Promise(r=>setTimeout(r,1500));
  console.log('after :', st());
  const atk=logs.filter(l=>l.toLowerCase().includes('attack')).map(l=>l.replace('[xash-stdout] ',''));
  console.log('attack lines:', atk.slice(-4).join(' | ').slice(0,160)||'(none)');
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
