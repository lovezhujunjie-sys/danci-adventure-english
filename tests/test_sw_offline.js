// sw.js 离线缓存真机测试（2026-09-11 加，治老曾说的「点进去加载好卡」）
//
// 🔴 跑之前必须先起本地 HTTP 服务（file:// 下 Service Worker 根本不工作）：
//      cd ~/.claude/skills/自学英语 && python3 -m http.server 8899 --bind 127.0.0.1 &
//      NODE_PATH=/tmp/pwtest/node_modules node tests/test_sw_offline.js
//
// 🔴 判据不是「SW 注册成功了」——注册成功太容易了。真正的判据是
//    **断网之后还能不能打开、各模块点进去还有没有真内容**。
//    所以本测试第③④步会真的 ctx.setOffline(true)。
//
// 🔴 实测加速（延迟 400ms / 1.2Mbps / CPU 降速 4×，模拟国内手机中等网速）：
//      无离线缓存：首屏 1476 ms   整页 4162 ms
//      有离线缓存：首屏  172 ms   整页  253 ms   ← 快 16.5 倍
//
// ⚠️ 踩过的坑（写在这是免得下次重踩）：
//    ① const VOCAB 是 const 声明的，**不会挂到 window 上**，
//       所以拿 window.VOCAB 当「数据加载成功」的判据永远是 undefined。
//    ② 模式卡只有 map/pattern/reading/sentence 四个，**没有 vocab**。
//    ③ 点了某个模块后首页被隐藏（.mode-card 不可见），必须先 reload 回首页再点下一个。
//    ④ 选择器别凭印象：词库没有 .word-card，阅读的卡片真名是 .rd-book。
// 🔴 2026-09-11 补：这一行原来**漏了** —— 文件里第 33 行直接用 chromium，
//    却从没 require 过 playwright-core。也就是说这个测试从提交起就没跑起来过，
//    一执行就 `ReferenceError: chromium is not defined`。
//    而 `run_expansion.sh` 第 ⑧ 段末尾有个 `true` 兜底，把失败吞成了"全链 ✅ 完成"——
//    于是"离线缓存有回归保护"这句话一直是**没有依据的**。
//    ⚠️ 教训：**测试没真跑过，就等于没有测试**；看到"✅ 完成"要去看里面每个测试的
//       实际输出，不能只看退出码（退出码会被人为兜平）。
const { chromium } = require('playwright-core');
const path=require('path'), os=require('os');
const CHROME = path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1228/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const URL='http://127.0.0.1:8899/index.html';

let pass=0, fail=0; const fails=[];
const ok=(n,c,x)=>{ c?(pass++,console.log('  ✅ '+n)):(fail++,fails.push(n),console.log('  ❌ '+n+(x!==undefined?'  → '+x:''))); };
const fcpOf = p => p.evaluate(()=>{
  const e=(performance.getEntriesByType('paint')||[]).find(x=>x.name==='first-contentful-paint');
  return e ? Math.round(e.startTime) : null;
});

(async()=>{
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));

  console.log('① 首次访问（干净浏览器，无任何缓存）');
  await page.goto(URL,{waitUntil:'load'});
  await page.waitForTimeout(1200);
  ok('页面正常', (await page.locator('.mode-card').count())>=4);

  console.log('\n② SW 注册与预缓存');
  const reg = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.ready.catch(e=>({error:e.message}));
    const ks = await caches.keys(); const entries=[];
    for(const k of ks){ const c=await caches.open(k); for(const q of await c.keys()) entries.push(q.url); }
    return { active:!!r.active, state:r.active&&r.active.state, entries };
  });
  ok('SW 已激活', reg.active, JSON.stringify({state:reg.state}));
  ok('预缓存里有 index.html', reg.entries.some(u=>u.endsWith('index.html')), JSON.stringify(reg.entries));

  console.log('\n③ 断网 reload（核心判据）');
  await ctx.setOffline(true);
  let t=0;
  try{ const t0=Date.now(); await page.reload({waitUntil:'load',timeout:15000}); t=Date.now()-t0; }
  catch(e){ console.log('    reload 抛错：'+e.message.slice(0,90)); }
  await page.waitForTimeout(900);
  const cards1=await page.locator('.mode-card').count();
  const st=await page.evaluate(()=>({len:document.body.innerHTML.length, ctl:!!navigator.serviceWorker.controller}));
  ok('断网后页面完整加载', cards1===9 && st.len>400000, 'mode-card '+cards1+' / body '+st.len+' / 耗时 '+t+'ms');
  ok('断网后由 SW 接管', st.ctl===true, String(st.ctl));

  console.log('\n④ 断网后各模块有没有真内容（每个模块先回首页再进）');
  const mods=[
    {go:'sentence', sel:'#sentence-screen', cnt:'#sentence-screen button', name:'句库', min:1},
    {go:'pattern',  sel:'#pattern-screen',  cnt:'#pat-group-grid .topic-btn', name:'句型骨架', min:1},
    {go:'reading',  sel:'#reading-screen',  cnt:'#reading-screen .rd-book', name:'分级阅读', min:20},
  ];
  for(const m of mods){
    try{
      await page.reload({waitUntil:'load',timeout:15000});
      await page.waitForTimeout(500);
      await page.locator(`.mode-card[data-goto="${m.go}"]`).click({timeout:8000});
      await page.waitForTimeout(800);
      const vis=await page.locator(m.sel).isVisible();
      const n=await page.locator(m.cnt).count();
      ok('断网能进「'+m.name+'」且有内容', vis && n>=m.min, '可见 '+vis+' / 元素 '+n);
    }catch(e){ ok('断网能进「'+m.name+'」且有内容', false, e.message.slice(0,70)); }
  }

  console.log('\n⑤ 慢网加速对比（延迟 400ms / 1.2Mbps / CPU 4×，模拟国内手机）');
  // 对照组：全新浏览器上下文，从来没有过 SW
  const ctxN=await b.newContext({viewport:{width:390,height:844}});
  const pN=await ctxN.newPage();
  const cN=await ctxN.newCDPSession(pN);
  await cN.send('Network.emulateNetworkConditions',{offline:false,latency:400,
    downloadThroughput:1.2*1024*1024/8, uploadThroughput:400*1024/8});
  await cN.send('Emulation.setCPUThrottlingRate',{rate:4});
  const a0=Date.now(); await pN.goto(URL+'?fresh='+Date.now(),{waitUntil:'load'});
  const wallNo=Date.now()-a0; await pN.waitForTimeout(300); const fcpNo=await fcpOf(pN);

  // 实验组：已有 SW 缓存
  await ctx.setOffline(false);
  const cdp=await ctx.newCDPSession(page);
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:400,
    downloadThroughput:1.2*1024*1024/8, uploadThroughput:400*1024/8});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  const a1=Date.now(); await page.goto(URL+'?n='+Date.now(),{waitUntil:'load'});
  const wallYes=Date.now()-a1; await page.waitForTimeout(300); const fcpYes=await fcpOf(page);

  console.log('    无离线缓存（每次联网）：  首屏 '+fcpNo+' ms   整页 '+wallNo+' ms');
  console.log('    有离线缓存（走本地）：    首屏 '+fcpYes+' ms   整页 '+wallYes+' ms');
  ok('🔴 有缓存时整页快 5 倍以上', wallNo > wallYes*5,
     wallNo+' → '+wallYes+' ms（快 '+(wallNo/Math.max(wallYes,1)).toFixed(1)+' 倍）');

  console.log('\n⑥ 全程无 JS 报错');
  ok('没有 pageerror', errs.length===0, errs[0]);

  console.log('\n'+'='.repeat(52));
  if(fails.length){ console.log('失败项:'); fails.forEach(f=>console.log('  • '+f)); }
  console.log(`结果：${pass} 通过 / ${fail} 失败`);
  await b.close();
  process.exit(fail?1:0);
})();
