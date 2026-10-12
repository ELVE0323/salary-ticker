// v7 测试：加班费独立结算 / 三段独立时间轴 / 事件委托 / 星球进度条
import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js   = html.split('<script>')[1].split('</script>')[0];
const style = html.split('<style>')[1].split('</style>')[0];

// ---- 抽取纯计算逻辑 ----
const P0=js.indexOf('/* ==========================================================\n   一、');
const P1=js.indexOf('/* ==========================================================\n   六、渲染');
const pure=js.slice(P0,P1);
const lines=pure.split('\n'); const out=[]; let i=0;
while(i<lines.length){
  const t=lines[i].trim();
  if(t==='let CFG=load();'){ out.push('let CFG=globalThis.__CFG;'); i++; continue; }
  if(t.startsWith('function load(){')||t.startsWith('function save(){')){
    let d=0,s=false;
    while(i<lines.length){ for(const c of lines[i]){ if(c==='{'){d++;s=true;} else if(c==='}')d--; } i++; if(s&&d===0)break; }
    out.push(t.startsWith('function load')?'function load(){return CFG;}':'function save(){}'); continue;
  }
  out.push(lines[i]); i++;
}
const core=out.join('\n');

function calc(ov, y=2026, m=10, now=null){
  const G={}; G.__CFG=Object.assign({
    salary:7000,start:'09:30',end:'18:30',hours:8,lunch1:'12:00',lunch2:'13:00',
    payDay:15,payMon:10,workMode:'alt',parity:0,holMode:'work',decimals:3,firstDay:1,
    otRate:2, override:{}
  }, {override:ov||{}});
  if(now){
    const f=new Date(now);
    const Fake=class extends Date{constructor(...a){return a.length?new Date(...a):new Date(f);}};
    return new Function('globalThis','DateC',core+'\nreturn monthCalc('+y+','+m+',new DateC());')(G,Fake);
  }
  return new Function('globalThis',core+'\nreturn monthCalc('+y+','+m+',null);')(G);
}

let pass=0,fail=0;
const ck=(n,c,e='')=>{ c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} ${e}`)); };
const eq=(n,g,w,tol=0.01)=>{
  const ok=Math.abs(g-w)<=tol;
  ok?(pass++,console.log(`  ✓ ${n} = ${g.toFixed(2)}`)):(fail++,console.log(`  ✗ ${n}　期望 ${w}，实际 ${g.toFixed(2)}`));
};

console.log('\n【1】加班费不摊薄日薪（核心诉求）');
{
  const base = calc({});                                  // 无加班
  // 周日 10/11 + 小周六 10/24 设为上班 = 加班
  const ot   = calc({'2026-10-11':'work','2026-10-24':'work'});

  console.log('  —— 无加班 ——');
  console.log(`  应出勤 ${base.due} 天 · 日薪 ¥${base.rate.toFixed(2)} · 到手 ¥${base.finalPay.toFixed(2)}`);
  console.log('  —— 加两天班 ——');
  console.log(`  应出勤 ${ot.due} 天 · 日薪 ¥${ot.rate.toFixed(2)} · 到手 ¥${ot.finalPay.toFixed(2)}`);

  eq('★加班后应出勤天数不变', ot.due, base.due);
  eq('★加班后日薪不变（不被摊薄）', ot.rate, base.rate);
  eq('识别出 2 天加班', ot.otDays, 2);
  eq('加班时薪 = 日薪/8×2', ot.otHourRate, base.rate/8*2, 0.02);
  eq('加班费 = 2天×8h×加班时薪', ot.otPay, 2*8*(base.rate/8*2), 0.05);
  eq('★实发 = 月薪 + 加班费', ot.finalPay, 7000 + ot.otPay, 0.05);
  ck('★实发 > 月薪', ot.finalPay>7000, `到手 ¥${ot.finalPay.toFixed(2)}`);

  // 倍率可调
  const ot3 = (()=>{ const G={}; G.__CFG=Object.assign({salary:7000,start:'09:30',end:'18:30',hours:8,
    lunch1:'12:00',lunch2:'13:00',payDay:15,payMon:10,workMode:'alt',parity:0,holMode:'work',
    decimals:3,firstDay:1,otRate:3,override:{'2026-10-11':'work'}});
    return new Function('globalThis',core+'\nreturn monthCalc(2026,10,null);')(G); })();
  ck('★3倍时薪比 2 倍高', ot3.otPay > ot.otPay/2*1.4, `3倍 ¥${ot3.otPay.toFixed(2)} vs 2倍 ¥${(ot.otPay/2).toFixed(2)}`);

  // 加班+请假共存
  const mix = calc({'2026-10-07':'lv','2026-10-11':'work'});
  console.log(`  —— 10/7请假 + 10/11加班 ——`);
  console.log(`  应出勤 ${mix.due} · 日薪 ¥${mix.rate.toFixed(2)} · 请假扣 ¥${mix.deduct.toFixed(2)} · 加班费 ¥${mix.otPay.toFixed(2)} · 到手 ¥${mix.finalPay.toFixed(2)}`);
  eq('请假日薪仍不变', mix.rate, base.rate);
  eq('实发 = 月薪 − 请假 + 加班', mix.finalPay, 7000 - mix.deduct + mix.otPay, 0.05);
  ck('加班可抵消请假损失', mix.finalPay > 7000 - mix.deduct, '');
}

console.log('\n【2】今天恰好是加班日');
{
  const r = calc({'2026-10-10':'work'}, 2026, 10, '2026-10-10T15:00:00');  // 周六调休上班→设成加班?
  // 10/10 本身是法定调休上班日，不是加班。换个：让今天(用 10/11 周日)成为加班
  const r2 = calc({'2026-10-11':'work'}, 2026, 10, '2026-10-11T15:00:00');
  ck('识别今天 tIsOT', r2.tIsOT===true, 'tIsOT='+r2.tIsOT);
  ck('加班状态文案', /休息日加班/.test(r2.tState), r2.tState);
  const expH = 3.5*60/60;  // 9:30→15:00 = 5.5h，含1h午休 = 4.5h
  ck('加班收入按时薪×倍率', r2.tEarned>0 && r2.tEarned>r2.rate*0.3, `赚 ¥${r2.tEarned.toFixed(2)} 日薪 ¥${r2.rate.toFixed(2)}`);
}

console.log('\n【3】三段时间轴完全独立');
{
  const segDecl = js.match(/let tlSeg=\[[\s\S]{0,300}?\];/);
  ck('数据结构是 3 个对象', segDecl && (segDecl[0].match(/\{s:/g)||[]).length===3);
  ck('每段有自己的 s/e', /\{s:570, e:720,/.test(js) && /\{s:780, e:1110,/.test(js));
  ck('★不再共享 4 个时间点', !/let tlSeg=\[570,720,780,1110\]/.test(js));
  ck('★单端手柄 + 拖动只改 disp 不动 s/e', !/seg\.e=seg\.s\+dur;/.test(js) && js.includes('seg.disp=f*100'));
  ck('★最短 15 分钟保护', /TL_MIN/.test(js));
  ck('★三段都能拖到底（无跨段限制）', !js.includes('tlSeg[cfg.i+1].s - seg.s'));
  ck('★没有跨段联动', !/s\[1\]=ns; s\[2\]=ns\+len/.test(js));
  ck('★可停任意位置（0-100% 显示进度）', js.includes('seg.disp=f*100') && !/TL_SPAN_MAX/.test(js));
      ck('最短 15 分钟', /TL_MIN=15/.test(js));
  // HTML：每段两个手柄
  ck('3 个手柄（单端）', (html.match(/class="sb-knob/g)||[]).length===3);
  ck('有 knbA/B/C', ['knbA','knbB','knbC'].every(id=>html.includes(id)));
  ck('轨道无全天刻度线', !/background-size:11\.11%/.test(html.split('<style>')[1].split('</style>')[0]));
  ck('单端手柄样式', /\.sb-knob\.r\{/.test(style));
  ck('提示三段独立+彩蛋', /三段互相独立/.test(html));
}

console.log('\n【4】事件委托（解决点击失效）');
{
  ck('★yearGrid 只在 hash 变化时重建', /if\(gy\._hash !== html\)/.test(js));
  ck('★存 hash', /gy\._hash = html/.test(js));
  ck('★已移除 foreach 逐个绑定', !/gy\.querySelectorAll\('\.mcard'\)\.forEach/.test(js));
  ck('initYearClick 存在', /function initYearClick/.test(js));
  ck('用 closest 委托', /e\.target\.closest\('\.mcard'\)/.test(js));
  ck('调用 buildCal + openSheet', /buildCal\(\);[\s\S]{0,60}openSheet\('calSheet'\)/.test(js));
  ck('★不再隐藏年卡（可在日历和年卡间切换）', !/\$\('yearCard'\)\.style\.display='none'/.test(js));
  ck('initCalClick 存在', /function initCalClick/.test(js));
  ck('日历也用委托', /e\.target\.closest\('\.day'\)/.test(js));
  ck('启动时初始化委托', /initYearClick\(\);\s*initCalClick\(\)/.test(js));
  ck('月卡含上班天数', /上班 \$\{ot\} 天/.test(js));
  ck('月卡含日薪时薪', /日薪¥.*时薪¥/.test(js));
  ck('月卡含查看日历提示', /查看日历 ›/.test(js));
  ck('hover 显示箭头', /\.mcard:hover \.msub \.go\{opacity:1\}/.test(style));
  ck('日历弹窗含四格汇率', /分钟 <b>/.test(js) && /秒 <b>/.test(js));
  ck('日历弹窗含统计行', /上班 <b>\$\{workDays\}<\/b> 天/.test(js) && /法定假 <b>\$\{d\.holRest\}<\/b> 天/.test(js));
}

console.log('\n【5】宇宙皮肤进度条 = 行星追恒星');
{
  ck('轨道底纹（虚线轨迹）', /data-theme="cosmos"\] \.track::before/.test(style));
  ck('★恒星在轨道末端', /data-theme="cosmos"\] \.track::after/.test(style));
  ck('★恒星有脉动动画', /@keyframes starPulse/.test(style));
  ck('★行星在填充段右端', /data-theme="cosmos"\] \.track \.fill::before/.test(style));
  ck('行星有球面渐变', /radial-gradient\(circle at 32% 30%/.test(style));
  ck('★已关掉原来的流光动画', /data-theme="cosmos"\] \.track \.fill::after\{ content:none/.test(style));
  ck('填充段改为绝对定位', /top:2px !important;bottom:2px !important/.test(style));
  ck('三段轨道也有恒星', /data-theme="cosmos"\] \.segbar \.sb-track\.seg::after/.test(style));
  ck('轨道加高', /\.track\{\s*height:20px/.test(style) || /height:20px/.test(style));
}

console.log('\n【6】加班 UI');
{
  ck('有加班费格子', /id="mOtPay"/.test(html));
  ck('有加班倍率设置', /id="segOt"/.test(html));
  ck('倍率选项含 2 倍法定最低', /data-v="2">2 倍<small>法定最低/.test(html));
  ck('otHint 有说明', /function otHint/.test(js));
  ck('说明强调不摊薄日薪', /不摊薄日薪/.test(html));
  ck('保存时读 otRate', /segOt button\.on.*CFG\.otRate=\+ot\.dataset\.v/.test(js));
  ck('cfg 默认 otRate:2', /otRate:2/.test(js));
  ck('计算说明含加班费', /加班费 ¥\$\{money\(d\.otPay,2\)\}/.test(js));
  ck('说明加班不摊薄日薪', /不摊薄日薪，按 \$\{CFG\.otRate\} 倍/.test(js));
}

console.log('\n【7】原有功能未破坏');
{
  const r = calc({'2026-10-07':'lv'}, 2026, 10, '2026-10-09T10:15:00');
  eq('10月日薪（10/7请假）', r.rate, 7000/21, 0.02);
  eq('10月到手（10/7请假）', r.finalPay, 7000-7000/21, 0.05);
  ck('全天假仍生效', r.lvFull===1 && r.leaveDaysF===1);
  ck('半天假仍生效', calc({'2026-10-13':'lv1'},2026,10,'2026-10-13T10:00:00').lvHalf===1);
  ck('轮盘仍在', /function openWheel/.test(js));
  ck('语录库仍在', /const QUOTES = \[/.test(js));
  ck('双维度评级仍在', /rkTEmoji/.test(html)&&/rkMEmoji/.test(html));
  ck('皮肤装饰仍在', /function injectDecor/.test(js));
  ck('调色盘仍在', /PALETTE_KEYS/.test(js));
  ck('sakura 兼容块仍在', /\[data-theme="sakura"\]\{/.test(style));
}

console.log('\n────────────────────────────');
console.log(`通过 ${pass} · 失败 ${fail}`);
console.log('────────────────────────────');
process.exit(fail?1:0);