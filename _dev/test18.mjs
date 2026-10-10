// v18 验证：没有强制弹窗 / 复位按钮有效 / 设置可改
import fs from 'fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const js   = html.split('<script>')[1].split('</script>')[0];
const style= html.split('<style>')[1].split('</style>')[0];

let pass=0, fail=0;
const ck=(n,c,e='')=>{ c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} ${e}`)); };

console.log('\n【1】★强制引导已彻底移除');
{
  ck('★HTML 里没有 welcomeSheet', !html.includes('id="welcomeSheet"'));
  ck('★HTML 里没有 btnWelcomeSave', !html.includes('btnWelcomeSave'));
  ck('★HTML 里没有 btnWelcomeSkip', !html.includes('btnWelcomeSkip'));
  ck('★没有 wSalary / wLunch 输入框', !html.includes('id="wSalary"') && !html.includes('id="wLunch1"'));
  ck('★没有 showWelcomeIfFirstRun 函数', !js.includes('function showWelcomeIfFirstRun'));
  ck('★没有 onWelcomeSave / doSkip', !js.includes('function onWelcomeSave') && !js.includes('function doSkip'));
  ck('★没有 markWelcomeAsModal', !js.includes('markWelcomeAsModal'));
  ck('★没有 dataset.modal 拦截', !js.includes('dataset.modal'));
  ck('★没有 #welcomeSheet CSS', !style.includes('#welcomeSheet'));
  ck('★没有 .time-quick CSS', !style.includes('.time-quick'));
  ck('★没有 btnWelcomeSkip CSS', !style.includes('#btnWelcomeSkip'));
  ck('★不再调用 showWelcomeIfFirstRun', !/showWelcomeIfFirstRun\(\);/.test(js));
  ck('★改用 firstRunHint', /firstRunHint\(\);/.test(js) && /function firstRunHint/.test(js));
  const frh = (js.match(/function firstRunHint\(\)\{[\s\S]*?\n\}/)||[''])[0];
  ck('★firstRunHint 只弹 toast 不弹窗', frh.includes('toast(') && !frh.includes('openSheet'));
  ck('★没有任何 sheet 默认带 show 类', !/class="sheet show"/.test(html));
  console.log('    → 打开页面直接能用，零弹窗');
}

console.log('\n【2】★三轴复位按钮有效');
{
  ck('btnTlReset 在 HTML 里', /id="btnTlReset"/.test(html));
  const rst=js.match(/\$\('btnTlReset'\)\.addEventListener\('click',[\s\S]{0,600}?\}\);/);
  ck('有 click 绑定', !!rst);
  if(rst){
    const c=rst[0];
    console.log('  复位逻辑:');
    c.split('\n').slice(0,14).forEach(l=>console.log('    '+l.trim().slice(0,82)));
    console.log('');
    ck('★重置 tlSeg 为三段', c.includes('tlSeg=[{s:d.a.s,e:d.a.e},{s:d.b.s,e:d.b.e},{s:d.c.s,e:d.c.e}]'));
  ck('★用 CFG 里的配置', js.includes('function resetSegs()') && js.includes('minOf(CFG.start)') && js.includes('minOf(CFG.lunch2)'));
    ck('★调用 renderDragTL', c.includes('renderDragTL()'));
    ck('★重置彩蛋计数', c.includes('eggReset()'));
    ck('★有 try/catch 兜底', c.includes('try{'));
    ck('★出错时置 tlSeg=null（下一帧会重建）', c.includes('tlSeg=null;'));
  }
  // render 里每帧校验 tlSeg
  const rd=js.match(/function render\(\)\{[\s\S]{0,6000}?renderDragTL\(\);/);
  ck('★render 里每帧校验 tlSeg', rd && /if\(!tlSeg \|\| !tlSeg\[0\]/.test(rd[0]));
  ck('★renderDragTL 有 null 保护', /if\(!tlSeg\|\|!tlSeg\[0\]\) return;/.test(js));
  ck('★eggReset 存在', /function eggReset\(\)/.test(js));
}

console.log('\n【3】★设置里能改（替代引导）');
{
  ck('设置里有月薪输入', /id="sSalary"/.test(html));
  ck('设置里有上下班时间', /id="sStart"/.test(html) && /id="sEnd"/.test(html));
  ck('设置里有工时', /id="sHours"/.test(html));
  ck('设置里有午休', /id="sL1"/.test(html) && /id="sL2"/.test(html));
  ck('设置里有休息制度', /id="segWork"/.test(html));
  ck('★顶部有说明当前是默认值', /当前用的是.*默认设置/s.test(html));
  ck('★说明改成真实情况', /改成你的真实情况/.test(html));
  ck('保存按钮在', /id="btnSave"/.test(html));
  ck('★默认配置是通用值', /salary:8000/.test(js) && /start:'09:00'/.test(js));
  ck('★默认双休', /workMode:'double'/.test(js));
  ck('★默认无请假记录', /override:\{\}/.test(js));
}

console.log('\n【4】★轮盘层级（上一轮修的）');
{
  const zS=parseInt((style.match(/\.sheet\{[^}]*z-index:(\d+)/)||[])[1]||0);
  const zW=parseInt((style.match(/\.wheel-wrap\{[^}]*z-index:(\d+)/)||[])[1]||0);
  console.log(`  .sheet=${zS}  .wheel-wrap=${zW}`);
  ck('★轮盘高于日历', zW>zS, `${zW} > ${zS}`);
}

console.log('\n【5】原有功能未破坏');
{
  ck('日薪计算仍在', /const rate = due>0 \? CFG\.salary\/due/.test(js));
  ck('加班费仍在', /const finalPay=CFG\.salary - deduct \+ otPay/.test(js));
  ck('彩蛋语录库仍在', /const EGG_QUOTES = \{/.test(js));
  ck('进度条实时效果仍在', /function tlRealPct\(seg, now\)/.test(js));
  ck('三段都能拖到底', !js.includes('tlSeg[cfg.i+1].s - seg.s'));
  ck('日历星期修正仍在', /const WEEK=\['日','一','二','三','四','五','六'\]/.test(js));
  ck('事件委托仍在', /function initYearClick/.test(js));
  ck('皮肤装饰仍在', /function injectDecor/.test(js));
  ck('PWA 仍在', /serviceWorker\.register\('\.\/sw\.js'\)/.test(js));
  ck('毛玻璃仍在', /body\.has-bgimg \.card/.test(style));
  ck('老板键已移除', !/toggleHide/.test(js) && !/id="mask"/.test(html));
}

console.log('\n────────────────────────────');
console.log(`通过 ${pass} · 失败 ${fail}`);
console.log('────────────────────────────');
process.exit(fail?1:0);