
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
 const b=await chromium.launch({args:['--no-sandbox']});
 const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
 const p=await c.newPage();
 await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForSelector('#canvas',{timeout:30000});
 await p.waitForTimeout(32000);
 const info = await p.evaluate(()=>{
   const el=document.elementFromPoint(640,400);
   const chain=[];
   let n=el;
   while(n && n!==document.documentElement){
     const cs=getComputedStyle(n);
     const r=n.getBoundingClientRect();
     chain.push({
       tag:n.tagName,
       cls:(n.className||'').toString().slice(0,60),
       pe:cs.pointerEvents, pos:cs.position, z:cs.zIndex,
       rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
       text:(n.textContent||'').trim().slice(0,50),
     });
     n=n.parentElement;
   }
   return {centreChain:chain,
     appChildren:[...document.getElementById('app').children].map(x=>{
       const cs=getComputedStyle(x);const r=x.getBoundingClientRect();
       return x.tagName+'#'+(x.id||'')+'.'+(x.className||'').toString().slice(0,30)+` pe=${cs.pointerEvents} rect=[${Math.round(r.width)}x${Math.round(r.height)}]`;
     })};
 });
 console.log(JSON.stringify(info,null,2));
 await b.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(2)});
