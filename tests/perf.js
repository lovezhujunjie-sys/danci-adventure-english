// 手机上打开这个 App 到底要多久？（4 倍 CPU 降速 ≈ 中端安卓机）
// 动机：单文件 559KB 全量内联，手机上首次打开的体感一直没量化过。
//
// 🔴 为什么不用 iframe 量（2026-09-11 修）：原版在 about:blank 页面上建 iframe 指向 file://，
//    然后 await f.onload。Chrome 不允许从非 file 源加载 file:// 子框架，onload 永不触发，
//    page.evaluate 又没有超时 → 整个脚本永久挂起（表现：打完文件体积就卡死）。
//    .catch(() => null) 也救不了：promise 是「永不 settle」，不是 reject。
//    改成直接 page.goto 导航，用 navigation timing 取分段，简单且是真实的首屏路径。
const { chromium } = require('playwright-core');
const path = require('path'), os = require('os'), zlib = require('zlib'), fs = require('fs');

const CHROME = path.join(os.homedir(),
  'Library/Caches/ms-playwright/chromium-1228/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const FILE_ON_DISK = path.join(os.homedir(), '.claude/skills/自学英语/index.html');
const FILE = 'file://' + FILE_ON_DISK;

(async () => {
  const raw = fs.readFileSync(FILE_ON_DISK);
  console.log('文件体积');
  console.log('  裸文件  ' + (raw.length / 1024).toFixed(0) + ' KB');
  console.log('  gzip 后 ' + (zlib.gzipSync(raw).length / 1024).toFixed(0) + ' KB   ← GitHub Pages 实际传输的量');

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);

  for (const rate of [1, 4, 6]) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    await page.goto('about:blank');
    const t0 = Date.now();
    await page.goto(FILE, { waitUntil: 'load', timeout: 180000 });
    const wallMs = Date.now() - t0;
    const nav = await page.evaluate(() => {
      const n = performance.getEntriesByType('navigation')[0];
      return {
        responseEnd: Math.round(n.responseEnd),
        domInteractive: Math.round(n.domInteractive),
        domComplete: Math.round(n.domComplete),
      };
    });
    // 🔴 别拿 domComplete - domInteractive 当「内联 JS 执行时间」（2026-09-11 修）：
    //    domInteractive 是在解析器**跑完所有内联脚本之后**才触发的，
    //    所以那 548KB 脚本的解析执行时间已经算进 domInteractive 里了，
    //    两者之差只有几毫秒，标成「内联 JS 解析执行」是名不副实。
    //    真正能量到的是：HTML 下载完(responseEnd) → 首屏可交互(domInteractive)，这段含解析+执行。
    const bootMs = Math.max(0, nav.domInteractive - nav.responseEnd);
    console.log('\nCPU 降速 ' + rate + '×' + (rate === 1 ? '（本机全速，仅作基准）' : rate === 4 ? '（≈中端安卓机）' : '（≈低端机/老手机）'));
    console.log('  HTML 下载完(responseEnd)         ' + nav.responseEnd + ' ms');
    console.log('  首屏可交互(domInteractive)       ' + nav.domInteractive + ' ms');
    console.log('  ↑ 其中解析+执行内联 JS            ' + bootMs + ' ms   ← 这段才是脚本成本');
    console.log('  全部加载完(domComplete)          ' + nav.domComplete + ' ms');
    console.log('  实测墙钟总耗时                    ' + wallMs + ' ms');
  }

  // 内存占用
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const mem = await page.evaluate(() => performance.memory ? {
    used: Math.round(performance.memory.usedJSHeapSize / 1048576),
    total: Math.round(performance.memory.totalJSHeapSize / 1048576),
  } : null);
  if (mem) console.log('\nJS 堆内存：' + mem.used + ' MB（已分配 ' + mem.total + ' MB）');

  await browser.close();
})();
