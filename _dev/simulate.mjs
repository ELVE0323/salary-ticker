// 用 node 模拟 DOM，检查 render() 全流程无异常 + 各皮肤 CSS 变量齐全
import fs from 'fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const js = html.split('<script>')[1].split('</script>')[0];

// —— 极简 DOM 桩 ——
const store = {};
// ★ 测试专用：固定配置，不依赖 DEF 默认值
global.__CFG_OVERRIDE={workMode:'alt',override:{'2026-10-07':'lv'}};   // 固定配置，不依赖 DEF 默认值
const nodes = {};
function mkNode(id){
  return {
    id, innerHTML:'', textContent:'', style:{_v:{},setProperty(k,v){this._v[k]=v;},removeProperty(k){delete this._v[k];},getPropertyValue(k){return this._v[k]||'';}},
    dataset:{}, classList:{add(){},remove(){},toggle(){},contains(){return false}},
    value:'', type:'', addEventListener(){}, querySelectorAll(){return []},
    querySelector(){return null}, closest(){return null;},appendChild(){}, scrollIntoView(){}
  };
}
const listeners = {};
global.document = {
  body: mkNode('body'),
  getElementById(id){ return nodes[id] || (nodes[id]=mkNode(id)); },
  querySelectorAll(sel){
    if(sel==='#cal .day'||sel.includes('.day')){
      // 日历格子：返回一批可点击的假节点
      return Array.from({length:31},(_,i)=>{
        const el=mkNode('d'+i); el.dataset.k=`2026-10-${String(i+1).padStart(2,'0')}`;
        return el;
      });
    }
    return [];
  },
  querySelector(sel){ return null; },
  createElement(t){ return mkNode('new-'+t); },
  addEventListener(ev,fn){ (listeners[ev]=listeners[ev]||[]).push(fn); },
  documentElement:{ dataset:{theme:'aurora'}, style:{ setProperty(){}, removeProperty(){} } }
};
global.localStorage = {
  getItem:k=>store[k]??null,
  setItem:(k,v)=>{store[k]=v;},
  removeItem:k=>{delete store[k];}
};
// node 内置 navigator 只有 getter，用 defineProperty 覆盖
Object.defineProperty(globalThis,'navigator',{
  value:{ clipboard:{writeText:()=>Promise.resolve()} },
  writable:true, configurable:true
});
global.requestAnimationFrame = ()=>0;
global.confirm = ()=>false;
global.prompt = ()=>null;
global.window={open:null,scrollTo(){},addEventListener(){}};
global.setInterval = ()=>0;
global.setTimeout = ()=>0;
global.clearTimeout = ()=>{};

let fail=0, pass=0;
const ck=(n,c,e='')=>{ c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} ${e}`)); };

console.log('\n【1】脚本整体执行（无 JS 异常）');
try{
  new Function(js)();
  ck('全部脚本执行完毕', true);
}catch(e){
  ck('全部脚本执行完毕', false, e.stack.split('\n').slice(0,3).join(' | '));
}

console.log('\n【2】关键节点被写入内容');
function hasContent(id){ return nodes[id] && (nodes[id].innerHTML!=='' || nodes[id].textContent!==''); }
['heroVal','heroState','rSec','rMin','rHour','tHours','tPct','mGot','mExp','mPct',
 'cDay','cLeft','cTime','cState','mDays','mRate','mFinal','mDeduct','mWorked','mFuture','mHolWork',
 'calcNote','calTitle','yTotal','yDays','yearGrid','yearNote','skins','todayDate','mLabel'
].forEach(id=>ck(`${id} 有内容`, hasContent(id)));

console.log('\n【3】主数值合理性');
const hv=nodes.heroVal.textContent;
console.log(`  heroVal = ${hv}`);
ck('heroVal 是数字', /^[0-9]+(\.[0-9]+)?$/.test(hv), hv);
const rate=nodes.mRate.textContent;
console.log(`  mRate(10月日薪) = ${rate}`);
ck('日薪约 380.95（因10/7请假）', /38[0-9]\./.test(rate), rate);
console.log(`  mFinal(10月到手) = ${nodes.mFinal.textContent}`);
ck('到手约 7619.05', /7[,.]?61[0-9]/.test(nodes.mFinal.textContent), nodes.mFinal.textContent);
console.log(`  mDays(应出勤) = ${nodes.mDays.textContent}`);
ck('应出勤 21 天', /^21/.test(nodes.mDays.textContent.trim()), nodes.mDays.textContent);

console.log('\n【4】每秒汇率是否正确');
const ps=nodes.rSec.textContent;
console.log(`  rSec = ${ps}`);
ck('每秒约 0.013228', /0\.013[0-9]/.test(ps), ps);
const rh=nodes.rHour.textContent;
console.log(`  rHour = ${rh}`);
ck('时薪约 47.62', /47\.6/.test(rh), rh);

console.log('\n【5】六套皮肤切换');
const skins=nodes.skins.innerHTML;
ck('皮肤条渲染出 6 个', (skins.match(/class="skin/g)||[]).length===6, `实际 ${(skins.match(/class="skin/g)||[]).length}`);
['键盘科技','宇宙星球','呆猫八条','极光经典','极客终端','日落暖橙'].forEach(n=>ck(`含皮肤「${n}」`, skins.includes(n)));

// 逐个切换主题，验证 CSS 变量都被赋值
console.log('\n【6】每套皮肤的 CSS 变量齐全');
const themes=['keyboard','cosmos','cat8','aurora','matrix','sunset'];
themes.forEach(th=>{
  const block = html.split(`[data-theme="${th}"]`)[1];
  const body = block ? block.slice(0, block.indexOf('}')) : '';
  const vars=['--bg','--surface','--stroke','--txt','--txt2','--txt3',
              '--acc','--acc2','--ok','--warn','--bad','--num-grad','--btn','--btn-h','--shadow','--glow-line'];
  const lack=vars.filter(v=>!body.includes(v+':'));
  ck(`${th} 定义全部 ${vars.length} 个变量`, lack.length===0, '缺: '+lack.join(','));
});

console.log('\n【7】全年总览渲染');
const yg=nodes.yearGrid.innerHTML;
ck('12 个月卡片', (yg.match(/class="mcard/g)||[]).length===12, `实际 ${(yg.match(/class="mcard/g)||[]).length}`);
const totals=[...yg.matchAll(/¥([0-9,]+)<\/div>/g)].map(m=>m[1]);
console.log(`  各月到手: ${totals.join(' ')}`);
// 全年 = 12×8000 − 10/7 请假一天日薪380.95 = 95619.05
ck('全年合计 = 95619.05（96000 减 10/7 一天假）',
  nodes.yTotal.textContent.replace(/[¥,]/g,'')==='95619',
  nodes.yTotal.textContent);

console.log('\n【8】日历渲染');
const cal=nodes.cal.innerHTML;
ck('日历渲染出格子', cal.includes('class="day'), cal.length);
ck('含 10/31（不漏跨月）', cal.includes('>31<'));
ck('今日高亮', cal.includes('today'));

console.log('\n【9】交互与持久化');
// 节点桩需要在 addEventListener 时记录回调，才能模拟点击
const handlers = {};
['nextM','prevM','btnSet','btnHide','btnCal','btnSave'].forEach(id=>{
  const n = nodes[id] || (nodes[id]=mkNode(id));
  n.addEventListener = (ev,fn)=>{ (handlers[id]=handlers[id]||{})[ev]=fn; };
});
// 重新执行脚本，让按钮绑定上真实的回调
try{ new Function(js)(); }catch(e){}

// 点"下一月"
const beforeLabel = nodes.mLabel.textContent;
if(handlers.nextM && handlers.nextM.click){
  handlers.nextM.click();
}
const afterLabel = nodes.mLabel.textContent;
console.log(`  月份标签: ${beforeLabel} → ${afterLabel}`);
ck('点下一月后标签变化', beforeLabel!==afterLabel, `${beforeLabel} vs ${afterLabel}`);

const saved = store['salary_ticker_v2'];
ck('配置已写入 localStorage', !!saved, `keys=${Object.keys(store)}`);
if(saved){
  const c=JSON.parse(saved);
  console.log(`  主题=${c.theme} 制度=${c.workMode} 节假日=${c.holMode} 小数=${c.decimals} 查看月=${c.viewM}`);
  ck('保存了主题 keyboard', c.theme==='keyboard', 'theme='+c.theme);
  ck('保存了休假制度 alt', c.workMode==='alt');
  ck('保存了节假日规则 work', c.holMode==='work');
  ck('保存了 10/7 请假', c.override && c.override['2026-10-07']==='lv');
  ck('切换月份已持久化', c.viewM===11, 'viewM='+c.viewM);
}

console.log('\n────────────────────────────');
console.log(`通过 ${pass} · 失败 ${fail}`);
console.log('────────────────────────────');
process.exit(fail?1:0);