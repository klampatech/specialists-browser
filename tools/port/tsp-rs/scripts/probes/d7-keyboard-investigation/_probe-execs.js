
// Instrument Cmd_ExecuteString to see EXACTLY what the keyboard/mouse
// bridge sends, and whether it sends anything at all on click.
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

  // Wrap Cmd_ExecuteString so we can see every bridge-issued command
  await p.evaluate(()=>{
    window.__execs=[];
    const inst = window.__xash;
    const orig = inst.Cmd_ExecuteString.bind(inst);
    inst.Cmd_ExecuteString = (cmd)=>{ window.__execs.push(cmd); return orig(cmd); };
  });

  const canvasState = await p.evaluate(()=>{
    const c=document.getElementById('canvas');
    if(!c) return {noCanvas:true};
    return {
      canvasPresent:true,
      tabindex:c.tabIndex,
      pointerEvents:getComputedStyle(c).pointerEvents,
      rect:(()=>{const r=c.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];})(),
    };
  });
  console.log('canvas:',JSON.stringify(canvasState));

  // click the canvas
  const before = await p.evaluate(()=>window.__execs.length);
  await p.mouse.click(640,400);
  await p.waitForTimeout(700);
  const after = await p.evaluate(()=>window.__execs.slice(-20));
  console.log('\nexecs after canvas click:', JSON.stringify(after));

  // press keys
  await p.keyboard.down('w'); await p.waitForTimeout(300);
  const held = await p.evaluate(()=>window.__execs.slice(-10));
  console.log('execs while W held:', JSON.stringify(held));
  await p.keyboard.up('w'); await p.waitForTimeout(300);
  const rel = await p.evaluate(()=>window.__execs.slice(-6));
  console.log('execs after W release:', JSON.stringify(rel));

  // alert count
  const alerts = await p.evaluate(()=>({
    // can't read past console; count from logs below
  }));
  console.log('\nxash-alert lines in log:', logs.filter(l=>/xash-alert/.test(l.x)).length);
  logs.filter(l=>/xash-alert/.test(l.x)).slice(0,6).forEach(l=>console.log('  '+l.x.slice(0,160)));

  // full bindlist head
  const s=logs.length;
  await p.evaluate(()=>window.__xash.Cmd_ExecuteString('bindlist'));
  await p.waitForTimeout(1500);
  const bl = logs.slice(s).filter(l=>l.x.startsWith('[xash-stdout]')).map(l=>l.x);
  console.log('\n=== bindlist (first 25) ===');
  console.log(bl.slice(0,25).join('\n'));

  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
