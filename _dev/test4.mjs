// v4 全面测试：语录 / 评级 / 消费力 / 皮肤 / 调色盘 / 背景 / 拖动时间轴
import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = html.split('<script>')[1].split('</script>')[0];

// ===== DOM 桩 =====
const store={};
// ★ 测试专用：固定配置，不依赖 DEF 默认值
const nodes={};
global.__CFG_OVERRIDE={workMode:'alt',override:{'2026-10-07':'lv'}};  // 固定配置，不依赖 DEF 默认值
function mkNode(id){
  const h={};
  return {
    id, innerHTML:'', textContent:'', value:'', type:'', tagName:'DIV',
    contentEditable:'false', isContentEditable:false, files:null,
    style:{ _v:{}, setProperty(k,v){this._v[k]=v;}, removeProperty(k){delete this._v[k];}, getPropertyValue(k){return this._v[k]||'';} },
    dataset:{}, classList:{add(){},remove(){},toggle(){},contains(){return false}},
    addEventListener(ev,fn){ h[ev]=(h[ev]||[]).concat(fn); },
    _h:h, click(){ (h['click']||[]).forEach(f=>f({target:this,preventDefault(){}})); },
    querySelectorAll(){return []}, querySelector(){return null},
    closest(){return null;},appendChild(){}, insertBefore(){}, remove(){}, focus(){}, blur(){},
    scrollIntoView(){}, setAttribute(){}, getAttribute(){return null}, removeAttribute(){}
  };
}
const docHandlers={};
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
  addEventListener(ev,fn){ (docHandlers[ev]=docHandlers[ev]||[]).push(fn); },
  documentElement:{dataset:{theme:'keyboard'}, style:{setProperty(){},removeProperty(){}}}
};
global.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;},removeItem:k=>{delete store[k];}};
Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:()=>Promise.resolve()}},writable:true,configurable:true});
global.requestAnimationFrame=()=>0;
global.confirm=()=>true; global.prompt=()=>null;
global.window={open:null,scrollTo(){},addEventListener(){}};
global.setInterval=()=>0; global.setTimeout=(fn)=>{ try{fn();}catch(e){} return 0; };
global.clearTimeout=()=>{};
global.document.createRange=()=>({selectNodeContents(){}});
global.getSelection=()=>({removeAllRanges(){},addRange(){}});

let pass=0,fail=0;
const ck=(n,c,e='')=>{ c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} ${e}`)); };
const eq=(n,g,w,tol=0.005)=>{
  const ok=(typeof w==='number')?Math.abs(g-w)<=tol:g===w;
  ok?(pass++,console.log(`  ✓ ${n} = ${typeof g==='number'?g.toFixed(4):g}`))
    :(fail++,console.log(`  ✗ ${n}　期望 ${w}，实际 ${typeof g==='number'?g.toFixed(4):g}`));
};

console.log('\n【1】脚本执行');
try{ new Function(js)(); ck('无异常', true); }
catch(e){ ck('无异常', false, e.stack.split('\n').slice(0,4).join(' | ')); process.exit(1); }

console.log('\n【2】语录库');
{
  // 从 index.html 抽取语录数据
  const qm=js.match(/const QUOTES = \[([\s\S]*?)\n\];/);
  ck('QUOTES 已定义', !!qm);
  const n=(js.match(/\{t:'/g)||[]).length;
  console.log(`  语录条数: ${n}`);
  ck('语录 ≥ 100 条', n>=100, `实际 ${n}`);
  const workN=(js.match(/k:'work'/g)||[]).length;
  const offN=(js.match(/k:'off'/g)||[]).length;
  const allN=(js.match(/k:'all'/g)||[]).length;
  console.log(`  上班 ${workN} / 下班 ${offN} / 全天 ${allN}`);
  ck('上班语录 ≥ 60', workN>=60, `实际 ${workN}`);
  ck('下班语录 ≥ 30', offN>=30, `实际 ${offN}`);
  ck('有刷新按钮', !!nodes.btnQuote);
  ck('语录有内容', (nodes.quoteText.innerHTML||'').length>0 || (nodes.quoteText.textContent||'').length>0);
}

console.log('\n【3】评级系统');
{
  ck('RANKS 已定义', /const RANKS = \[/.test(js));
  const rn=(js.match(/key:'/g)||[]).length;
  ck('评级 ≥ 8 级', rn>=8, `实际 ${rn}`);
  ck('有「拉完了」', /name:'拉完了'/.test(js));
  ck('有「夯爆了」', /name:'夯爆了'/.test(js));
  ck('getRank 函数存在', /function getRank/.test(js));
  ck('双维度评级卡元素齐全',
     ['rkTEmoji','rkTName','rkTDesc','rkTBar','rkTNum','rkMEmoji','rkMName','rkMDesc','rkMBar','rkMNum'].every(id=>!!nodes[id]));
  ck('今日评级已渲染', nodes.rkTName.textContent!=='', 'rkTName="'+nodes.rkTName.textContent+'"');
  ck('本月评级已渲染', nodes.rkMName.textContent!=='', 'rkMName="'+nodes.rkMName.textContent+'"');
  console.log(`  今日: ${nodes.rkTEmoji.textContent} ${nodes.rkTName.textContent}`);
  console.log(`  本月: ${nodes.rkMEmoji.textContent} ${nodes.rkMName.textContent}`);
}

console.log('\n【4】购物力对照');
{
  ck('shoppingLineLive 函数存在', /function shoppingLineLive/.test(js));
  ck('getShoppingLive 函数存在', /function getShoppingLive/.test(js));
  ck('SHOPPING 表存在', /const SHOPPING=\[/.test(js));
  ck('有 iPhone 16', /iPhone 16/.test(js));
  ck('有 iPhone 16 Pro Max', /iPhone 16 Pro Max/.test(js));
  ck('购物力已渲染', (nodes.shopLine.innerHTML||'').length>0);
  ck('商品列表已渲染', (nodes.shopItems.innerHTML.match(/class="shop-item/g)||[]).length>=2);
  console.log(`  购物力: ${nodes.shopLine.innerHTML.replace(/<[^>]+>/g,'')}`);
  const items=nodes.shopItems.innerHTML.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  console.log(`  商品: ${items.slice(0,120)}`);
}

console.log('\n【5】皮肤系统（3 新 + 3 旧）');
{
  const themes=[...html.matchAll(/\[data-theme="(\w+)"\]\{/g)].map(m=>m[1]);
  console.log('  皮肤: '+themes.join(', '));
  ck('有键盘科技皮肤', themes.includes('keyboard'));
  ck('有宇宙星球皮肤', themes.includes('cosmos'));
  ck('有呆猫八条皮肤', themes.includes('cat8'));
  ck('共 7 套皮肤CSS（含sakura兼容）', themes.length===7, `实际 ${themes.length}`);
  const sk=(js.match(/\{id:'(keyboard|cosmos|cat8|aurora|matrix|sunset)'/g)||[]).length;
  ck('皮肤注册表 6 项', sk===6, `实际 ${sk}`);
  // 键帽质感
  ck('键盘皮肤有键帽阴影', /\[data-theme="keyboard"\] \.card[\s\S]{0,200}inset 0 1px 0/.test(html));
  ck('键盘皮肤有扫描灯带', /kbScan/.test(html));
  // 宇宙
  ck('宇宙皮肤有星点闪烁', /twinkle/.test(html));
  ck('宇宙皮肤有球面高光', /radial-gradient\(circle at 28% 12%/.test(html));
  ck('宇宙皮肤有轨道环', /\[data-theme="cosmos"\] \.card::after/.test(html));
  // 八条
  ck('八条皮肤橙色定义', /--acc:#ff9f43/.test(html));
  ck('八条皮肤粉色辅助', /--acc2:#ff6b9d/.test(html));
  ck('八条皮肤有猫爪进度点', /\[data-theme="cat8"\] \.fill::after/.test(html));
  ck('八条皮肤浅色背景', /--bg:#fff6ec/.test(html));
  ck('applyTheme 函数存在', /function applyTheme/.test(js));
}

console.log('\n【6】八条 SVG 形象');
{
  ck('cat8SVG 函数存在', /function cat8SVG/.test(js));
  ck('有猫身 ellipse', /ellipse cx="32" cy="44"/.test(js));
  ck('有耳朵三角', /l-2-11 l11 5z/.test(js));
  ck('有虎斑头顶纹', /stroke="#aab3bd"/.test(js));
  ck('有胡须', /胡须|M14 38 h-9/.test(js));
  ck('有前爪', /前爪/.test(js));
  ck('有吐舌头', /ff8fa8/.test(js));
  const moods=(js.match(/normal:\s*`|happy:\s*`|dead:\s*`|wink:\s*`/g)||[]).length;
  ck('至少 3 种表情', moods>=3, `实际 ${moods}`);
  ck('catMood 函数存在', /function catMood/.test(js));
}

console.log('\n【7】调色盘');
{
  ck('palette 元素存在', !!nodes.palette);
  ck('PALETTE_KEYS 已定义', /const PALETTE_KEYS=\[/.test(js));
  const n=(js.match(/\{k:'--/g)||[]).length;
  ck('可调项 ≥ 9 个', n>=9, `实际 ${n}`);
  ck('调色盘已渲染', (nodes.palette.innerHTML.match(/class="pal-item"/g)||[]).length>=9);
  ck('每项有 color input', (nodes.palette.innerHTML.match(/type="color"/g)||[]).length>=9);
  ck('有恢复默认色按钮', !!nodes.btnPalReset);
  ck('renderPalette 函数存在', /function renderPalette/.test(js));
  ck('换皮肤会清空自定义色', /CFG\.palette=\{\}/.test(js));
}

console.log('\n【8】自定义背景');
{
  ck('上传区存在', !!nodes.bgUpload);
  ck('文件 input', !!nodes.bgFile);
  ck('accept=image', /accept="image\/\*"/.test(html));
  ck('预览元素', !!nodes.bgPrev);
  ck('压暗选择', !!nodes.bgDim);
  ck('清除按钮', !!nodes.btnBgClear);
  ck('has-bgimg 样式', /body\.has-bgimg/.test(html));
  ck('配置含 bgImg', /bgImg:''/.test(js));
  ck('配置含 bgDim', /bgDim:0\.35/.test(js));
  ck('applyTheme 处理背景', /CFG\.bgImg/.test(js));
  ck('背景适配用压暗层', /linear-gradient\(rgba\(0,0,0/.test(js));
}

console.log('\n【9】可拖动时间轴（三段）');
{
  ck('segbars 容器', /class="segbars"/.test(html));
  ck('三段 + 整体', (html.split('<script>')[0].match(/class="segbar[\s"]/g)||[]).length===4,
     `实际 ${(html.split('<script>')[0].match(/class="segbar[\s"]/g)||[]).length}`);
  ck('三个拖动手柄（单端）', (html.match(/class="sb-knob/g)||[]).length===3, `实际 ${(html.match(/class="sb-knob/g)||[]).length}`);
  ck('三个可拖动 track', /id="trkA"/.test(html)&&/id="trkB"/.test(html)&&/id="trkC"/.test(html));
  ck('三个时间轴手柄', ['knbA','knbB','knbC'].every(id=>html.includes(id)));
  ck('整体只读轨道', /id="trkO"/.test(html));
  ck('复位按钮', !!nodes.btnTlReset);
  ck('initDragTL 函数', /function initDragTL/.test(js));
  ck('renderDragTL 函数', /function renderDragTL/.test(js));
  ck('支持鼠标拖动', /trk\.addEventListener\('mousedown'/.test(js));
  ck('支持触摸拖动', /touchstart/.test(js));
  ck('三个时间轴手柄（单端）', ['knbA','knbB','knbC'].every(id=>html.includes(id)));
  ck('水平拖动', /cursor:ew-resize/.test(html.split('<style>')[1].split('</style>')[0]));
  ck('时间轴已渲染值', nodes.tlA1.textContent.match(/^\d{2}:\d{2}$/)!==null, 'tlA1="'+nodes.tlA1.textContent+'"');
  console.log(`  时间轴: ${nodes.tlA1.textContent}→${nodes.tlA2.textContent} | ${nodes.tlB1.textContent}→${nodes.tlB2.textContent} | ${nodes.tlC1.textContent}→${nodes.tlC2.textContent}`);
  ck('时间顺序正确', nodes.tlA1.textContent < nodes.tlA2.textContent
     && nodes.tlA2.textContent <= nodes.tlB2.textContent
     && nodes.tlB2.textContent <= nodes.tlC1.textContent
     && nodes.tlC1.textContent < nodes.tlC2.textContent);
  ck('今日整体已渲染', (nodes.txtON.innerHTML||'').includes('净工作'), nodes.txtON.innerHTML);
  ck('显示净工作/午休/已上', /净工作/.test(nodes.txtON.innerHTML)&&/午休/.test(nodes.txtON.innerHTML)&&/当前已上/.test(nodes.txtON.innerHTML), (nodes.txtON.innerHTML||'').replace(/<[^>]+>/g,''));
}

console.log('\n【10】删除「做六休一」');
{
  ck('设置里已无 six', !/data-v="six"/.test(html));
  ck('WORKNAME 里已无 six', !/six:/.test(js));
  ck('baseStatus 里已无 six', !/workMode==='six'/.test(js));
  ck('设置里 3 种制度按钮', (html.match(/data-v="(alt|double|single)"/g)||[]).length>=3);
  ck('设置里有 3 种制度按钮', /id="segWork"[\s\S]{0,200}data-v="alt"/.test(html) && /id="segWork"[\s\S]{0,200}data-v="double"/.test(html));
  ck('注释说明了三种制度', /double=\S*双休/.test(js) && /alt=\S*大小周/.test(js));
}

console.log('\n【11】原有功能未破坏');
{
  eq('日薪', nodes.mRate.textContent, '¥380.95');
  eq('到手', nodes.mFinal.textContent, '¥7,619.05');
  eq('应出勤', nodes.mDays.textContent, '21 天');
  ck('轮盘仍在', /function openWheel/.test(js));
  ck('内联编辑仍在', /function bindInline/.test(js));
  ck('★老板键已移除（用户要求）', !/toggleHide/.test(js) && !/btnHide/.test(js));
  ck('全年总览仍在', /function renderYear/.test(js));
  ck('日历仍在', /function buildCal/.test(js));
  ck('状态栏可点开轮盘', /cState.*openWheel/s.test(js));
}

console.log('\n────────────────────────────');
console.log(`通过 ${pass} · 失败 ${fail}`);
console.log('────────────────────────────');
process.exit(fail?1:0);