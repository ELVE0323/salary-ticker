// v8 测试：日历表头对齐 / 三段独立计时只拖右端 / 段内归一化
import fs from 'fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const js   = html.split('<script>')[1].split('</script>')[0];
const style = html.split('<style>')[1].split('</style>')[0];

let pass=0,fail=0;
const ck=(n,c,e='')=>{ c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} ${e}`)); };
const eq=(n,g,w)=>{ g===w?(pass++,console.log(`  ✓ ${n} = ${g}`)):(fail++,console.log(`  ✗ ${n}　期望 ${w}，实际 ${g}`)); };

console.log('\n【1】日历表头星期对齐（★用户报告的核心 bug）');
{
  const WEEK=['日','一','二','三','四','五','六'];
  ck('★使用 getDay() 原始顺序的 WEEK 数组',
     /const WEEK=\['日','一','二','三','四','五','六'\]/.test(js),
     '必须是 0=周日 1=周一 ... 6=周六');
  ck('★表头索引用 (firstDay+i)%7', /\(CFG\.firstDay\+i\)%7/.test(js));
  ck('★不再用旧的错位 heads 数组', !/const heads=\['一','二','三','四','五','六','日'\]/.test(js));

  // 模拟：周一开头时表头应为 一二三四五六日
  const firstDay=1;
  const head=[];
  for(let i=0;i<7;i++) head.push(WEEK[(firstDay+i)%7]);
  eq('周一开头表头', head.join(''), '一二三四五六日');
  const head0=[];
  for(let i=0;i<7;i++) head0.push(WEEK[(0+i)%7]);
  eq('周日开头表头', head0.join(''), '日一二三四五六');

  // 10/1 是周四，落在第4列（周一开头）
  const off=(new Date(2026,9,1).getDay()-firstDay+7)%7;
  eq('10/1(周四) 前空格数（周一开头）', off, 3);
  eq('10/1 所在列表头', head[off], '四');
  // 10/9 是周五（周一开头时 col=4）
  eq('10/9 所在列表头（周一开头）', head[(off+9-1)%7], '五');
  eq('10/9 实际是周五', WEEK[new Date(2026,9,9).getDay()], '五');
}

console.log('\n【2】日期格子填充与表头一致性');
{
  const WEEK=['日','一','二','三','四','五','六'];
  for(const firstDay of [1,0]){
    const off=(new Date(2026,9,1).getDay()-firstDay+7)%7;
    let bad=0, firstBad='';
    for(let day=1;day<=31;day++){
      const dt=new Date(2026,9,day);
      const col=(off+day-1)%7;
      const colDow=(firstDay+col)%7;
      if(colDow!==dt.getDay()){ bad++; if(!firstBad) firstBad=`${day}日(周${WEEK[dt.getDay()]})落在第${col+1}列(表头"${WEEK[colDow]}")`; }
    }
    ck(`firstDay=${firstDay} 时 31 天全部对齐`, bad===0, firstBad);
  }
  // 大小周
  function isoWeek(dt){
    const d=new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate()));
    const day=d.getUTCDay()||7;
    d.setUTCDate(d.getUTCDate()+4-day);
    const ys=new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d-ys)/86400000)+1)/7);
  }
  const sats=[3,10,17,24,31].map(d=>({d, wk:isoWeek(new Date(2026,9,d))}));
  console.log('  周六 ISO 周：'+sats.map(s=>`${s.d}日=第${s.wk}周${s.wk%2===0?'(大)':'(小)'}`).join('  '));
  ck('大周(偶数周) Saturdays = 3/17/31',
     sats.filter(s=>s.wk%2===0).map(s=>s.d).join(',')==='3,17,31',
     sats.filter(s=>s.wk%2===0).map(s=>s.d).join(','));
  ck('小周(奇数周) Saturdays = 10/24',
     sats.filter(s=>s.wk%2===1).map(s=>s.d).join(',')==='10,24');
  ck('周一至周五永远上班', /if\(dow===0\) return 0;[\s\S]{0,60}if\(dow>=1&&dow<=5\) return 1;/.test(js));
}

console.log('\n【3】三段独立计时（段内归一化）');
{
  ck('数据结构 {s,e}', /let tlSeg=\[\s*\{s:570, e:720\}/.test(js));
  ck('★实时进度分两层（已过+预设）', js.includes('style.width=timePct') && js.includes('style.width=Math.max(0,setPct-timePct)'));
  ck('★预设层用 left 定位', js.includes("pre'+'ABC'[i]).style.left=timePct"));
  ck('★不按全天轴换算', !/AXIS_S_V|axPct\(/.test(js));
  ck('★满格=12小时', /TL_SPAN_MAX=720/.test(js));
  ck('★手柄位置 = setPct（不再钉死）', js.includes("knb'+'ABC'[i]).style.left=setPct.toFixed(2)"));
}

console.log('\n【4】只拖右端，不能拖两端');
{
  ck('★HTML 只有 3 个手柄', (html.match(/class="sb-knob/g)||[]).length===3,
     `实际 ${(html.match(/class="sb-knob/g)||[]).length}`);
  ck('★没有 .sb-knob.l', !/class="sb-knob l"/.test(html));
  ck('★拖动只改 seg.e', /seg\.e=seg\.s\+dur;/.test(js));
  ck('★不碰 seg.s', !/seg\.s\s*=/.test(js));
  ck('★手柄固定 left:100%', /\.sb-knob\.r\{[\s\S]{0,120}left:100%/.test(style));
  ck('★光标是 ew-resize（横向）', /cursor:ew-resize/.test(style));
  ck('不再有 pickKnob 左右判断', !/pickKnob/.test(js));
}

console.log('\n【5】前方无黑色块');
{
  ck('★轨道是 .seg 类（段内专用）', /class="sb-track seg"/.test(html));
  ck('★段内轨道背景不再有刻度线', /\.sb-track\.seg\{[\s\S]{0,200}background:rgba\(0,0,0,\.28\)/.test(style));
  ck('★旧的全局刻度 background-size 已删', !/background-size:11\.11% 100%/.test(style));
  ck('★fill 从 left:0 开始', /\.sb-fill\{position:absolute;left:0/.test(style));
  ck('★无左端手柄', !/\.sb-knob\.l\{/.test(style));
  ck('★不再有当前时间指针线', !/tlNow/.test(html));
}

console.log('\n【6】今日整体（午休时仍在增长）');
{
  ck('整体从上班时间算起', /const os=tlSeg\[0\]\.s, oe=tlSeg\[2\]\.e/.test(js));
  ck('★整体不扣午休', /const oPct=Math\.max\(0,Math\.min\(1,\(now-os\)\/oSpan\)\)\*100/.test(js));
  ck('★说明显示净工时/午休/已上', /净工作/.test(js)&&/午休/.test(js)&&/当前已上/.test(js));
  ck('区分「净工作」与「已上」', /净工作/.test(js)&&/当前已上/.test(js));
  ck('净工作扣掉午休', /now>tlSeg\[1\]\.s&&now<tlSeg\[1\]\.e \? \(now-tlSeg\[1\]\.s\)/.test(js));
}

console.log('\n【7】实时更新');
{
  ck('render() 里调用 renderDragTL', /tlInit=true; initDragTL\(\);/.test(js) && /^\s*renderDragTL\(\);/m.test(js));
  ck('rAF 循环存在', /requestAnimationFrame\(loop\)/.test(js));
  ck('完成态高亮', /\.segbar\.done\{/.test(style));
  ck('进行态高亮', /\.segbar\.now\{/.test(style));
  ck('JS 里切换 done 类', /classList\.toggle\('done'/.test(js));
}

console.log('\n【8】原有功能未破坏');
{
  ck('日薪计算仍在', /const rate = due>0 \? CFG\.salary\/due/.test(js));
  ck('加班费仍在', /otPay/.test(js) && /const finalPay=CFG\.salary - deduct \+ otPay/.test(js));
  ck('isDue 排除加班', /if\(CFG\.override\[key\]==='work' && baseStatus\(key\)===0\) return false/.test(js));
  ck('轮盘仍在', /function openWheel/.test(js));
  ck('事件委托仍在', /function initYearClick/.test(js));
  ck('双维度评级仍在', /rkTEmoji/.test(html)&&/rkMEmoji/.test(html));
  ck('皮肤装饰仍在', /function injectDecor/.test(js));
  ck('sakura 兼容块仍在', /\[data-theme="sakura"\]\{/.test(style));
  ck('宇宙恒星进度条仍在', /data-theme="cosmos"\] \.track::after/.test(style));
  ck('三段轨道仍是 4 个 segbar', (html.match(/class="segbar[\s"]/g)||[]).length===4);
}

console.log('\n────────────────────────────');
console.log(`通过 ${pass} · 失败 ${fail}`);
console.log('────────────────────────────');
process.exit(fail?1:0);