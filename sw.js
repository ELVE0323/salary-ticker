/* ==========================================================
   秒薪 · Service Worker
   ★ 策略改为「网络优先」（network-first）

   之前用的是「缓存优先」（stale-while-revalidate）：
       return hit || net;
   问题：手机上装成 App 后，SW 会一直返回本地缓存的老代码，
        每次打开都是旧版本 —— 新加的彩蛋语录、可拖动进度条、
        跳过叉号全都看不到，还以为是功能回退了。

   现在：联网时永远拿服务器上的最新代码，同时顺手更新缓存；
        只有断网时才用缓存兜底（离线仍能打开）。
   ========================================================== */
const CACHE = 'salary-ticker-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-maskable.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())      // 新 SW 立刻接管，不等老页面关闭
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))   // 清掉所有旧版本
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;      // 只接管同源请求

  // 只接管页面和静态资源，其他（扩展接口等）放行
  const isDoc  = req.mode === 'navigate' || req.destination === 'document';
  const isFile = /\.(?:html|json|js|css|svg|png|jpg|jpeg|webp|ico)$/i.test(url.pathname);
  if(!isDoc && !isFile) return;

  e.respondWith(
    // ★网络优先
    fetch(req).then(res => {
      if(res && res.status === 200 && res.type === 'basic'){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => (
      // 断网兜底
      caches.match(req).then(hit => hit || caches.match('./index.html'))
    ))
  );
});

// 页面主动要求立刻启用新版本
self.addEventListener('message', e => {
  if(e.data === 'skipWaiting') self.skipWaiting();
});
