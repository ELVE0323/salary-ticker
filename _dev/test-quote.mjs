// 语录状态机（v2）测试：上班 / 正常 / 下班 / 放假 四态
import fs from 'fs';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = html.split(/<script>([\s\S]*)<\/script>/)[1];

let pass = 0, fail = 0;
const ok = (n, c, extra='') => { c ? (pass++, console.log('  ✓ '+n)) : (fail++, console.log('  ✗ '+n+(extra?' → '+extra:''))); };

// 抽取状态机相关代码
const grab = (name, len) => {
  const i = js.indexOf(name);
  if (i < 0) throw new Error('not found: '+name);
  return js.slice(i, i+len);
};

console.log('\n【1】四类语录库存在');
for (const [k, n] of [['Q_START','上班'],['Q_NORMAL','正常'],['Q_OFF','下班'],['Q_HOL','放假']]) {
  ok(`${k}（${n}语录库）已定义`, js.includes('const '+k+' = ['));
  const seg = js.slice(js.indexOf('const '+k+' = ['));
  const cnt = (seg.slice(0, seg.indexOf('\n];')).match(/^\s*'/gm) || []).length;
  ok(`${k} 条目数 ≥ 25（实 ${cnt}）`, cnt >= 25);
}

console.log('\n【2】状态机函数');
ok('getQuoteMode 存在', js.includes('function getQuoteMode(now)'));
ok('绑定日历状态 statusOf', /function getQuoteMode\(now\)[\s\S]{0,600}statusOf\(key\)/.test(js));
ok('处理半天假 lv1/lv2', js.includes("ov==='lv1' && h < ls") && js.includes("ov==='lv2' && h >= le"));
ok('QUOTE_MODE_META 映射四态', ['hol','start','normal','off'].every(m=>new RegExp('\\n\\s*'+m+':\\s*\\{').test(js)));
ok('旧 currentQuoteKind 已改为包装', js.includes('function currentQuoteKind(){ return getQuoteMode(); }'));

console.log('\n【3】自动循环轮播');
ok('restartQuoteRotate 存在', js.includes('function restartQuoteRotate()'));
ok('使用 setInterval 定时换句', /function restartQuoteRotate\(\)[\s\S]{0,400}setInterval/.test(js));
ok('启动时调用 restartQuoteRotate', /pickQuote\(\);[\s\S]{0,120}restartQuoteRotate\(\);/.test(js));
ok('彩蛋态不打断轮播', /if\(eggActive\) return;[\s\S]{0,300}pickQuote\(\)/.test(js));
ok('旧的空转 setInterval 已移除', !js.includes("setInterval(()=>{ if(!$('quoteText')) return; },60000)"));

console.log('\n【4】手动换一句只在本库内');
ok('pickQuote 按 mode 取池', /const mode\s*=\s*QUOTE_MODE_META\[force\] \? force : getQuoteMode\(\);/.test(js));
ok('pickFrom 防重复', js.includes('function pickFrom(pool)') && js.includes('while(q===_lastQuote'));
ok('点击语录也走本库', /quoteText'\)\.addEventListener\('click'[\s\S]{0,300}restartQuoteRotate\(\); pickQuote\(\);/.test(js));
ok('不再使用旧的 off/work 二分', !js.includes("kind==='off' ? randomOffQuote()"));

console.log('\n【5】状态切换自动换句');
ok('render 里用 getQuoteMode', js.includes('const mode=getQuoteMode(now);'));
ok('状态变化时 pickQuote(mode)', /else if\(mode!==_quoteKind && _quoteText\)\{\s*pickQuote\(mode\);/.test(js));

// ---- 逻辑仿真：抽出 getQuoteMode 主体，用桩函数跑 ----
console.log('\n【6】状态判定逻辑仿真');
const body = js.match(/function getQuoteMode\(now\)\{[\s\S]*?\n\}/)[0]
  + '\nreturn getQuoteMode;';
let CFG, ymd, statusOf, minOf;
try {
  const fn = new Function('CFG','ymd','statusOf','minOf',
    body);
  const setup = (cfg, statusFn) => {
    CFG = cfg;
    ymd = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    statusOf = statusFn;
    minOf = t => { const [a,b]=t.split(':').map(Number); return a*60+b; };
  };
  const call = (d) => fn(CFG, ymd, statusOf, minOf)(d);
  const base = { start:'09:00', end:'18:00', lunch1:'12:00', lunch2:'13:00', workMode:'double', parity:0, holMode:'off' };
  const work = () => 1, rest = () => 0, lv = () => 2, half = () => 3;
  const D = (h,m)=>new Date(2026,9,12,h,m,0);   // 2026-10-12 周一

  setup(base, work);
  ok('上班前（08:00）→ 下班语录', call(D(8,0))==='off', call(D(8,0)));
  ok('上班后 0.5h（09:30）→ 上班语录', call(D(9,30))==='start', call(D(9,30)));
  ok('上班后 1.9h（10:54）→ 上班语录', call(D(10,54))==='start');
  ok('上班满 2h（11:00）→ 正常语录', call(D(11,0))==='normal', call(D(11,0)));
  ok('午休中（12:30）→ 正常语录', call(D(12,30))==='normal');
  ok('下班前一分钟（17:59）→ 正常语录', call(D(17,59))==='normal');
  ok('下班瞬间（18:00）→ 下班语录', call(D(18,0))==='off', call(D(18,0)));
  ok('深夜（23:00）→ 下班语录', call(D(23,0))==='off');
  ok('凌晨（03:00）→ 下班语录', call(D(3,0))==='off');

  setup(base, rest);
  ok('休息日 10:30 → 放假语录', call(D(10,30))==='hol', call(D(10,30)));
  ok('休息日 22:00 → 放假语录', call(D(22,0))==='hol');

  setup(base, lv);
  ok('工作日全天请假 → 放假语录', call(D(10,30))==='hol');

  setup(base, half);
  CFG.override = { '2026-10-12':'lv1' };
  ok('上午半天假 10:30 → 放假语录', call(D(10,30))==='hol', call(D(10,30)));
  ok('上午半天假 14:00（下午上班）→ 正常语录', call(D(14,0))==='normal', call(D(14,0)));
  CFG.override = { '2026-10-12':'lv2' };
  ok('下午半天假 14:30 → 放假语录', call(D(14,30))==='hol', call(D(14,30)));
  ok('下午半天假 10:00（上午上班）→ 上班语录', call(D(10,0))==='start', call(D(10,0)));

  // 大小周
  const alt = { ...base, workMode:'alt', parity:0 };
  setup(alt, work);
  ok('大小周：状态=上班的周六 → 按时段切分', call(D(10,30))==='start');
  setup(alt, rest);
  ok('大小周：状态=休息的周六 → 放假语录', call(D(10,30))==='hol');

  // 休息日设为上班（加班）→ 不放假
  setup(base, work);
  ok('休息日设为上班（加班）→ 走上班语录', call(D(10,30))==='start');
} catch (e) {
  fail++;
  console.log('  ✗ 仿真失败: ' + e.message);
}

console.log('\n────────────────────────────');
console.log(`通过 ${pass} · 失败 ${fail}`);
console.log('────────────────────────────');
process.exit(fail ? 1 : 0);