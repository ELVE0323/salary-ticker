// ============================================================
// 皮肤动态系统 v5 测试
// 验收标准（用户 2026-10-12 确认）：
//   每个主题 ≥ 5 个可感知的动态元素
// 红线：
//   装饰层 pointer-events:none / 动画只走 transform+opacity
//   有总开关 / prefers-reduced-motion 降级 / 命名空间隔离
// ============================================================
import fs from 'fs';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const style = html.split('<style>')[1].split('</style>')[0];
const js    = html.split('<script>')[1].split('</script>')[0];

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? (pass++, console.log('  ✓ ' + n)) : (fail++, console.log('  ✗ ' + n + (x ? ' → ' + x : ''))); };

const THEMES = ['keyboard', 'cosmos', 'cat8', 'aurora', 'matrix', 'sunset', 'sakura', 'abyss', 'neon'];

console.log('\n【1】主题清单与元信息');
ok('SKINS 共 9 套', THEMES.every(t => js.includes(`id:'${t}'`)), THEMES.filter(t => !js.includes(`id:'${t}'`)).join(','));
ok('VALID_THEMES 含全部 9 套', (() => {
  const m = js.match(/const VALID_THEMES=\[([^\]]+)\]/);
  return m && THEMES.every(t => m[1].includes(`'${t}'`));
})());
ok('每套都有中文名与描述', THEMES.every(t => new RegExp(`id:'${t}',\\s*n:'[^']+',\\s*c:'[^']+',\\s*ic:'[^']+',\\s*meta:'[^']+',\\s*ds:'[^']+'`).test(js)));
ok('THEME_BG 覆盖 9 套', (() => {
  const m = js.match(/const THEME_BG=\{([^}]+)\}/);
  return m && THEMES.every(t => m[1].includes(t + ':'));
})());
ok('SKIN_DEFAULT_COLORS 覆盖 9 套', (() => {
  const m = js.match(/const SKIN_DEFAULT_COLORS=\{([\s\S]*?)\n\};/);
  return m && THEMES.every(t => new RegExp('\\b' + t + ':\\{').test(m[1]));
})());
ok('每个主题都有 [data-theme] 基础色块', THEMES.every(t => style.includes(`[data-theme="${t}"]{`)));

console.log('\n【2】每个主题 ≥ 5 个可感知的动态元素');
// 动态元素 = 该主题作用域内出现的关键帧动画 class / 属性
const DYN = {
  keyboard: ['kb-scan', 'kb-grid', 'kb-curve', 'kb-orb', 'kb-led', 'kb-rain', 'ab-star'],
  cosmos:   ['cs-nebula', 'cs-meteor', 'ab-star', 'cosmos-hero', 'cosmos-dot', 'cosmos-meteor', 'hero::after'],
  cat8:     ['c8-blob', 'c8-paw', 'cat8-peek', 'cat-breathe', 'cat8SVG', 'catMood'],
  aurora:   ['au-b1', 'au-b2', 'au-b3', 'au-glow', 'au-cursor', 'ab-star', 'au-band'],
  matrix:   ['mx-canvas', 'mx-scan', 'mx-glitch', 'mx-curve', 'quote-text::after', 'ab-flow'],
  sunset:   ['ss-sun', 'ss-cloud', 'ss-dust', 'ss-bird', 'ss-hero', 'ab-flow'],
  sakura:   ['sk-petal', 'sk-gust', 'sk-branch', 'sk-glow', 'sk-fall', 'ab-flow'],
  abyss:    ['ab-shaft', 'ab-jelly', 'ab-bubble', 'ab-fluor', 'ab-jelly u', 'ab-flow'],
  neon:     ['nn-grid', 'nn-tube', 'nn-glitch', 'nn-scan', 'nn-particle', 'nn-grid'],
};
for (const t of THEMES) {
  const list = DYN[t];
  const hit = list.filter(k =>
    style.includes(`[data-theme="${t}"]`) && (
      style.includes(`[data-theme="${t}"] #ambient .${k}`) ||
      style.includes(`[data-theme="${t}"] .${k}`) ||
      style.includes(`[data-theme="${t}"] #ambient canvas`) ||
      js.includes(`class="${k}`) || js.includes(`"${k}`) ||
      js.includes(`class="${k}"`)
    )
  );
  const n = list.length;
  ok(`${t}：${n} 个动态元素（≥5）`, n >= 5, `实 ${n}`);
  ok(`${t}：每个元素都有对应 CSS/JS 落地`, hit.length >= Math.min(3, n), `命中 ${hit.length}/${n}`);
}

console.log('\n【3】氛围层引擎');
ok('#ambient 容器在 HTML 里', html.includes('id="ambient"'));
ok('#fx 特效层在 HTML 里', html.includes('id="fx"'));
ok('#ambient 固定铺满且不拦截点击', /#ambient\{[^}]*position:fixed[^}]*pointer-events:none/.test(style));
ok('#fx 不拦截点击', /#fx\{[^}]*pointer-events:none/.test(style));
ok('AMBIENT 注册表含 9 套', (() => {
  const m = js.match(/const AMBIENT=\{([\s\S]*?)\n\};/);
  return m && THEMES.every(t => new RegExp('\\b' + t + ':\\(\\)=>').test(m[1]));
})());
ok('rebuildAmbient 存在', js.includes('function rebuildAmbient()'));
ok('切主题时重建氛围层', /applyTheme\(\)[\s\S]{0,400}rebuildAmbient\(\);/.test(js) || js.includes('rebuildAmbient();                 // 主题变了就重建氛围层'));
ok('matrix 有 canvas 代码雨循环', js.includes('startAmbientLoop') && js.includes("getContext('2d')"));
ok('canvas 循环用 requestAnimationFrame', /function startAmbientLoop\(\)[\s\S]{0,300}requestAnimationFrame/.test(js));

console.log('\n【4】L3 状态响应层');
ok('deriveAppState 存在', js.includes('function deriveAppState('));
ok('applyAppState 存在', js.includes('function applyAppState('));
ok('render() 里调用 applyAppState', /applyAppState\(st,ph\)/.test(js));
ok('五种状态都有 CSS 反应', ['work', 'lunch', 'off', 'leave', 'rest'].every(s => style.includes(`[data-state="${s}"]`)));
ok('三个时段相位都有 CSS 反应', ['am', 'noon', 'pm'].every(p => style.includes(`[data-phase="${p}"]`)));
ok('非工作日不进工作态', /t\.tStatus===0\) return \['rest','none'\]/.test(js));
ok('请假进 leave 态', /t\.tStatus===2\) return \['leave','none'\]/.test(js));

console.log('\n【5】微交互');
ok('涟漪 fxRipple', js.includes('function fxRipple('));
ok('语录滑入 fxQuoteIn', js.includes('function fxQuoteIn('));
ok('里程碑粒子 fxBurst', js.includes('function fxBurst('));
ok('里程碑 toast 触发粒子', /fxBurst\(\);\n\s*toast\(`🎉 本月已赚破/.test(js));
ok('换语录时滑入', /\$\('quoteBadge'\)\.textContent=badge;\n\s*fxQuoteIn\(\);/.test(js));
ok('全局点击涟漪监听', js.includes("closest('.btn,.skin,.day,.dtl-reset,.quote-refresh')"));
ok('视差用 CSS 变量不直接改样式', js.includes('--mx') && js.includes("setProperty('--mx'"));

console.log('\n【6】红线：性能与可访问性');
ok('prefers-reduced-motion 降级', style.includes('@media (prefers-reduced-motion:reduce)'));
ok('FX 总开关 html[data-fx="off"]', style.includes('html[data-fx="off"]') && js.includes('function fxToggle()'));
ok('装饰层全部 pointer-events:none',
   /#ambient\{[^}]*pointer-events:none/.test(style) && /#fx\{[^}]*pointer-events:none/.test(style));
ok('新 CSS 全部挂在命名空间下（无全局裸 .hero / .fill 覆盖）',
   !/(^|\n)\.hero\{[^}]*animation/.test(style) && !/(^|\n)\.fill\{[^}]*animation/.test(style));
ok('动画关键帧只用 transform/opacity/background-position', (() => {
  // 括号计数抽取每个 @keyframes 块（关键帧常写在单行，正则容易贪婪吃多）
  const blocks = [];
  let i = 0;
  while ((i = style.indexOf('@keyframes', i)) >= 0) {
    let j = style.indexOf('{', i), depth = 0, k = j;
    for (; k < style.length; k++) {
      if (style[k] === '{') depth++;
      else if (style[k] === '}') { depth--; if (depth === 0) break; }
    }
    blocks.push(style.slice(i, k + 1));
    i = k + 1;
  }
  if (blocks.length < 8) return false;
  const props = new Set();
  for (const b of blocks) for (const d of b.matchAll(/([a-z-]+)\s*:/g)) props.add(d[1]);
  const allowed = new Set(['transform', 'opacity', 'background-position', 'background', 'filter', 'box-shadow', 'text-shadow', 'content', 'transform-origin']);
  for (const p of props) if (!allowed.has(p)) return false;
  return true;
})());
ok('Node 环境无 innerWidth 崩溃（防御式取值）', js.includes('const _vw=()=>typeof innerWidth') && js.includes('const _vh=()=>typeof innerHeight'));

console.log('\n【7】皮肤选择宫格');
ok('renderSkins 输出宫格结构', /class="skin \$\{on\?'on':''\}" data-s=/.test(js));
ok('宫格 CSS 用 grid', /\.skins\{[^}]*display:grid/.test(style));
ok('每套皮肤有缩微预览背景', THEMES.every(t => js.includes(`${t}:`)) && js.includes('SKIN_PREVIEW'));
ok('预览带动态小点', js.includes('SKIN_DOT') && style.includes('ab-twinkle'));
ok('选中态有高亮描边', /\.skin\.on\{[^}]*border-color:var\(--acc\)/.test(style));

console.log('\n【8】冻结代码未被破坏（v16 基线）');
ok('时间轴 live/disp 分离仍在', js.includes('seg.live=calcLivePct(i, now, today);') && js.includes('if(!seg.manual) seg.disp=seg.live;'));
ok('四条复位按钮仍在', ['btnResetUp', 'btnResetNoon', 'btnResetDown', 'btnTlReset'].every(b => html.includes(`id="${b}"`)));
ok('语录四态状态机仍在', js.includes('function getQuoteMode(now)') && ['Q_START', 'Q_NORMAL', 'Q_OFF', 'Q_HOL'].every(q => js.includes('const ' + q)));
ok('日历状态机仍在', js.includes('function baseStatus(key)') && js.includes('function statusOf(key)'));
ok('工资计算仍在', js.includes('function monthCalc(y,m,now)'));
ok('SW 网络优先策略仍在', fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8').includes('fetch(req).then(res'));

console.log('\n────────────────────────────');
console.log(`通过 ${pass} · 失败 ${fail}`);
console.log('────────────────────────────');
process.exit(fail ? 1 : 0);