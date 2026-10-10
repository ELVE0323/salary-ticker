// v6 测试：装饰实装 / 双维度评级 / 每月日历可打开
import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const js   = html.split('<script>')[1].split('</script>')[0];
const style = html.split('<style>')[1].split('</style>')[0];
const HTML_ONLY = html.split('<script>')[0];

// ===== DOM 桩：这次要能记录 appendChild 的调用，才能验证装饰真的注入了 =====
const store={};
// ★ 测试专用：固定配置，不依赖 DEF 默认值
const nodes={};
global.__CFG_OVERRIDE={workMode:'alt',override:{'2026-10-07':'lv'}};  // 固定配置，不依赖 DEF 默认值
function mkNode(id){
  const h={}; const kids=[];
  return {
    id, innerHTML:'', textContent:'', value:'', type:'', tagName:'DIV',
    contentEditable:'false', isContentEditable:false,
    style:{_v:{},setProperty(k,v){this._v[k]=v;},removeProperty(k){delete this._v[k];},getPropertyValue(k){return this._v[k]||'';}},
    dataset:{}, _kids:kids,
    classList:{_s:new Set(),add(...c){c.forEach(x=>this._s.add(x));},remove(...c){c.forEach(x=>this._s.delete(x));},
               toggle(c){this._s.has(c)?this._s.delete(c):this._s.add(c);},contains(c){return this._s.has(c);}},
    addEventListener(ev,fn){ h[ev]=(h[ev]||[]).concat(fn); },
    _h:h,
    getBoundingClientRect(){ return {left:0,width:100,top:0,height:16}; },
    closest(){ return null; },
    appendChild(c){ kids.push(c); return c; },
    insertBefore(c){ kids.push(c); return c; },
    remove(){}, focus(){}, blur(){}, scrollIntoView(){},
    setAttribute(){}, getAttribute(){return null}, removeAttribute(){},
    querySelectorAll(){ return []; }, querySelector(){ return null; },
  };
}
// 需要被 querySelector 找到的元素
const byClass={};
global.document={
  body: mkNode('body'),
  getElementById(id){ return nodes[id]||(nodes[id]=mkNode(id)); },
  querySelectorAll(sel){
    if(sel==='.skin-deco') return Object.values(nodes).flatMap(n=>n._kids).filter(k=>(k.className||'').includes('skin-deco'));
    if(sel.includes('.day')) return Array.from({length:31},(_,i)=>{
      const el=mkNode('d'+i); el.dataset.k=`2026-10-${String(i+1).padStart(2,'0')}`; return el;});
    if(sel.includes('cell')||sel.includes('rate')) return [mkClass('cell1'),mkClass('cell2'),mkClass('cell3'),mkClass('cell4')];
    if(sel.includes('mcard')) return [];
    return [];
  },
  querySelector(sel){
    if(sel==='.hero') return byClass.hero||(byClass.hero=mkClass('hero'));
    if(sel==='.rankcard') return byClass.rankcard||(byClass.rankcard=mkClass('rankcard'));
    return null;
  },
  createElement(t){ return mkNode('new-'+t); },
  createElementNS(ns,t){ return mkNode('svg'); },
  addEventListener(){},
  documentElement:{dataset:{theme:'keyboard'}, style:{setProperty(){},removeProperty(){}}}
};
function mkClass(c){ const n=mkNode(c); n.className=c; n._cls=c; return n; }

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

console.log('\n【2】decoDone 死锁已修');
ck('无 decoDone 变量', !/decoDone/.test(js), '残留引用: '+((js.match(/decoDone/g)||[]).length)+' 处');
ck('改用 decoTheme 做幂等键', /let decoTheme=''/.test(js));
ck('injectDecor 按主题判重', /if\(decoTheme===CFG\.theme\) return;/.test(js));
ck('有 clearDeco 函数', /function clearDeco/.test(js));
ck('切主题会重注入', /applyTheme\(\); renderSkins\(\); renderPalette\(\); injectDecor\(\)/.test(js));

console.log('\n【3】隐形字符已清（.tools 曾被吃掉 display:flex）');
ck('.tools 有 display:flex', /\.tools\{display:flex/.test(style), /display\s*\u034f/.test(style)?'仍含隐形字符 U+034F':'');
const weird=[...style].filter(c=>c.charCodeAt(0)>=0x2000&&c.charCodeAt(0)<0x2070&&c!=='–'&&c!=='—'&&c!=='…');
ck('CSS 无隐形控制字符', weird.length===0, weird.map(c=>'U+'+c.charCodeAt(0).toString(16)).join(','));

console.log('\n【4】键盘科技装饰（实装到卡片，不只换色）');
{
  ck('kb-mini 迷你键盘', /d\.className='skin-deco kb-mini'/.test(js));
  ck('键盘有 ESC/F1/CTRL/⏎ 键帽', /ESC/.test(js)&&/F1/.test(js)&&/CTRL/.test(js)&&/⏎/.test(js));
  ck('多行键盘布局', /class="kb-row"/.test(js) && (js.match(/class="kb-row"/g)||[]).length===1 && /\.kb-row\{/.test(style));
  ck('kb-led 轴心指示灯', /d\.className='skin-deco kb-led'/.test(js) && /\.kb-led\{/.test(style));
  ck('kb-rain 代码雨', /kb-rain/.test(js) && /rainFall/.test(style));
  ck('挂到 .hero 上', /querySelector\('\.hero'\)/.test(js));
  ck('挂到 .cell 上', /querySelectorAll\('\.cell'\)/.test(js));
  ck('mini 有 3D键帽阴影', /inset 0 -1\.5px 0 rgba\(0,0,0,\.6\)/.test(style));
  ck('LED 有呼吸动画', /@keyframes kbLed/.test(style));
  ck('代码雨有下落动画', /@keyframes rainFall/.test(style));
  ck('小屏隐藏 mini', /max-width:520px\)\{ \.kb-mini\{display:none\}/.test(style));
}

console.log('\n【5】宇宙星球装饰（实装到卡片）');
{
  ck('cosmos-hero 星环', /cosmos-hero/.test(js) && /class="orbit o1"/.test(js));
  ck('三层轨道', (js.match(/class="orbit/g)||[]).length===3);
  ck('三颗行星', /class="planet p[123]"/.test(js));
  ck('行星有辉光', /\.p1\{background:#a78bfa;box-shadow/.test(style));
  ck('轨道有旋转动画', /@keyframes spin/.test(style) && /animation:spin 26s/.test(style));
  ck('cosmos-dot 小行星点', /cosmos-dot/.test(js) && /querySelectorAll\('\.rate'\)/.test(js));
  ck('cosmos-meteor 陨石', /cosmos-meteor/.test(js) && (js.match(/class="m[123]"/g)||[]).length===3);
  ck('陨石有下落动画', /@keyframes meteor/.test(style));
  ck('spark 星星闪烁', /@keyframes twinkle/.test(style));
  ck('spark 有多个', (js.match(/class="spark/g)||[]).length>=4);
}

console.log('\n【6】八条装饰');
{
  ck('语录卡有八条 id=cat8Quote', /id='cat8Quote'/.test(js));
  ck('评级卡有八条 id=cat8Rank', /id='cat8Rank'/.test(js));
  ck('updateCat8 只换内容', /function updateCat8/.test(js));
  ck('表情跟随状态', /updateCat8\(catMood\(today\.tStatus\)\)/.test(js));
  ck('cat8-peek 有基础定位', /\.cat8-peek\{/.test(style));
  ck('猫爪印在 .cell 上', /data-theme="cat8"\] \.cell::after/.test(style));
}

console.log('\n【7】双维度评级');
{
  ck('今日评级卡', /id="rankTodayCard"/.test(html));
  ck('本月评级卡', /id="rankMonthCard"/.test(html));
  ck('今日用 today.tEarned', /CUR_T=\{\s*tEarnedLive: today\.tEarned/.test(js));
  ck('本月用 d.earned', /mEarned: d\.earned/.test(js));
  ck('本月基准是 finalPay', /mFinal: d\.finalPay/.test(js));
  ck('两个 getRankByRatio 调用', (js.match(/getRankByRatio\(/g)||[]).length>=3);
  ck('rkTBar 今日进度条', /rkTBar/.test(js));
  ck('rkMBar 本月进度条', /rkMBar/.test(js));
  ck('有 rank-tag 标签', /class="rank-tag"/.test(html));
  ck('有 rank-num 数值', /class="rank-num"/.test(html));
}

console.log('\n【8】购物力维度切换');
{
  ck('有 shopSeg 切换器', /id="shopSeg"/.test(html));
  ck('两个按钮：今日/本月', /data-v="today"/.test(html) && /data-v="month"/.test(html));
  ck('shopDim 变量', /let shopDim='today'/.test(js));
  ck('默认选中今日', /data-v="today" class="on"/.test(html));
  ck('切换逻辑存在', /shopDim=b\.dataset\.v/.test(js));
  ck('切换后重渲染', /renderRank\(\{ tEarnedLive: CUR_T/.test(js));
}

console.log('\n【9】每月日历可打开');
{
  ck('年卡点击用事件委托', /function initYearClick/.test(js) && /e\.target\.closest\('\.mcard'\)/.test(js));
  ck('委托里设置 viewM', /CFG\.viewM=m; save\(\)/.test(js));
  ck('委托里先 buildCal 再 openSheet', /buildCal\(\);[\s\S]{0,80}openSheet\('calSheet'\)/.test(js));
  ck('★不再隐藏年卡', !/\$\('yearCard'\)\.style\.display='none'/.test(js));
  ck('月卡显示上班天数', /上班 \$\{ot\} 天/.test(js));
  ck('月卡显示日薪时薪', /日薪¥\$\{money\(d\.rate,0\)\} · 时薪¥\$\{money\(d\.hourRate,0\)\}/.test(js));
  ck('月卡有「查看日历 ›」提示', /查看日历 ›/.test(js));
  ck('hover 显示箭头', /\.mcard:hover \.msub \.go\{opacity:1\}/.test(style));
  ck('日历弹窗显示日薪时薪', /日薪 <b>¥\$\{money\(d\.rate,2\)\}<\/b>/.test(js));
  ck('日历弹窗显示时分秒汇率', /每分钟|分钟 <b>/.test(js) && /秒 <b>/.test(js));
  ck('日历弹窗显示上班/假/休息天数', /上班 <b>\$\{workDays\}<\/b> 天/.test(js) && /法定假 <b>\$\{d\.holRest\}<\/b> 天/.test(js));
  ck('calstat 样式', /\.calstat\{/.test(style));
  ck('calstat2 样式', /\.calstat2\{/.test(style));
  ck('calTitle 用 innerHTML', /calTitle'\)\.innerHTML/.test(js));
}

console.log('\n【10】原有功能未破坏');
{
  ck('日薪 ¥380.95', nodes.mRate.textContent==='¥380.95', nodes.mRate.textContent);
  ck('到手 ¥7,619.05', nodes.mFinal.textContent==='¥7,619.05', nodes.mFinal.textContent);
  ck('应出勤 21 天', nodes.mDays.textContent==='21 天', nodes.mDays.textContent);
  ck('轮盘仍在', /function openWheel/.test(js));
  ck('三段进度条仍在', /class="segbar[\s"]/.test(HTML_ONLY));
  ck('状态栏已复工文案', /已复工/.test(js));
  ck('语录库仍在', /const QUOTES = \[/.test(js));
  ck('全年总览仍在', /function renderYear/.test(js));
  ck('调色盘仍在', /PALETTE_KEYS/.test(js));
  ck('sakura 兼容块仍在', /\[data-theme="sakura"\]\{/.test(style));
  ck('VALID_THEMES 仍在', /const VALID_THEMES=\[/.test(js));
}

console.log('\n────────────────────────────');
console.log(`通过 ${pass} · 失败 ${fail}`);
console.log('────────────────────────────');
process.exit(fail?1:0);