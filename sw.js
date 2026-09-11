// sw.js —— 离线缓存：让「单词大冒险」第二次打开是 0 网络请求的秒开
//
// 🔴 为什么需要它（2026-09-11 实测数据，不是猜的）：
//    GitHub Pages 的缓存策略是 cache-control: max-age=600 —— 只让浏览器缓存 10 分钟。
//    从国内连它：首字节 0.9~2.5 秒，166KB 传完再加 0.5~1 秒；缓存刚过期又得重下时
//    实测到 6.0 秒。模拟国内手机中等网速（延迟 400ms / 1.2Mbps / CPU 降速 4×）量下来：
//        0.9 秒  首页「看得见」
//        4.2 秒  才「点得动」
//        中间 3.3 秒 —— 看着像打开了、点它没反应，这就是老曾说的「卡」。
//    而 App 自己启动只要 76 毫秒。慢的全是网络，代码一点问题没有。
//
// 🔴 为什么选 stale-while-revalidate（缓存先给、后台悄悄更新）：
//    网络优先等于每次都要等那 0.9~2.5 秒，白装。
//    SWR 的代价是「改版后第一次打开可能还是旧版、再打开一次才是新版」——
//    这 App 是自用工具、改版不频繁，用一次延迟换每次秒开，这笔账划算。
//    ⚠️ 所以：我改完版如果老曾说「没看到新东西」，让他下拉刷新一次即可。
//
// 🔴 整个 App 只有一个文件：index.html 里**零外部引用**（实测无 <link>、无 CDN 外链），
//    所以缓存清单就一条，不存在「缓存了 HTML 却没缓存 CSS」那种半吊子状态。
// 🔴 每次改 index.html **都要顶这个版本号**：不顶的话老缓存不会被清，
//    SWR 又只保证"再打开一次才更新"，用户会以为新版没生效。
//    2026-09-11 v2：词库 3143→5000、主题 41→51，顺带修掉界面 4 处写死的旧数字。
const VERSION = 'danci-2026-09-11b';
const INDEX = new URL('./index.html', self.location.href).href;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll([INDEX]))
      .catch(() => {})            // 首次预缓存失败不能把 SW 卡死在 installing
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 不是自己的资源一律不碰

  // 🔴 导航请求必须映射到 INDEX 这个 key，不能直接 caches.match(req)：
  //    打开页面时请求的是 /danci-adventure-english/（目录形式），
  //    而缓存里存的 key 是 /danci-adventure-english/index.html —— 两者 URL 不同，
  //    直接 match 会永远落空，缓存形同虚设（这是 SW 最常见的坑）。
  const key = req.mode === 'navigate' ? INDEX : req.url;

  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(key);
    // 后台更新：故意不 await，让它自己慢慢跑；失败也不影响这次返回什么
    const net = fetch(req).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        cache.put(key, res.clone()).catch(() => {});
      }
      return res;
    }).catch(() => null);
    // 有缓存立刻给（这就是秒开的来源）；没有才等网络
    return cached || (await net) || new Response('离线，且本地没有缓存', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  })());
});
