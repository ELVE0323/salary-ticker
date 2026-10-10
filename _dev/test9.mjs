// PWA 改造验证
import fs from 'fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const js   = html.split('<script>')[1].split('</script>')[0];

let pass=0, fail=0;
const ck=(n,c,e='')=>{ c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} ${e}`)); };

console.log('\n【1】PWA 必需文件');
for(const f of ['manifest.json','sw.js','icon.svg','icon-maskable.svg']){
  let ok=false, size=0;
  try{ size=fs.statSync(new URL('./'+f, import.meta.url)).size; ok=size>0; }catch(e){}
  ck(`${f} 存在`, ok, ok?`${size} 字节`:'缺失');
}

console.log('\n【2】manifest.json 合法性');
{
  let m=null;
  try{ m=JSON.parse(fs.readFileSync(new URL('./manifest.json', import.meta.url),'utf8')); ck('JSON 可解析', true); }
  catch(e){ ck('JSON 可解析', false, e.message); }
  if(m){
    ck('name 存在', !!m.name, m.name);
    ck('short_name 存在（≤12字）', !!m.short_name && m.short_name.length<=12, m.short_name);
    ck('start_url 存在', !!m.start_url, m.start_url);
    ck('display=standalone（独立窗口）', m.display==='standalone', m.display);
    ck('theme_color 存在', !!m.theme_color, m.theme_color);
    ck('background_color 存在', !!m.background_color, m.background_color);
    ck('icons 至少 2 个', (m.icons||[]).length>=2, `${(m.icons||[]).length} 个`);
    ck('含 maskable 图标（安卓自适应）', (m.icons||[]).some(i=>i.purpose==='maskable'));
    ck('含 any 图标', (m.icons||[]).some(i=>i.purpose==='any'));
    ck('图标引用存在的文件', (m.icons||[]).every(i=>{
      const f=i.src.replace('./','');
      try{ return fs.statSync(new URL('./'+f, import.meta.url)).size>0; }catch(e){ return false; }
    }));
    ck('start_url 与图标用相对路径（可任意路径部署）', !m.start_url.startsWith('http'));
  }
}

console.log('\n【3】Service Worker');
{
  const sw=fs.readFileSync(new URL('./sw.js', import.meta.url),'utf8');
  ck('监听 install', /addEventListener\('install'/.test(sw));
  ck('监听 activate', /addEventListener\('activate'/.test(sw));
  ck('监听 fetch', /addEventListener\('fetch'/.test(sw));
  ck('缓存全部资源', /ASSETS\s*=\s*\[/.test(sw) && /index\.html/.test(sw) && /manifest\.json/.test(sw));
  ck('skipWaiting 立即接管', /skipWaiting/.test(sw));
  ck('清理旧版本缓存', /caches\.delete/.test(sw));
  ck('网络失败回退缓存（离线可用）', sw.includes("caches.match(req).then(hit => hit || caches.match('./index.html'))"));
  ck('只接管同源请求', /url\.origin !== location\.origin/.test(sw));
  ck('版本号已更新到 v2（强制刷新旧缓存）', /const CACHE = 'salary-ticker-v2'/.test(sw));
// 策略判定：只看 e.respondWith 块内的真实代码（跳过注释）
{
  const body = sw.slice(sw.indexOf("e.respondWith"));
  ck('★网络优先（避免手机上永远看旧代码）',
     body.includes('fetch(req).then(res') && !body.includes('return hit || net'));
}
ck('★只在断网时才用缓存', sw.includes('.catch(() => (') && sw.includes('caches.match(req)'));
ck('★新 SW 立即接管', /skipWaiting\(\)/.test(sw));
ck('★清理所有旧版本缓存', /keys\.filter\(k => k !== CACHE\)/.test(sw));
}

console.log('\n【4】index.html 的 PWA 标签');
ck('link manifest', /<link rel="manifest" href="\.\/manifest\.json">/.test(html));
ck('apple-touch-icon', /rel="apple-touch-icon"/.test(html));
ck('apple-mobile-web-app-capable', /name="apple-mobile-web-app-capable"/.test(html));
ck('apple-mobile-web-app-title', /name="apple-mobile-web-app-title" content="秒薪"/.test(html));
ck('mobile-web-app-capable', /name="mobile-web-app-capable"/.test(html));
ck('theme-color 存在', /name="theme-color"/.test(html));
ck('apple 状态栏样式', /apple-mobile-web-app-status-bar-style/.test(html));

console.log('\n【5】安装逻辑');
ck('捕获 beforeinstallprompt', /addEventListener\('beforeinstallprompt'/.test(js));
ck('调用 preventDefault 阻止原生弹窗', /e\.preventDefault\(\)/.test(js));
ck('★点击按钮触发 prompt()', /\.prompt\(\)/.test(js));
ck('监听 appinstalled', /addEventListener\('appinstalled'/.test(js));
ck('安装按钮默认隐藏（避免误点）', /id="btnInstall"[^>]*style="display:none"/.test(html));
ck('★不支持时显示平台图文引导', /showInstallGuide/.test(js) && /installTip/.test(js));
ck('区分 iOS 引导', /iPhone \/ iPad/.test(js) && /添加到主屏幕/.test(js));
ck('区分 Android 引导', /Android/.test(js));
ck('区分 Windows/Mac 引导', /Windows \/ Mac/.test(js) && /安装页面为应用/.test(js));
ck('检测已在 App 模式运行', /isStandalone/.test(js) && /display-mode: standalone/.test(js));
ck('复制网址按钮', /btnCopyLink/.test(js) && /clipboard/.test(js));
ck('file:// 时提示功能受限', /location\.protocol==='file:'/.test(js));

console.log('\n【6】SW 注册与更新');
ck('注册 sw.js', /serviceWorker\.register\('\.\/sw\.js'\)/.test(js));
ck('注册失败不报错（file:// 兼容）', /\.catch\(\(\)=>/.test(js));
ck('检测更新并提示', /updatefound/.test(js) && /有新版本/.test(js));
ck('新版本自动重载', /controllerchange/.test(js));

console.log('\n【7】独立窗口样式适配');
ck('★独立模式加刘海安全区', /@media \(display-mode: standalone\)/.test(html) && /env\(safe-area-inset-top\)/.test(html));
ck('底部安全区适配', /env\(safe-area-inset-bottom\)/.test(html));
ck('窗口控件覆盖模式避让', /window-controls-overlay/.test(html));
ck('titlebar-area 避让', /titlebar-area-x/.test(html));
ck('独立模式禁用橡皮筋', /overscroll-behavior/.test(html));

console.log('\n【8】原有功能未破坏');
ck('日薪计算仍在', /const rate = due>0 \? CFG\.salary\/due/.test(js));
ck('加班费仍在', /const finalPay=CFG\.salary - deduct \+ otPay/.test(js));
ck('轮盘仍在', /function openWheel/.test(js));
ck('事件委托仍在', /function initYearClick/.test(js));
ck('时间轴单端仍在', /class="sb-knob r"/.test(html));
ck('日历星期修正仍在', /const WEEK=\['日','一','二','三','四','五','六'\]/.test(js));
ck('皮肤系统仍在', /function injectDecor/.test(js));
ck('★老板键已移除', !/toggleHide/.test(js) && !/id="mask"/.test(html));

console.log('\n────────────────────────────');
console.log(`通过 ${pass} · 失败 ${fail}`);
console.log('────────────────────────────');
process.exit(fail?1:0);