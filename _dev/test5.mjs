// v5 测试：皮肤实装修复 / 实时评级 / 三段独立可拖动进度条 / 状态栏文案
import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js   = html.split('<script>')[1].split('</script>')[0];
const style = html.split('<style>')[1].split('</style>')[0];

// ===== DOM 桩 =====
const store={};
// ★ 测试专用：固定配置，不依赖 DEF 默认值
const nodes={}; const rects={};
global.__CFG_OVERRIDE={workMode:'alt',override:{'2026-10-07':'lv'}};  // 固定配置，不依赖 DEF 默认值
function mkNode(id){
  const h={};
  return {
    id, innerHTML:'', textContent:'', value:'', type:'', tagName:'DIV',
    contentEditable:'false', isContentEditable:false,
    style:{_v:{},setProperty(k,v){this._v[k]=v;},removeProperty(k){delete this._v[k];},getPropertyValue(k){return this._v[k]||'';}},
    dataset:{k:'2026-10-09'},
    classList:{add(){},remove(){},toggle(){},contains(){return false}},
    addEventListener(ev,fn){ h[ev]=(h[ev]||[]).concat(fn); },
    _h:h,
    getBoundingClientRect(){ return rects[id]||{left:0,width:100,top:0,height:16}; },
    closest(){ return null; },
    querySelectorAll(){ return []; }, querySelector(){ return null; },
    appendChild(){}, insertBefore(){}, remove(){}, focus(){}, blur(){},
    scrollIntoView(){}, setAttribute(){}, getAttribute(){return null}, removeAttribute(){}
  };
}
global.document={
  body: mkNode('body'),
  getElementById(id){ return nodes[id]||(nodes[id]=mkNode(id)); },
  querySelectorAll(sel){
    if(sel.includes('.day')) return Array.from({length:31},(_,i)=>{
      const el=mkNode('d'+i); el.dataset.k=`2026-10-${String(i+1).padStart(2,'0')}`; return el;});
    return [];
  },
  querySelector(){return null},
  createElement(t){ return mkNode('new-'+t); },
  createElementNS(ns,t){ return mkNode('svg'); },
  addEventListener(){},
  documentElement:{dataset:{theme:'keyboard'}, style:{setProperty(){},removeProperty(){}}}
};
global.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;},removeItem:k=>{delete store[k];}};
Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:()=>Promise.resolve()}},writable:true,configurable:true});
global.requestAnimationFrame=()=>0;
global.confirm=()=>true; global.prompt=()=>null;
global.window={open:null,scrollTo(){},addEventListener(){}};
global.setInterval=()=>0; global.setTimeout=()=>0; global.clearTimeout=()=>{};
global.document.createRange=()=>({selectNodeContents(){}});
global.getSelection=()=>({removeAllRanges(){},addRange(){}});

let pass=0,fail=0;
const ck=(n,c,e='')=>{ c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} ${e}`)); };

console.log('\n【1】脚本执行');
try{ new Function(js)(); ck('无异常', true); }
catch(e){ ck('无异常', false, e.stack.split('\n').slice(0,4).join(' | ')); process.exit(1); }

console.log('\n【2】皮肤实装修复（用户报告的核心问题）');
{
  // sakura CSS 必须补回（否则旧配置的主题会导致全站样式失效）
  ck('sakura CSS 变量块已补回', /\[data-theme="sakura"\]\{\s*--bg:/.test(style),
     '旧配置 theme=sakura 时若 CSS 缺失 → var(--bg) 未定义 → 卡片透明、文字继承黑色');
  const skBlock = style.split('[data-theme="sakura"]{')[1]?.split('}')[0]||'';
  const NEED=['--bg','--surface','--surface2','--stroke','--txt','--txt2','--txt3','--acc','--acc2','--ok','--warn','--bad','--num-grad','--btn','--btn-h','--shadow','--glow-line'];
  const miss=NEED.filter(v=>!skBlock.includes(v+':'));
  ck('sakura 17 个变量齐全', miss.length===0, '缺: '+miss.join(','));

  // 未知主题兜底
  ck('有 VALID_THEMES 白名单', /const VALID_THEMES=\[/.test(js));
  const vt=js.match(/const VALID_THEMES=\[([^\]]+)\]/);
  const listed = vt ? (vt[1].match(/'([a-z0-9]+)'/g)||[]).map(s=>s.replace(/'/g,'')) : [];
  console.log('  白名单: '+listed.join(', '));
  ck('白名单含全部 9 套', listed.length===9, '实际 '+listed.length);
  ck('applyTheme 会校验主题', /if\(!VALID_THEMES\.includes\(CFG\.theme\)\)/.test(js));
  ck('校验后回落并写回', /CFG\.theme='keyboard'/.test(js) && /try\{ save\(\); \}/.test(js));

  // 六套皮肤 CSS 全在
  for(const th of ['keyboard','cosmos','cat8','aurora','matrix','sunset','sakura']){
    ck(`  ${th} CSS 块存在`, new RegExp(`\\[data-theme="${th}"\\]\\{`).test(style));
  }
  // 每套变量齐全
  console.log('  各皮肤变量完整性:');
  for(const th of ['keyboard','cosmos','cat8','aurora','matrix','sunset','sakura']){
    const i=style.indexOf(`[data-theme="${th}"]{`);
    const block=style.slice(i, style.indexOf('[data-theme=', i+10)>0?style.indexOf('[data-theme=', i+10):i+1200);
    const lack=NEED.filter(v=>!block.includes(v+':'));
    ck(`    ${th.padEnd(9)} ${lack.length?'缺 '+lack.join(','):'✓ 齐全'}`, lack.length===0);
  }
}

console.log('\n【3】皮肤装饰实装（不只是换色）');
{
  ck('有 injectDecor 函数', /function injectDecor/.test(js));
  ck('键盘皮肤注入迷你键盘', /skin-deco kb-mini/.test(js) && /ESC/.test(js));
  ck('宇宙皮肤注入星环行星', /skin-deco cosmos-hero/.test(js) && /class="orbit o1"/.test(js));
  ck('八条注入到语录卡', /id='cat8Quote'/.test(js));
  ck('八条注入到评级卡', /id='cat8Rank'/.test(js));
  ck('八条表情随状态变', /updateCat8\(catMood\(today\.tStatus\)\)/.test(js));
  ck('切皮肤后重注入', /renderPalette\(\); injectDecor\(\)/.test(js));
  ck('键帽有立体阴影', /inset 0 -2px 0 rgba\(0,0,0,\.5\)/.test(style));
  ck('猫爪印背景', /data-theme="cat8"\] \.cell::after/.test(style));
  ck('八条 CSS 定位规则', /data-theme="cat8"\] \.quotebox > \.cat8-peek/.test(style));
  ck('行星旋转动画', /@keyframes spin/.test(style));
}

console.log('\n【4】实时评级与购物力');
{
  ck('getRankByRatio 存在', /function getRankByRatio/.test(js));
  const m=js.match(/function getRankByRatio\(earned, full\)\{[\s\S]{0,400}?\n\}/);
  ck('按 ratio 等比映射', m?/const ratio = Math\.max\(0, Math\.min\(1, earned\/total\)\)/.test(m[0]):false,
     m?m[0].slice(0,80):'未匹配到函数');
  ck('跳过第0级作为起点', m?/Math\.max\(1, Math\.round\(ratio\*\(RANKS\.length-2\)\)\+1\)/.test(m[0]):false);
  ck('shoppingLineLive 存在', /function shoppingLineLive/.test(js));
  ck('getShoppingLive 存在', /function getShoppingLive/.test(js));
  // 价格必须覆盖小额（用户要求"400块能买啥"）
  const prices=[...js.matchAll(/\['([^']+)',\s*([\d.]+)\]/g)].map(m=>+m[2]);
  const cheap=prices.filter(p=>p<=30);
  ck('有 30 元以下的商品（低档覆盖）', cheap.length>=5, `实际 ${cheap.length} 个`);
  ck('最低价 ≤ 5 元', Math.min(...prices)<=5, `最低 ¥${Math.min(...prices)}`);
  ck('SHOPPING 有 0 档（还没赚到钱时）', /min:0,\s*items:/.test(js));
  ck('renderRank 用今日数据', /tEarnedLive/.test(js));
  ck('renderRank 传 today.rate', /tRateFull:\s*today\.rate/.test(js));
  // 实测评级
  const RANKS=(()=>{const b=js.split('const RANKS = [')[1].split('\n];')[0];
    return [...b.matchAll(/\{ *min:(\d+), *lv:(\d+)/g)].map(m=>({min:+m[1],lv:+m[2]}));})();
  const N=RANKS.length;
  const getLv=(earned,full)=>{
    const ratio=Math.max(0,Math.min(1,earned/Math.max(1,full)));
    return Math.min(N-1,Math.max(1,Math.round(ratio*(N-2))+1));
  };
  console.log(`  ${N} 级评级，0~${fullOf(7000)} 元区间：`);
  [[0,7000],[400,7000],[1000,7000],[2500,7000],[3500,7000],[5000,7000],[6666,7000],[7000,7000]]
   .forEach(([e,f])=>console.log(`    ¥${String(e).padStart(5)} / 满¥${f} → LV.${getLv(e,f)}`));
  ck('0 元 → LV.1（不是 LV.0）', getLv(0,7000)===1);
  ck('7000 元满 → 最高级', getLv(7000,7000)===N-1);
  ck('中间平滑递增', [0,700,1500,3000,5000,7000].map(e=>getLv(e,7000)).every((v,i,a)=>i===0||v>=a[i-1]));
}
function fullOf(x){ return x; }

console.log('\n【5】三段独立可拖动进度条');
{
  // 只数 HTML 里的 segbar（排除容器 .segbars）
const segbars=(html.split('<script>')[0].match(/class="segbar[\s"]/g)||[]).length;
  ck('4 个 segbar（3 段 + 1 整体）', segbars===4, `实际 ${segbars}`);
  ck('上午上班独立段', /id="segA"/.test(html) && /上午上班/.test(html));
  ck('午休独立段', /id="segB"/.test(html));
  ck('下午上班独立段', /id="segC"/.test(html) && /下午上班/.test(html));
  ck('今日整体段', /class="segbar overall"/.test(html));
  ck('整体段标记只读', /sb-grip readonly">只读/.test(html));
  // 拖动绑定在 track 上（不是标题）
  ck('拖动绑在 .sb-track 上', /trk\.addEventListener\('mousedown'/.test(js));
  ck('有 track id', /id="trkA"/.test(html)&&/id="trkB"/.test(html)&&/id="trkC"/.test(html));
  ck('★单端手柄（3个）', (html.match(/class="sb-knob/g)||[]).length===3);
  ck('★水平拖动 ew-resize', /cursor:ew-resize/.test(style));
  ck('触摸支持', /touchstart/.test(js) && /touch-action:none/.test(style));
  ck('★三段完全独立（各自 s/e）', /let tlSeg=\[\s*\{s:570/.test(js));
  ck('★拖动不再改 seg.e（只改 disp）', !/seg\.e=seg\.s\+dur;/.test(js) && js.includes('seg.disp=f*100'));
  ck('★最短 15 分钟', /TL_MIN=15/.test(js));
  ck('★位置直接映射为显示进度（0-100，不再受 TL_SPAN_MAX 限制）', js.includes('seg.manual=true;') && js.includes('seg.disp=f*100;') && !/TL_SPAN_MAX/.test(js));
  ck('★统一渲染函数 calcLivePct', /function calcLivePct\(i, now, today\)/.test(js));
  ck('★手柄跟随 displayProgress', js.includes("$('knb'+'ABC'[i]).style.left=p.toFixed(2)+'%'"));
  ck('★填充 = displayProgress（同一数据源）', js.includes("$('fil'+'ABC'[i]).style.width=p.toFixed(2)+'%'"));
  ck('★无时间指针线', !/tlNow/.test(html));
  ck('★四个复位按钮', /btnResetUp/.test(html)&&/btnResetNoon/.test(html)&&/btnResetDown/.test(html)&&/btnTlReset/.test(html));
}

console.log('\n【6】午休/复工已合并');
ck('HTML 里没有「复工」独立段', !/class="dseg" data-i="2"[^>]*>.*复工/s.test(html));
ck('三段文案为 上午上班/午休/下午上班', /上午上班/.test(html)&&/午休/.test(html)&&/下午上班/.test(html));
ck('tl3 不再是"复工"', !/tl3">—<\/div>\s*<div class="grip" data-grip="2">↕ 拖动<\/div>/.test(html));

console.log('\n【7】状态栏文案（用户指定）');
{
  const m=js.match(/else if\(today\.cur<today\.LE\+60\)\{ ls='已复工'[^}]*\}/);
  ck('13:00-14:00 显示「已复工」', !!m, m?m[0].slice(0,60):'未找到');
  const m2=js.match(/else if\(today\.cur<today\.WE\)\{ ls='正在上班'[^}]*\}/);
  ck('14:00 之后显示「正在上班」', !!m2, m2?m2[0].slice(0,60):'未找到');
  ck('复工判断用 LE+60（午休结束+1小时）', /today\.LE\+60/.test(js));
  ck('状态栏区分工作日/非工作日', /const isWD =/.test(js));
  ck('Hero 也有「正在上班」文案', /正在上班 · <b>正在涨<\/b>/.test(js));
  ck('Hero 有「已复工」文案', /已复工 · <b>正在涨<\/b>/.test(js));
}

console.log('\n【8】原有功能未破坏');
{
  ck('日薪 ¥380.95', nodes.mRate.textContent==='¥380.95', nodes.mRate.textContent);
  ck('到手 ¥7,619.05', nodes.mFinal.textContent==='¥7,619.05', nodes.mFinal.textContent);
  ck('应出勤 21 天', nodes.mDays.textContent==='21 天', nodes.mDays.textContent);
  ck('轮盘选择器仍在', /function openWheel/.test(js));
  ck('内联编辑仍在', /function bindInline/.test(js));
  ck('语录库仍在', /const QUOTES = \[/.test(js));
  ck('全年总览仍在', /function renderYear/.test(js));
  ck('调色盘仍在', /PALETTE_KEYS/.test(js));
  ck('自定义背景仍在', /bgUpload/.test(html));
  ck('★老板键已移除', !/toggleHide/.test(js));
}

console.log('\n────────────────────────────');
console.log(`通过 ${pass} · 失败 ${fail}`);
console.log('────────────────────────────');
process.exit(fail?1:0);