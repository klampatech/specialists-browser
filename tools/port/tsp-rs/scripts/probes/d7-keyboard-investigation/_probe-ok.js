
// Probe the OK button click path:
//   - Load page
//   - Wait for connection
//   - Check what is at the OK button's screen position
//   - Click directly on it
//   - Check whether engageInput fired, focus changed, pointer lock engaged

const { chromium } = require('playwright');
const HOST='100.95.111.112';

(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();

  const logs=[];
  const start=Date.now();
  p.on('console',m=>logs.push({at:Date.now()-start,t:m.type(),x:m.text()}));

  console.log('goto connect URL');
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,{waitUntil:'domcontentloaded',timeout:60000});
  await p.waitForSelector('#canvas',{timeout:30000});
  await p.waitForTimeout(25000);
  console.log('connected');

  // The OK button is engine-drawn into the canvas. We DO NOT need
  // to hit it precisely; we just need the engine to react to ANY
  // canvas-relative mousedown. The probe in Phase 5 showed
  // canvas.mousedown fires — what we need now is whether the engine
  // ever sees IN_ATTACK after the click.
  //
  // We click centre-of-canvas which the engine uses for the OK button
  // when one is showing, and is also the area where Fire buttons live.
  const facts = await p.evaluate(()=>{
    const r=document.getElementById('canvas').getBoundingClientRect();
    const cx=Math.round(r.left+r.width/2);
    const cy=Math.round(r.top+r.height/2);
    const okArea={x:Math.round(r.left+200),y:Math.round(r.top+500),w:200,h:50};
    const okCentre={x:okArea.x+okArea.w/2,y:okArea.y+okArea.h/2};
    const okHit=document.elementFromPoint(okCentre.x,okCentre.y);
    return {
      tabindex: document.getElementById('canvas').tabIndex,
      active: document.activeElement?.id || document.activeElement?.tagName,
      lock: document.pointerLockElement?.id || null,
      canvasRect:{w:r.width,h:r.height},
      okHit: okHit ? okHit.tagName+'#'+(okHit.id||'')+'.'+(okHit.className||'').toString().slice(0,30) : null,
      okHitIsCanvas: okHit===document.getElementById('canvas'),
    };
  });
  console.log('FACTS',JSON.stringify(facts));

  // Click on the OK button area
  const okC = { x: facts.okHit?.startsWith? 0 : 320, y: 569 };
  // Actually: from Kyle's screenshot OK is at ~(320, 569) in viewport
  await p.mouse.click(320, 569);
  console.log('clicked OK area');
  await p.waitForTimeout(300);

  const after1 = await p.evaluate(()=>({
    active: document.activeElement?.id || document.activeElement?.tagName,
    lock: document.pointerLockElement?.id || null,
  }));
  console.log('after OK click:',JSON.stringify(after1));

  await p.waitForTimeout(2500);

  // Take a screenshot to confirm whether OK is gone
  await p.screenshot({path:'/tmp/tsds/after-ok-click.png',fullPage:false});
  console.log('screenshot saved');

  // Health after click — did server receive any +attack?
  const h = await fetch(`http://${HOST}:27017/health`).then(r=>r.json()).catch(e=>({error:e.message}));
  console.log('HEALTH', JSON.stringify(h));

  console.log('--- bridging lines that fired ---');
  const bridges = logs.filter(l=>l.t==='log' && /bridge|input|recv|net/.test(l.x));
  console.log(bridges.slice(-25).map(l=>`[${l.at}ms] ${l.x}`).join('\n'));

  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
