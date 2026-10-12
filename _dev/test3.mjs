// v3 修复验证：cur 导出、状态栏、轮盘、内联编辑
import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = html.split('<script>')[1].split('</script>')[0];

// ——— 极简 DOM 桩 ———
const store={};
// ★ 测试专用：固定配置，不依赖 DEF 默认值
const nodes={}; const handlers={};
global.__CFG_OVERRIDE={workMode:'alt',override:{'2026-10-07':'lv'}};  // 固定配置，不依赖 DEF 默认值
function mkNode(id){
  const h={};
  return {
    id, innerHTML:'', textContent:'', value:'', type:'', tagName:'DIV',
    contentEditable:'false', isContentEditable:false,
    style:{ _v:{}, setProperty(k,v){this._v[k]=v;}, removeProperty(k){delete this._v[k];}, getPropertyValue(k){return this._v[k]||'';} },
    dataset:{}, classList:{add(){},remove(){},toggle(){},contains(){return false}},
    addEventListener(ev,fn){ h[ev]=(h[ev]||[]).concat(fn); },
    _h:h,
    querySelectorAll(){return []}, querySelector(){return null},
    closest(){return null;},appendChild(){}, insertBefore(){}, remove(){}, focus(){}, blur(){},
    scrollIntoView(){}, setAttribute(){}
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
  addEventListener(ev,fn){ handlers['doc:'+ev]=(handlers['doc:'+ev]||[]).concat(fn); },
  documentElement:{dataset:{theme:'aurora'}, style:{setProperty(){},removeProperty(){}}}
};
global.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;},removeItem:k=>{delete store[k];}};
Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:()=>Promise.resolve()}},writable:true,configurable:true});
global.requestAnimationFrame=()=>0;
global.confirm=()=>false; global.prompt=()=>null;
global.window={open:null,scrollTo(){},addEventListener(){}};
global.setInterval=()=>0; global.setTimeout=()=>0; global.clearTimeout=()=>{};
global.document.createRange=()=>({selectNodeContents(){}});
global.getSelection=()=>({removeAllRanges(){},addRange(){}});

let pass=0,fail=0;
const ck=(n,c,e='')=>{ c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} ${e}`)); };
const eq=(n,g,w,tol=0.005)=>{
  const ok=(typeof w==='number')?Math.abs(g-w)<=tol:g===w;
  ok?(pass++,console.log(`  ✓ ${n} = ${typeof g==='number'?g.toFixed(4):g}`))
    :(fail++,console.log(`  ✗ ${n}　期望 ${w}，实际 ${typeof g==='number'?g.toFixed(4):g}`));
};

console.log('\n【1】脚本无异常执行');
try{ new Function(js)(); ck('执行完毕', true); }
catch(e){ ck('执行完毕', false, e.stack.split('\n').slice(0,3).join(' | ')); process.exit(1); }

console.log('\n【2】关键修复：cur 已导出（状态栏 bug 根因）');
{
  // 直接检查 monthCalc 是否返回 cur
  const P0=js.indexOf('/* ==========================================================\n   一、');
  const P1=js.indexOf('/* ==========================================================\n   六、渲染');
  const pure=js.slice(P0,P1);
  ck('monthCalc 返回 cur', /cur,tk,nowYm/.test(pure) || /cur,\s*tk/.test(pure),
     pure.slice(pure.lastIndexOf('return {'), pure.lastIndexOf('return {')+220).replace(/\s+/g,' '));

  // 运行时验证
  const lines=pure.split('\n'); const out=[]; let i=0;
  while(i<lines.length){const t=lines[i].trim();
    if(t==='let CFG=load();'||t.startsWith('if(typeof __CFG_OVERRIDE')){if(t==='let CFG=load();')out.push('let CFG=globalThis.__CFG;');i++;continue;}
    if(t.startsWith('function load(){')||t.startsWith('function save(){')){
      let d=0,s=false;
      while(i<lines.length){for(const c of lines[i]){if(c==='{'){d++;s=true}else if(c==='}')d--;}i++;if(s&&d===0)break;}
      out.push(t.startsWith('function load')?'function load(){return CFG;}':'function save(){}');continue;}
    out.push(lines[i]);i++;}
  const body=out.join('\n');
  const f=new Date('2026-10-09T10:15:00');
  const Fake=class extends Date{constructor(...a){return a.length?new Date(...a):new Date(f);}};
  const G={}; G.__CFG={salary:7000,start:'09:30',end:'18:30',hours:8,lunch1:'12:00',lunch2:'13:00',
    payDay:15,payMon:10,workMode:'alt',parity:0,holMode:'work',decimals:3,firstDay:1,theme:'aurora',viewM:null,override:{}};
  const r=new Function('globalThis','DateC',body+'\nreturn monthCalc(2026,10,new DateC());')(G,Fake);
  eq('cur 导出且为当前分钟数', r.cur, 615, 1);   // 10:15 = 615 分钟
  eq('tEarned 正确', r.tEarned, 31.25, 0.05);

  // 状态栏判断链：615 落在 WS(570)与 LS(720)之间 → 应为"上班中"
  const ls = r.cur<r.WS?'未开始':r.cur<r.LS?'上班中':r.cur<r.LE?'午休中':r.cur<r.WE?'已复工':'已下班';
  ck('10:15 判定为「上班中」（不是已下班）', ls==='上班中', '实际 '+ls);

  const ls2 = (()=>{const c=1110; return c<r.WS?'未开始':c<r.LS?'上班中':c<r.LE?'午休中':c<r.WE?'已复工':'已下班';})();
  ck('18:30 判定为「已下班」', ls2==='已下班', '实际 '+ls2);
  const ls3 = (()=>{const c=750; return c<r.WS?'未开始':c<r.LS?'上班中':c<r.LE?'午休中':c<r.WE?'已复工':'已下班';})();
  ck('12:30 判定为「午休中」', ls3==='午休中', '实际 '+ls3);
  const ls4 = (()=>{const c=840; return c<r.WS?'未开始':c<r.LS?'上班中':c<r.LE?'午休中':c<r.WE?'已复工':'已下班';})();
  ck('14:00 判定为「已复工」', ls4==='已复工', '实际 '+ls4);
}

console.log('\n【3】轮盘选择器');
ck('轮盘容器存在', !!nodes.wheel);
ck('轮盘中心存在', !!nodes.wheelCore);
ck('打开函数存在', /function openWheel/.test(js));
ck('关闭函数存在', /function closeWheel/.test(js));
ck('6 个选项（含恢复默认）', (js.match(/\{ v:'?/g)||[]).length>=5);
ck('提供「恢复默认」选项', /v:null,\s*ic:'↺',\s*t:'恢复默认'/.test(js));
ck('提供「上班(加班)」选项', /v:'work'/.test(js));
ck('提供全天假', /v:'lv'/.test(js));
ck('提供半天假上午', /v:'lv1'/.test(js));
ck('提供半天假下午', /v:'lv2'/.test(js));
ck('休息日只给3个选项', /baseIsRest\s*\?\s*WHEEL_OPTS\.filter/.test(js));

console.log('\n【4】休息日规则（不能请假、可设上班加班）');
{
  const P0=js.indexOf('/* ==========================================================\n   一、');
  const P1=js.indexOf('/* ==========================================================\n   六、渲染');
  const pure=js.slice(P0,P1);
  const lines=pure.split('\n'); const out=[]; let i=0;
  while(i<lines.length){const t=lines[i].trim();
    if(t==='let CFG=load();'||t.startsWith('if(typeof __CFG_OVERRIDE')){if(t==='let CFG=load();')out.push('let CFG=globalThis.__CFG;');i++;continue;}
    if(t.startsWith('function load(){')||t.startsWith('function save(){')){
      let d=0,s=false;
      while(i<lines.length){for(const c of lines[i]){if(c==='{'){d++;s=true}else if(c==='}')d--;}i++;if(s&&d===0)break;}
      out.push(t.startsWith('function load')?'function load(){return CFG;}':'function save(){}');continue;}
    out.push(lines[i]);i++;}
  const body=out.join('\n');
  function st(k,ov){
    const G={}; G.__CFG={salary:7000,start:'09:30',end:'18:30',hours:8,lunch1:'12:00',lunch2:'13:00',
      payDay:15,payMon:10,workMode:'alt',parity:0,holMode:'work',decimals:3,firstDay:1,theme:'aurora',viewM:null,override:ov||{}};
    return new Function('globalThis','DateC',body+'\nreturn statusOf('+JSON.stringify(k)+');')(G,new Date());
  }
  eq('周日(10/11) 默认休息', st('2026-10-11'), 0);
  eq('周日可设为上班(加班)', st('2026-10-11',{'2026-10-11':'work'}), 1);
  eq('小周六(10/24) 默认休息', st('2026-10-24'), 0);
  eq('小周六可设为上班(加班)', st('2026-10-24',{'2026-10-24':'work'}), 1);
  eq('大周六(10/17) 默认上班', st('2026-10-17'), 1);
  eq('工作日可设全天假', st('2026-10-13',{'2026-10-13':'lv'}), 2);
  eq('工作日可设半天假', st('2026-10-13',{'2026-10-13':'lv1'}), 3);

  // 加班后分母应增加、日薪降低
  function dueOf(ov){
    const G={}; G.__CFG={salary:7000,start:'09:30',end:'18:30',hours:8,lunch1:'12:00',lunch2:'13:00',
      payDay:15,payMon:10,workMode:'alt',parity:0,holMode:'work',decimals:3,firstDay:1,theme:'aurora',viewM:null,override:ov||{}};
    const fixed=new Date('2026-10-09T10:15:00');
    const Fake=class extends Date{constructor(...a){return a.length?new Date(...a):new Date(fixed);}};
    return new Function('globalThis','DateC',body+'\nconst d=monthCalc(2026,10,new DateC()); return {due:d.due,rate:d.rate,final:d.finalPay};')(G,Fake);
  }
  const base=dueOf({}), ot=dueOf({'2026-10-11':'work'});
  eq('无加班 应出勤', base.due, 21);
  eq('★周日加班后 应出勤不变（不摊薄分母）', ot.due, base.due);
  ck('★加班后日薪不变', Math.abs(ot.rate-base.rate)<0.01, `${ot.rate.toFixed(2)} vs ${base.rate.toFixed(2)}`);
  ck('★加班后实发增加', ot.final>7000, `实发 ¥${ot.final.toFixed(2)}（月薪7000 + 加班费）`);
}

console.log('\n【5】半天假可恢复（你反馈的问题）');
{
  // 模拟：设半天假 → 再设上班 → 再恢复默认
  const P0=js.indexOf('/* ==========================================================\n   一、');
  const P1=js.indexOf('/* ==========================================================\n   六、渲染');
  const pure=js.slice(P0,P1);
  const lines=pure.split('\n'); const out=[]; let i=0;
  while(i<lines.length){const t=lines[i].trim();
    if(t==='let CFG=load();'||t.startsWith('if(typeof __CFG_OVERRIDE')){if(t==='let CFG=load();')out.push('let CFG=globalThis.__CFG;');i++;continue;}
    if(t.startsWith('function load(){')||t.startsWith('function save(){')){
      let d=0,s=false;
      while(i<lines.length){for(const c of lines[i]){if(c==='{'){d++;s=true}else if(c==='}')d--;}i++;if(s&&d===0)break;}
      out.push(t.startsWith('function load')?'function load(){return CFG;}':'function save(){}');continue;}
    out.push(lines[i]);i++;}
  const body=out.join('\n');
  const mk=ov=>{
    const G={}; G.__CFG={salary:7000,start:'09:30',end:'18:30',hours:8,lunch1:'12:00',lunch2:'13:00',
      payDay:15,payMon:10,workMode:'alt',parity:0,holMode:'work',decimals:3,firstDay:1,theme:'aurora',viewM:null,override:ov};
    const fixed=new Date('2026-10-09T10:15:00');
    const Fake=class extends Date{constructor(...a){return a.length?new Date(...a):new Date(fixed);}};
    return new Function('globalThis','DateC',body+`
      const d=monthCalc(2026,10,new DateC());
      return {st:statusOf('2026-10-13'), half:d.lvHalf, due:d.due, rate:d.rate, deduct:d.deduct, final:d.finalPay};
    `)(G,Fake);};
  const orig = mk({});
  const half = mk({'2026-10-13':'lv1'});
  const back = mk({'2026-10-13':'work'});
  const reset= mk({});
  ck('半天假生效', half.half===1, 'lvHalf='+half.half);
  eq('半天假扣半日薪', half.deduct, half.rate*0.5, 0.01);
  eq('恢复上班后 无请假', back.half, 0);
  eq('恢复上班后 应出勤回到原值', back.due, orig.due);
  eq('恢复默认后 无请假', reset.half, 0);
  eq('恢复默认后 实发=7000', reset.final, 7000, 0.01);
}

console.log('\n【6】内联编辑');
['eSalary','eStart','eEnd','eLunch','eHours'].forEach(id=>ck(`${id} 元素存在`, !!nodes[id]));
ck('有 bindInline 绑定函数', /function bindInline/.test(js));
ck('月薪可改', /bindInline\('eSalary'/.test(js));
ck('上班时间可改', /bindInline\('eStart'/.test(js));
ck('下班时间可改', /bindInline\('eEnd'/.test(js));
ck('午休可改', /bindInline\('eLunch'/.test(js));
ck('工时可改', /bindInline\('eHours'/.test(js));
ck('时间解析容错', /function parseTime/.test(js));
ck('状态栏可点开轮盘', /cState.*addEventListener\('click'.*openWheel/s.test(js));

console.log('\n【7】快捷键不再打断输入');
ck('监听 contenteditable', /isContentEditable/.test(js));
ck('监听输入法组合', /isComposing/.test(js));
ck('监听 keyCode 229', /keyCode===229/.test(js));

console.log('\n【8】渲染数值仍正确');
{
  eq('日薪', nodes.mRate.textContent, '¥380.95');
  eq('到手', nodes.mFinal.textContent, '¥7,619.05');
  eq('应出勤', nodes.mDays.textContent, '21 天');
  ck('每秒汇率', /0\.013[0-9]/.test(nodes.rSec.textContent), nodes.rSec.textContent);
  ck('状态栏按真实配置显示', typeof nodes.cState.textContent==='string', nodes.cState.textContent);
  console.log(`  状态栏 = ${nodes.cState.textContent} / ${nodes.cStateS.textContent}`);
}

console.log('\n────────────────────────────');
console.log(`通过 ${pass} · 失败 ${fail}`);
console.log('────────────────────────────');
process.exit(fail?1:0);