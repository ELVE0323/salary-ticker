// v13 精简版：引导已删除，只测还存在的功能
import fs from 'fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js   = html.split('<script>')[1].split('</script>')[0];
const style= html.split('<style>')[1].split('</style>')[0];

let pass=0, fail=0;
const ck=(n,c,e='')=>{ c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} ${e}`)); };

console.log('\n【1】★时间输入框（设置面板里的）');
{
  const times=[...html.matchAll(/<input[^>]*type="time"[^>]*>/g)].map(m=>m[0]);
  console.log('  设置面板时间框:');
  times.forEach(t=>console.log('    '+t.replace(/\s+/g,' ').slice(0,70)));
  ck('★没有任何 step 限制（任意分钟可填）', !/step="(300|600|900|3600)"/.test(html));
  ck('★有 4 个时间输入框（上班/下班/午休×2）', times.length>=4, `实际 ${times.length} 个`);
  ck('★time 有专属样式', /input\[type="time"\]/.test(style));
  ck('★去掉了原生外观', /-webkit-appearance:none; appearance:none/.test(style));
  ck('★时钟图标跟随主题', /-webkit-calendar-picker-indicator/.test(style));
  ck('★color-scheme 跟随主题', /color-scheme/.test(html) && js.includes('colorScheme'));
}

console.log('\n【2】★自定义背景毛玻璃');
{
  ck('★卡片 backdrop-filter', /body\.has-bgimg \.card[\s\S]{0,200}backdrop-filter:blur\(16px\)/.test(style));
  ck('★hover 加强 + 上浮', /body\.has-bgimg \.card:hover[\s\S]{0,300}blur\(24px\)/.test(style) && /transform:translateY\(-2px\)/.test(style));
  ck('★鼠标视差 + 柔光', /function initBgInteraction/.test(js) && /backgroundPosition/.test(js));
  ck('★触摸也有反馈', /touchstart/.test(js) && /bg-touch/.test(style));
  ck('★暗角 veil 保障可读性', /id="bgVeil"/.test(html) && /class="bg-veil"/.test(html));
  ck('★文字投影补偿', /body\.has-bgimg\{ text-shadow/.test(style));
}

console.log('\n【3】★z-index 层级');
{
  const zS=parseInt((style.match(/\.sheet\{[^}]*z-index:(\d+)/)||[])[1]||0);
  const zW=parseInt((style.match(/\.wheel-wrap\{[^}]*z-index:(\d+)/)||[])[1]||0);
  console.log(`  .sheet=${zS}  .wheel-wrap=${zW}`);
  ck('★轮盘高于日历（点日期后轮盘要能操作）', zW>zS, `${zW} > ${zS}`);
  ck('★弹窗层级足够高', zS>=500, 'sheet='+zS);
}

console.log('\n【4】★引导已删除');
{
  ck('★无 welcomeSheet', !html.includes('welcomeSheet'));
  ck('★无 btnWelcome*', !html.includes('btnWelcome'));
  ck('★无 showWelcomeIfFirstRun', !js.includes('showWelcomeIfFirstRun'));
  ck('★无 dataset.modal', !js.includes('dataset.modal'));
  ck('★无弹窗默认 show', !/class="sheet show"/.test(html));
  ck('★改用 firstRunHint', js.includes('function firstRunHint'));
  ck('★点遮罩可关闭', /if\(e\.target!==s\) return;/.test(js));
}

console.log('\n【5】★时间轴复位');
{
  ck('★每帧校验 tlSeg', /function tlEnsureToday\(today\)/.test(js) && /tlEnsureToday\(today\);/.test(js));
  ck('★复位有 try/catch', /btnTlReset[\s\S]{0,400}try\{/.test(js));
  ck('★复位出错置 null', js.includes('tlSeg=null;'));
  ck('★renderDragTL null 保护', /if\(!tlSeg\|\|!tlSeg\[0\]\) return;/.test(js));
}

console.log('\n【6】★原有功能');
{
  ck('日薪计算', /const rate = due>0 \? CFG\.salary\/due/.test(js));
  ck('加班费', /CFG\.salary - deduct \+ otPay/.test(js));
  ck('彩蛋语录', /const EGG_QUOTES = \{/.test(js));
  ck('进度条可拖', js.includes('seg.manual=true;') && js.includes('seg.disp=f*100;'));
  ck('实时效果', /function calcLivePct\(i, now, today\)/.test(js));
  ck('日历星期对齐', /const WEEK=\['日','一','二','三','四','五','六'\]/.test(js));
  ck('事件委托', /function initYearClick/.test(js) && /function initCalClick/.test(js));
  ck('轮盘', /function openWheel/.test(js));
  ck('皮肤系统', /\[data-theme="keyboard"\]/.test(style));
  ck('装饰注入', /function injectDecor/.test(js));
  ck('PWA', /serviceWorker\.register/.test(js));
  ck('老板键已删', !/toggleHide/.test(js));
  ck('默认双休', /workMode:'double'/.test(js));
}

console.log('\n────────────────────────────');
console.log(`通过 ${pass} · 失败 ${fail}`);
console.log('────────────────────────────');
process.exit(fail?1:0);