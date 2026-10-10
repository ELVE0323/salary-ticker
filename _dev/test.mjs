// 从 index.html 抽取真实逻辑做断言测试
import fs from 'fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const js = html.split('<script>')[1].split('</script>')[0];

const P0 = js.indexOf('/* ==========================================================\n   一、');
const P1 = js.indexOf('/* ==========================================================\n   六、渲染');
const pure = js.slice(P0, P1);
if(P0<0||P1<0){ console.error('锚点未找到',{P0,P1}); process.exit(1); }

// 把 load/save 换成测试可控版本。load 是多行 try/catch，需整块移除
function stripIO(src){
  const lines = src.split('\n');
  const out = [];
  let i = 0;
  while(i < lines.length){
    const t = lines[i].trim();
    if(t === 'let CFG=load();'){ out.push('let CFG=globalThis.__CFG;'); i++; continue; }
    if(t.startsWith('function load(){')){
      // 跳到该函数结束（花括号配平）
      let depth = 0, started = false;
      while(i < lines.length){
        for(const ch of lines[i]){ if(ch==='{'){depth++;started=true;} else if(ch==='}'){depth--;} }
        i++;
        if(started && depth===0) break;
      }
      out.push('function load(){return CFG;}');
      continue;
    }
    if(t.startsWith('function save(){')){
      let depth = 0, started = false;
      while(i < lines.length){
        for(const ch of lines[i]){ if(ch==='{'){depth++;started=true;} else if(ch==='}'){depth--;} }
        i++;
        if(started && depth===0) break;
      }
      out.push('function save(){}');
      continue;
    }
    out.push(lines[i]); i++;
  }
  return out.join('\n');
}
const body = stripIO(pure);

const NEED=['daysInMonth','isoWeek','monthCalc','statusOf','baseStatus','holidayOf','isHolidayWork','inHoliday','isDue'];
const lost=NEED.filter(n=>pure.includes('function '+n) && !body.includes('function '+n));
if(lost.length){ console.error('stripIO 破坏了函数:',lost); process.exit(1); }
// 语法自检：确保抽出来的代码本身能编译
try{ new Function(body + '\nreturn monthCalc;'); }
catch(e){ console.error('抽取代码语法错误:', e.message); process.exit(1); }
console.log(`抽取纯逻辑 ${pure.length} 字符 → stripIO ${body.length}，函数完整且语法通过`);

const BASE_CFG = {
  salary:7000, start:'09:30', end:'18:30', hours:8,
  lunch1:'12:00', lunch2:'13:00', payDay:15, payMon:10,
  workMode:'alt', parity:0, holMode:'work',
  decimals:3, firstDay:1, theme:'aurora', viewM:null, override:{}
};

function evalBody(iso, cfg, expr){
  const Fake = class extends Date {
    constructor(...a){ return a.length ? new Date(...a) : new Date(iso); }
  };
  const G = {}; G.__CFG = Object.assign({}, BASE_CFG, cfg||{});
  const fn = new Function('globalThis','DateC', body + '\nreturn (' + expr + ');');
  return fn(G, Fake);
}
const at   = (iso,cfg,y,m) => evalBody(iso,cfg,`monthCalc(${y},${m},new DateC())`);
const calc = (cfg,y,m)     => evalBody('2026-06-15T12:00:00',cfg,`monthCalc(${y},${m},null)`);

let pass=0, fail=0;
function eq(n,g,w,tol=0.005){
  const ok=(typeof w==='number')?Math.abs(g-w)<=tol:g===w;
  ok?(pass++,console.log(`  ✓ ${n} = ${typeof g==='number'?g.toFixed(4):g}`))
    :(fail++,console.log(`  ✗ ${n}　期望 ${w}，实际 ${typeof g==='number'?g.toFixed(4):g}`));
}
function t(n,c,e=''){ c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} ${e}`)); }

const OV7={'2026-10-07':'lv'};

console.log('\n【1】10 月基线（10/7 请全天假）');
const r = at('2026-10-09T10:15:00',{override:{...OV7}},2026,10);
// 21 个计薪日 = 平日17 + 周六上班3(10/10调休、10/17、10/31) + 节假日上班1(10/7)，其中 10/7 请假
eq('应出勤（分母）', r.due, 21);
eq('计薪工作日（不含请假）', r.work, 20);
eq('节假日上班（10/7已请假故不计）', r.holWork, 0);
eq('请假折合天数', r.leaveDaysF, 1);
eq('日薪', r.rate, 7000/21, 0.01);
eq('扣款', r.deduct, 7000/21, 0.01);
eq('预计到手', r.finalPay, 7000-7000/21, 0.01);
// 不请假时，10/7 应显示为节假日上班
const rNo = at('2026-10-09T10:15:00',{override:{}},2026,10);
eq('未请假时 节假日上班=1', rNo.holWork, 1);
eq('未请假时 应出勤=21', rNo.due, 21);
eq('未请假时 到手=7000', rNo.finalPay, 7000, 0.01);

console.log('\n【2】半天假（10/13 上午）');
const h = at('2026-10-13T10:15:00',{override:{...OV7,'2026-10-13':'lv1'}},2026,10);
eq('应出勤（半天也进分母）', h.due, 21);
eq('全天假数', h.lvFull, 1);
eq('半天假数', h.lvHalf, 1);
eq('请假折合 1.5 天', h.leaveDaysF, 1.5);
eq('日薪不变', h.rate, 7000/21, 0.01);
eq('扣款 = 1.5×日薪', h.deduct, 7000/21*1.5, 0.01);
eq('实发', h.finalPay, 7000-7000/21*1.5, 0.01);
t('半天假当天最多赚半日薪', h.tEarned <= h.rate/2+0.001, `实际${h.tEarned.toFixed(2)} 上限${(h.rate/2).toFixed(2)}`);
eq('半天假已工作分钟(10:15)', h.tWorked, 45, 0.02);

console.log('\n【3】休息日制度切换（10 月，无请假）');
const alt=calc({workMode:'alt'},2026,10);
const dbl=calc({workMode:'double'},2026,10);
const sgl=calc({workMode:'single'},2026,10);
eq('大小周应出勤', alt.due, 21);
eq('正常双休应出勤', dbl.due, 19);
eq('单休应出勤', sgl.due, 22);
t('无请假时三制度实发都是7000',
  [alt,dbl,sgl].every(x=>Math.abs(x.finalPay-7000)<0.01),
  JSON.stringify([alt,dbl,sgl].map(x=>x.finalPay.toFixed(2))));
t('双休日薪高于单休', dbl.rate>sgl.rate, `双休${dbl.rate.toFixed(2)} 单休${sgl.rate.toFixed(2)}`);

console.log('\n【4】节假日三种规则（10 月，无请假）');
const hw=calc({holMode:'work'},2026,10);
const ho=calc({holMode:'off'},2026,10);
const hp=calc({holMode:'paid'},2026,10);
eq('work: 节假日上班 1 天', hw.holWork, 1);
eq('off: 节假日上班 0 天', ho.holWork, 0);
eq('paid: 节假日上班 0 天', hp.holWork, 0);
t('off 应出勤 < work', ho.due<hw.due, `off=${ho.due} work=${hw.due}`);
t('paid 应出勤 > work', hp.due>hw.due, `paid=${hp.due} work=${hw.due}`);
t('三规则无请假实发均7000', [hw,ho,hp].every(x=>Math.abs(x.finalPay-7000)<0.01));

console.log('\n【5】10 月逐日清单');
{
  const W=['日','一','二','三','四','五','六'];
  const list = evalBody('2026-10-09T10:15:00',{override:{}},`(function(){
    const d=monthCalc(2026,10,null); return d.list.map(it=>({k:it.k,st:it.st,hw:it.hw,hv:it.hv}));
  })()`);
  let nWork=0,nHol=0,nRest=0,nLv=0;
  list.forEach(it=>{
    const dow=new Date(it.k+'T00:00:00').getDay();
    const nm = it.st===2?'请假':it.st===3?'半天假':(it.st===1?(it.hw?'节假日上班':'工作日'):(it.hv?'法定假':'休息'));
    if(it.st===2||it.st===3)nLv++; else if(it.st===1)nWork++; else if(it.hv)nHol++; else nRest++;
    if(nm!=='休息') console.log(`   ${it.k.slice(5)} 周${W[dow]}  ${nm}`);
  });
  console.log(`   → 计薪上班 ${nWork} 天，法定假 ${nHol} 天，请假 ${nLv} 天，其他休息 ${nRest} 天`);
  eq('10/7 标记为节假日上班', list.find(x=>x.k==='2026-10-07').hw, true);
  eq('10/10 调休上班但非节假日', list.find(x=>x.k==='2026-10-10').hw, false);
  eq('计薪上班天数 = 21', nWork, 21);
  eq('法定假 = 6 天', nHol, 6);
}

console.log('\n【6】全年 12 个月（大小周 + 放假扣薪日）');
{
  console.log('   月份  应出勤  日薪       节假日上班  法定假');
  let ok7000=true, lensOk=true;
  const exp=[31,28,31,30,31,30,31,31,30,31,30,31];
  for(let m=1;m<=12;m++){
    const d=calc({},2026,m);
    if(d.keys.length!==exp[m-1]) lensOk=false;
    if(Math.abs(d.finalPay-7000)>0.01) ok7000=false;
    console.log(`   ${String(m).padStart(2)}月  ${String(d.due).padStart(4)}  ¥${d.rate.toFixed(2).padStart(7)}  ${String(d.holWork).padStart(6)}天  ${String(d.holRest).padStart(4)}天`);
  }
  t('每月天数与真实日历一致', lensOk);
  t('无请假时 12 个月实发均为 7000', ok7000);
}

console.log('\n【7】关键时间节点（10/9）');
const cases=[
  ['2026-10-09T09:00:00','未到上班',       x=>x.tEarned===0&&x.tState.includes('还没上班')],
  ['2026-10-09T10:15:00','上班中在涨',     x=>x.tEarned>0],
  ['2026-10-09T12:30:00','午休暂停',       x=>Math.abs(x.tWorked-150)<0.02&&x.tState.includes('午休')],
  ['2026-10-09T13:15:00','复工继续涨',     x=>Math.abs(x.tWorked-165)<0.02],
  ['2026-10-09T18:30:00','收工满额',       x=>Math.abs(x.tEarned-7000/21)<0.05],
  ['2026-10-09T23:59:00','深夜锁定',       x=>Math.abs(x.tEarned-7000/21)<0.05],
  ['2026-10-10T11:00:00','调休上班日增长', x=>x.tStatus===1&&x.tEarned>0],
  ['2026-10-11T11:00:00','小周双休不增长', x=>x.tStatus===0&&x.tEarned===0],
  ['2026-10-07T11:00:00','全天假不增长',   x=>x.tStatus===2&&x.tEarned===0],
];
for(const [iso,n,chk] of cases){
  const x=at(iso,{override:{...OV7}},2026,10);
  t(n, chk(x), `status=${x.tStatus} earned=${x.tEarned.toFixed(3)} state=${x.tState}`);
}

console.log('\n【8】过去/未来月份的累计逻辑');
{
  const past = at('2026-10-20T12:00:00',{override:{}},2026,8);
  eq('过去月份全额计入', past.earned, past.due*past.rate, 0.01);
  t('过去月份 future≈0', past.future<0.01, `future=${past.future.toFixed(2)}`);
  const future = at('2026-10-20T12:00:00',{override:{}},2026,12);
  eq('未来月份已赚=0', future.earned, 0, 0.01);
  eq('未来月份还能赚=到手', future.future, future.finalPay, 0.01);
}

console.log('\n────────────────────────────');
console.log(`通过 ${pass} · 失败 ${fail}`);
console.log('────────────────────────────');
process.exit(fail?1:0);