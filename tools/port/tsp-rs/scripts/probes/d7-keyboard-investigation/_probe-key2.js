
// RIGOROUS keyboard test. My earlier one never verified the bind took.
//   1. bind F9 -> echo
//   2. VERIFY with `bind F9` (prints the binding)
//   3. press F9 as a trusted event
//   4. also press a key bound to something observable
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
  await p.click('#canvas',{position:{x:10,y:10}});   // focus
  await p.waitForTimeout(500);

  async function run(cmd, label){
    const s=logs.length;
    await p.evaluate(x=>window.__xash.Cmd_ExecuteString(x), cmd);
    await p.waitForTimeout(800);
    const out=logs.slice(s).filter(l=>l.x.startsWith('[xash-stdout]')).map(l=>l.x);
    console.log(`${label.padEnd(34)} -> ${out.length?out.map(x=>x.slice(0,90)).join(' | '):'(silent)'}`);
    return out;
  }

  await run('bind F9 "echo SDLKEY_WORKS"', 'bind F9');
  await run('bind F9', 'VERIFY: bind F9 (print)');
  await run('bind F10 "echo F10_WORKS"', 'bind F10');

  // now press them
  const s=logs.length;
  await p.keyboard.press('F9');  await p.waitForTimeout(800);
  await p.keyboard.press('F10'); await p.waitForTimeout(800);
  await p.keyboard.press('Backquote'); await p.waitForTimeout(800);
  const after=logs.slice(s);
  console.log('\n--- after F9 / F10 / Backquote ---');
  console.log(after.filter(l=>/SDLKEY_WORKS|F10_WORKS/.test(l.x)).map(l=>l.x).join('\n')||'(no echo from EITHER key)');
  console.log('any new stdout at all:', after.filter(l=>l.x.startsWith('[xash-stdout]')).length);

  // is the console open after backquote?
  const conOpen = await p.evaluate(()=>{
    // engine draws console; check via cvar-free means: look for a class
    return {consoleVisibleGuess: !!document.querySelector('.conpanel')};
  });
  console.log('console DOM probe:',JSON.stringify(conOpen));

  // Does +jump (SPACE) move us? check IN via a cvar that tracks it
  await run('echo SPACE_BOUND', 'noop');
  const s2=logs.length;
  await p.keyboard.down(' ');
  await p.waitForTimeout(1200);
  await p.keyboard.up(' ');
  await p.waitForTimeout(500);
  console.log('\nstdout while SPACE held:', logs.slice(s2).filter(l=>l.x.startsWith('[xash-stdout]')).map(l=>l.x).join('\n')||'(silent - expected, +jump prints nothing)');

  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
