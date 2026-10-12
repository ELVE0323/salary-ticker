// ============================================================
// 时间轴「真实进度 / 显示进度」分离 —— 13 条验收
// 全部用 mock DOM + 固定时间真跑页面脚本
// ============================================================
import fs from 'fs';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js   = html.split('<script>')[1].split('</script>')[0];

const store={}, nodes={}, errors=[];
function mkNode(id){
  const h={}, kids=[]; const cls={_s:new Set()};
  const obj={ id, innerHTML:'', textContent:'', value:'', type:'', tagName:'DIV',
    contentEditable:'false', isContentEditable:false,
    style:{_v:{},setProperty(k,v){this._v[k]=v;},removeProperty(k){delete this._v[k];},getPropertyValue(k){return this._v[k]||'';}},
    dataset:{}, _kids:kids, className:'',
    classList:{_s:cls._s,
      add(...c){c.forEach(x=>cls._s.add(x)); obj.className=[...cls._s].join(' ');},
      remove(...c){c.forEach(x=>cls._s.delete(x)); obj.className=[...cls._s].join(' ');},
      toggle(c,f){const on=f===undefined?!cls._s.has(c):f; on?cls._s.add(c):cls._s.delete(c); obj.className=[...cls._s].join(' ');},
      contains(c){return cls._s.has(c);}},
    addEventListener(ev,fn){(h[ev]=h[ev]||[]).push(fn);},
    _fire(ev,e){(h[ev]||[]).forEach(fn=>{try{fn(e||{});}catch(err){errors.push(`${id}.${ev}: ${err.message}`); errors.push(String(err.stack).split('\n').slice(0,6).join(' | '));}});},
    getBoundingClientRect(){return {left:0,width:100,top:0,height:20};},
    // 桩：closest 必须返回一个真实节点（真实浏览器里 trk.closest('.segbar') 一定有祖先）
    closest(sel){ return nodes['seg'+(id||'').replace(/^trk/,'')] || mkNode('closest-'+id); },
    appendChild(c){kids.push(c);return c;}, insertBefore(c){kids.push(c);return c;},
    remove(){},focus(){},blur(){},scrollIntoView(){},setAttribute(){},getAttribute(){return null},removeAttribute(){},
    querySelectorAll(){return [];}, querySelector(){return null;},
  };
  return obj;
}
global.document={ body:mkNode('body'), activeElement:null,
  getElementById(id){return nodes[id]||(nodes[id]=mkNode(id));},
  querySelectorAll(sel){
    if(sel==='[data-close]'||sel==='.sheet'||sel==='.time-quick') return [];
    if(sel.includes('.day')) return Array.from({length:31},(_,i)=>{
      const el=mkNode('d'+i); el.dataset.k=`2026-10-${String(i+1).padStart(2,'0')}`; return el;});
    return [];
  },
  querySelector(sel){ if(['.hero','.rankcard','.quotebox'].includes(sel)) return mkNode(sel.slice(1)); return null; },
  createElement(t){return mkNode('new-'+t);}, createElementNS(){return mkNode('svg');},
  addEventListener(){}, documentElement:{dataset:{theme:'keyboard'},style:{colorScheme:'dark',setProperty(){},removeProperty(){}}},
  createRange:()=>({selectNodeContents(){}}),
};
global.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;},removeItem:k=>{delete store[k];}};
Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:()=>Promise.resolve()}},writable:true,configurable:true});
global.requestAnimationFrame=()=>0; global.confirm=()=>true; global.prompt=()=>null;
const winH={};
global.window={open:null,scrollTo(){},
  addEventListener(ev,fn){(winH[ev]=winH[ev]||[]).push(fn);},
  _fire(ev,e){(winH[ev]||[]).forEach(fn=>{try{fn(e||{});}catch(err){errors.push('window.'+ev+': '+err.message);}});}};
global.setInterval=()=>0; global.setTimeout=()=>0; global.clearTimeout=()=>{};
global.getSelection=()=>({removeAllRanges(){},addRange(){}});

const RD=Date;
let FIXED=new Date(2026,9,12,8,0,0).getTime();   // 2026-10-12 周一，08:00
global.Date=class extends RD{
  constructor(...a){return a.length?new RD(...a):new RD(FIXED);}
  static now(){return FIXED;}
};
new Function(js + '\n;globalThis.__T={render, CFG, eggReset,'
  + 'get tlSeg(){return tlSeg}, get eggActive(){return eggActive}, get eggCount(){return eggCount}};')();
const T=()=>globalThis.__T;

// ---------- 工具 ----------
const drag=(idx, frac)=>{
  const ev={preventDefault(){},stopPropagation(){},clientX:frac*100,touches:[{clientX:frac*100}]};
  nodes['trk'+'ABC'[idx]]._fire('mousedown',ev);
  global.window._fire('mousemove',ev);
  global.window._fire('mouseup',{});
};
const click=(id)=>nodes[id]._fire('click',{preventDefault(){},stopPropagation(){}});
const setTime=(h,m)=>{ FIXED=new Date(2026,9,12,h,m,0).getTime(); };
const tick=()=>globalThis.__T.render();         // 模拟 requestAnimationFrame 一帧
const S=()=>globalThis.__T.tlSeg;
const pct=id=>nodes[id].textContent;
const fil=id=>parseFloat(nodes[id].style.width);
const knb=id=>parseFloat(nodes[id].style.left);
const pre=id=>({l:parseFloat(nodes[id].style.left),w:parseFloat(nodes[id].style.width)});
const live=()=>S().map(s=>s.live);
const disp=()=>S().map(s=>s.disp);
const manual=()=>S().map(s=>!!s.manual);

let pass=0, fail=0;
const ck=(n,c,x='')=>{ c?(pass++,console.log('  ✓ '+n)):(fail++,console.log('  ✗ '+n+(x?' → '+x:''))); };

console.log('配置: 上班 09:00 下班 18:00 午休 12:00-13:00；固定日期 2026-10-12（周一）\n');

// ============ 1. 上班前：三阶段均为 0% ============
console.log('【验收1】08:00 上班前 → 三条 live 全 0');
setTime(8,0); tick();
ck('live = [0,0,0]', JSON.stringify(live())==='[0,0,0]', JSON.stringify(live()));
ck('disp = [0,0,0]', JSON.stringify(disp())==='[0,0,0]', JSON.stringify(disp()));
ck('三条百分比文字都是 0%', pct('pctA')==='0%'&&pct('pctB')==='0%'&&pct('pctC')==='0%', pct('pctA')+'/'+pct('pctB')+'/'+pct('pctC'));
ck('三条填充都是 0.00%', fil('filA')===0&&fil('filB')===0&&fil('filC')===0);

// ============ 2. 上午工作期间：上午随真实时间变化 ============
console.log('\n【验收2】09:30 上午工作中 → 上午随真实时间推进');
setTime(9,30); tick();   // 上午已过 30/180 = 16.67%
ck('live = [16.67, 0, 0]', live()[0].toFixed(2)==='16.67' && live()[1]===0 && live()[2]===0, JSON.stringify(live()));
ck('disp 跟随 live', disp()[0].toFixed(2)==='16.67', JSON.stringify(disp()));
ck('pctA 显示 17%', pct('pctA')==='17%', pct('pctA'));
ck('滑块/填充/文字同源', Math.abs(knb('knbA')-fil('filA'))<0.01 && fil('filA').toFixed(2)==='16.67');
ck('斜纹从 disp 开始', Math.abs(pre('preA').l-16.67)<0.01 && Math.abs(pre('preA').w-83.33)<0.01, JSON.stringify(pre('preA')));

setTime(10,30); tick();  // 上午已过 90/180 = 50%
ck('10:30 → live[0]=50', live()[0].toFixed(2)==='50.00', JSON.stringify(live()));
ck('pctA 显示 50%', pct('pctA')==='50%', pct('pctA'));

// ============ 3. 上午结束后：上午 100% ============
console.log('\n【验收3】12:30 上午已结束 → 上午 100%');
setTime(12,30); tick();
ck('live = [100, 50, 0]', live()[0]===100 && live()[1].toFixed(2)==='50.00' && live()[2]===0, JSON.stringify(live()));
ck('pctA=100% / pctB=50% / pctC=0%', pct('pctA')==='100%'&&pct('pctB')==='50%'&&pct('pctC')==='0%');

// ============ 4. 午休期间 ============
console.log('\n【验收4】12:00 午休开始 / 12:20 午休中 → 上午100，午休实时，下午0');
setTime(12,0); tick();
ck('12:00 → live = [100,0,0]', live()[0]===100&&live()[1]===0&&live()[2]===0, JSON.stringify(live()));
setTime(12,20); tick();  // 午休已过 20/60 = 33.33%
ck('12:20 → live = [100, 33.33, 0]', live()[0]===100&&live()[1].toFixed(2)==='33.33'&&live()[2]===0, JSON.stringify(live()));
ck('pctA=100% pctB=33% pctC=0%', pct('pctA')==='100%'&&pct('pctB')==='33%'&&pct('pctC')==='0%');

// ============ 5. 下午工作期间 ============
console.log('\n【验收5】15:00 下午工作中 → 上午/午休 100，下午实时');
setTime(15,0); tick();   // 下午已过 120/300 = 40%
ck('live = [100, 100, 40]', live()[0]===100&&live()[1]===100&&live()[2].toFixed(2)==='40.00', JSON.stringify(live()));
ck('pctA=100% pctB=100% pctC=40%', pct('pctA')==='100%'&&pct('pctB')==='100%'&&pct('pctC')==='40%');
ck('滑块/填充/文字一致', Math.abs(knb('knbC')-fil('filC'))<0.01 && pct('pctC')==='40%');

setTime(17,59); tick();   // 下午已过 299/300 = 99.67%
ck('17:59 → live[2] 约 99.67%', Math.abs(live()[2]-99.67)<0.05, JSON.stringify(live()));

// ============ 6. 手动拖动后不被真实时间覆盖 ============
console.log('\n【验收6】把上午拖到 30% 后松手，真实时间变了也不覆盖');
setTime(9,30); tick();                       // live[0]=16.67
drag(0, 0.30);                               // 拖到 30%
ck('松手后 disp[0] 停在 30%', disp()[0].toFixed(2)==='30.00', JSON.stringify(disp()));
ck('manual[0]=true', manual()[0]===true);
ck('pctA 显示 30%', pct('pctA')==='30%', pct('pctA'));
ck('滑块=填充=30', Math.abs(knb('knbA')-30)<0.01 && Math.abs(fil('filA')-30)<0.01);
setTime(10,0); tick();                       // 真实时间已过 60/180=33.33%
ck('live[0] 已更新为 33.33', live()[0].toFixed(2)==='33.33', JSON.stringify(live()));
ck('但 disp[0] 仍保持 30（不被覆盖）', disp()[0].toFixed(2)==='30.00', JSON.stringify(disp()));
ck('pctA 仍显示 30%', pct('pctA')==='30%', pct('pctA'));
ck('其它两条不受影响', !manual()[1] && !manual()[2]);
ck('live 与 disp 是两个独立状态', JSON.stringify(live())!==JSON.stringify(disp()));

// ============ 7. 单击复位 → 回到最新实时 ============
console.log('\n【验收7】点「上班复位」→ 该条回到最新 live，其它条不动');
click('btnResetUp');
ck('manual[0]=false', manual()[0]===false);
ck('disp[0] 恢复到最新 live 33.33', disp()[0].toFixed(2)==='33.33', JSON.stringify(disp()));
ck('pctA 显示 33%', pct('pctA')==='33%', pct('pctA'));
ck('复位只影响这一条', !manual()[1] && !manual()[2]);

// ============ 8. 三条都手动后「全部复位」 ============
console.log('\n【验收8】三条都手动改后点「全部复位」→ 分别回到各自最新 live');
setTime(9,30); tick();
drag(0,0.10); drag(1,0.20); drag(2,0.90);
ck('三条都进入手动', manual().every(Boolean), JSON.stringify(manual()));
ck('手动值 = [10,20,90]', disp().map(v=>+v.toFixed(0)).join()==='10,20,90', JSON.stringify(disp()));
setTime(15,0); tick();
ck('真实时间变化后 live=[100,100,40]', live()[0]===100&&live()[1]===100&&live()[2].toFixed(2)==='40.00', JSON.stringify(live()));
ck('disp 仍是手动值', disp().map(v=>+v.toFixed(0)).join()==='10,20,90', JSON.stringify(disp()));
click('btnTlReset');
ck('全部复位后 manual 全清', manual().every(m=>!m));
ck('disp = 各自最新 live', disp()[0]===100&&disp()[1]===100&&disp()[2].toFixed(2)==='40.00', JSON.stringify(disp()));
ck('pctA/pctB=100% pctC=40%', pct('pctA')==='100%'&&pct('pctB')==='100%'&&pct('pctC')==='40%');

// ============ 9. 午休期间全部复位 ============
console.log('\n【验收9】午休期间点「全部复位」→ 上午100 + 午休当前进度 + 下午0');
setTime(12,20); tick();
drag(0,0.50); drag(1,0.80); drag(2,0.30);
click('btnTlReset');
ck('上午=100%', disp()[0]===100, JSON.stringify(disp()));
ck('午休=33.33（实时）', disp()[1].toFixed(2)==='33.33', JSON.stringify(disp()));
ck('下午=0', disp()[2]===0, JSON.stringify(disp()));
ck('文字一致 100/33/0', pct('pctA')==='100%'&&pct('pctB')==='33%'&&pct('pctC')==='0%');

// ============ 10. 下午期间全部复位 ============
console.log('\n【验收10】下午期间点「全部复位」→ 上午100 + 午休100 + 下午当前进度');
setTime(15,0); tick();
drag(0,0.50); drag(1,0.50); drag(2,0.50);
click('btnTlReset');
ck('上午=100%', disp()[0]===100);
ck('午休=100%', disp()[1]===100);
ck('下午=40（实时）', disp()[2].toFixed(2)==='40.00', JSON.stringify(disp()));
ck('文字一致 100/100/40', pct('pctA')==='100%'&&pct('pctB')==='100%'&&pct('pctC')==='40%');

// ============ 11. 复位不动工资/配置/日历 ============
console.log('\n【验收11】复位不改变工资、配置、日历、原始工作时间');
const before=JSON.stringify(globalThis.__T.CFG);
const calBefore=nodes.cDay.textContent;
click('btnTlReset'); click('btnResetUp'); click('btnResetNoon'); click('btnResetDown');
ck('CFG 未被修改', JSON.stringify(globalThis.__T.CFG)===before);
ck('日薪计算未变', nodes.cDay.textContent===calBefore, nodes.cDay.textContent);
ck('tlSeg 的 s/e 仍是配置时段', S()[0].s===540&&S()[0].e===720&&S()[2].e===1080, JSON.stringify(S().map(s=>[s.s,s.e])));

// ============ 12. 拖动一次只触发一次彩蛋；复位不触发 ============
console.log('\n【验收12】松手触发一次彩蛋；点复位不新增拖动次数/不触发彩蛋');
setTime(9,30); tick();
globalThis.__T.eggReset();
drag(0,0.40);
ck('拖动后进入彩蛋态', globalThis.__T.eggActive===true);
ck('eggCount=1（一次）', globalThis.__T.eggCount===1, 'eggCount='+globalThis.__T.eggCount);
globalThis.__T.eggReset();
click('btnResetUp');
ck('点复位后未触发彩蛋', globalThis.__T.eggActive===false);
ck('eggCount 仍为 0（复位不算拖动）', globalThis.__T.eggCount===0, 'eggCount='+globalThis.__T.eggCount);

// ============ 13. 滑块/填充/文字三者一致（0/中/100） ============
console.log('\n【验收13】0% / 中间值 / 100% 三种状态下三者始终一致');
const checkConsistency=(label)=>{
  for(const [i,id] of [[0,'A'],[1,'B'],[2,'C']]){
    const k=knb('knb'+id), f=fil('fil'+id), t=parseFloat(pct('pct'+id));
    ck(`${label}: 第${i}段 滑块≈填充≈文字`, Math.abs(k-f)<0.02 && Math.abs(f-t)<0.51, `knb=${k} fil=${f} txt=${t}`);
  }
};
setTime(8,0);  tick(); checkConsistency('0% 态（上班前）');
setTime(9,30); tick(); checkConsistency('中间值（上午33%）');
setTime(18,30);tick(); checkConsistency('100% 态（已下班）');
setTime(18,30);tick();
ck('下班后三条 live 全 100', live().every(v=>v===100), JSON.stringify(live()));

// ============ 附加：非工作日 ============
console.log('\n【附加】非工作日（周日 2026-10-11）→ 三条 live 全 0，不当作工作日');
FIXED=new Date(2026,9,11,10,30,0).getTime();   // 周日
tick();
ck('周日 live=[0,0,0]', JSON.stringify(live())==='[0,0,0]', JSON.stringify(live()));
ck('周日 disp=[0,0,0]', JSON.stringify(disp())==='[0,0,0]', JSON.stringify(disp()));
ck('周日文字显示 0%', pct('pctA')==='0%'&&pct('pctB')==='0%'&&pct('pctC')==='0%');
ck('整体条也是 0', fil('filO')===0, String(fil('filO')));
click('btnTlReset');
ck('周日全部复位 → 仍全 0', JSON.stringify(disp())==='[0,0,0]', JSON.stringify(disp()));

// 跨天：手动状态被清除
console.log('\n【附加】跨日期边界 → 清除上一工作日残留的手动覆盖');
FIXED=new Date(2026,9,12,15,0,0).getTime();  // 回到周一 15:00
tick(); drag(0,0.10); drag(1,0.10); drag(2,0.10);
ck('周一三条都手动', manual().every(Boolean));
FIXED=new Date(2026,9,13,15,0,0).getTime();  // 周二
tick();
ck('跨天后 manual 全清', manual().every(m=>!m), JSON.stringify(manual()));
ck('跨天后 disp 回到周二实时', disp()[0]===100&&disp()[1]===100&&disp()[2].toFixed(2)==='40.00', JSON.stringify(disp()));

console.log('\n────────────────────────────');
console.log(`通过 ${pass} · 失败 ${fail}`);
console.log('────────────────────────────');
if(errors.length){ console.log('\n运行时错误:'); errors.forEach(e=>console.log('  '+e)); }
process.exit(fail?1:0);