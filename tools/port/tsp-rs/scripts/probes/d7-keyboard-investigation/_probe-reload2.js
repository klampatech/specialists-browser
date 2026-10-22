
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; p.on('console',m=>logs.push(m.text()));
  let oom=false; p.on('pageerror',e=>{ if(String(e.message).includes('OOM')) oom=true; });
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,
    {waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(32000);
  await p.click('#canvas',{position:{x:640,y:400}});
  await p.waitForTimeout(1000);
  const q=async(c,ms=1400)=>{
    const s=logs.length;
    await p.evaluate(x=>window.__xash.Cmd_ExecuteString(x),c).catch(()=>{});
    await p.waitForTimeout(ms);
    const o=logs.slice(s).filter(l=>l.startsWith('[xash-stdout]')).map(l=>l.replace('[xash-stdout] ',''));
    return o.join(' | ').slice(0,120)||'(silent)';
  };
  console.log('cmdlist grep reload:', await q('cmdlist',2200).then(s=>s.slice(0,100)));
  const all = await p.evaluate(()=>{
    window.__xash.Cmd_ExecuteString('cmdlist');
    return 1;
  }).catch(()=>0);
  await p.waitForTimeout(2000);
  const lines = logs.filter(l=>l.includes('reload')).map(l=>l.replace('[xash-stdout] ',''));
  console.log('reload lines in cmdlist:', lines.length? lines.join(' / ').slice(0,220) : '(none)');
  console.log('\n+reload only, no release:', await q('+reload'), '| OOM:', oom);
  await b.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(2)});
