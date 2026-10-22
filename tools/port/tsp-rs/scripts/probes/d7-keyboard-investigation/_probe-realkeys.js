
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
  const q = (cmd) => p.evaluate(c=>window.__xash.Cmd_ExecuteString(c), cmd);
  const out = (s)=>logs.slice(s).filter(l=>l.startsWith('[xash-stdout]')).map(l=>l.replace('[xash-stdout] ',''));

  // REAL KEY TEST: press the actual Backquote key through the DOM, with a
  // DOM-level positive control so we know the handler is installed.
  await p.evaluate(()=>{ window.__domkeys=[]; window.addEventListener('keydown',e=>window.__domkeys.push(e.code)); });
  await p.keyboard.press('Backquote');
  await p.waitForTimeout(1200);
  console.log('DOM saw keys:', await p.evaluate(()=>window.__domkeys.join(',')));
  const k = logs.filter(l=>l.includes('[key] DOWN code=Backquote'));
  console.log('bridge log:', k.map(l=>l.replace('[xash-stdout] ','')).join('|').slice(0,200) || '(none)');
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/backquote.png'});

  // Same for Tab
  await p.evaluate(()=>{ window.__domkeys=[]; });
  await p.keyboard.press('Tab');
  await p.waitForTimeout(1200);
  console.log('Tab DOM saw:', await p.evaluate(()=>window.__domkeys.join(',')));
  const k2 = logs.filter(l=>l.includes('[key] DOWN code=Tab'));
  console.log('Tab bridge log:', k2.map(l=>l.replace('[xash-stdout] ','')).join('|').slice(0,200) || '(none)');
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/tab.png'});
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
