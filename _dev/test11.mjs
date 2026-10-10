// v11 精简版：只测还在的功能（引导已删除）
import fs from 'fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const js   = html.split('<script>')[1].split('</script>')[0];
const style= html.split('<style>')[1].split('</style>')[0];

let pass=0, fail=0;
const ck=(n,c,e='')=>{ c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} ${e}`)); };

console.log('\n【1】★新手引导已彻底删除');
{
  ck('★没有 welcomeSheet', !html.includes('welcomeSheet'));
  ck('★没有 btnWelcomeSave/Skip', !html.includes('btnWelcomeSave') && !html.includes('btnWelcomeSkip'));
  ck('★没有 w* 引导输入框', !/id="w(Salary|Start|End|Lunch1|Lunch2|Hours|PayDay)"/.test(html));
  ck('★没有 showWelcomeIfFirstRun', !js.includes('showWelcomeIfFirstRun'));
  ck('★没有 dataset.modal 拦截', !js.includes('dataset.modal'));
  ck('★没有弹窗默认显示', !/class="sheet show"/.test(html));
  ck('★改用 firstRunHint（只弹 toast）', js.includes('function firstRunHint'));
  const frh=(js.match(/function firstRunHint\(\)\{[\s\S]*?\n\}/)||[''])[0];
  ck('★firstRunHint 不开弹窗', frh.includes('toast(') && !frh.includes('openSheet'));
  ck('★点遮罩空白处可关闭', /if\(e\.target!==s\) return;/.test(js));
}

console.log('\n【2】日历星期对齐');
{
  ck('使用 getDay() 原始顺序', /const WEEK=\['日','一','二','三','四','五','六'\]/.test(js));
  ck('表头索引用 (firstDay+i)%7', /\(CFG\.firstDay\+i\)%7/.test(js));
  const W=['日','一','二','三','四','五','六'];
  const h=[]; for(let i=0;i<7;i++) h.push(W[(1+i)%7]);
  ck('周一起头表头 = 一二三四五六日', h.join('')==='一二三四五六日', h.join(''));
}

console.log('\n【3】时间轴可拖动 + 复位');
{
  ck('单端手柄 3 个', (html.match(/class="sb-knob r"/g)||[]).length===3);
  ck('三段各��� track', /id="trkA"/.test(html)&&/id="trkB"/.test(html)&&/id="trkC"/.test(html));
  ck('位置直接换算时长', js.includes('Math.min(TL_SPAN_MAX, Math.round(f*TL_SPAN_MAX))'));
  ck('★三段都能拖到底（无跨段限制）', !js.includes('tlSeg[cfg.i+1].s - seg.s'));
  ck('★实时效果 max(已过, 设置)', /function tlRealPct\(seg, now\)/.test(js) && js.includes('Math.max(setPct, timePct)'));
  ck('★每帧校验 tlSeg（修复复位无效）', /if\(!tlSeg \|\| !tlSeg\[0\] \|\| !tlSeg\[1\] \|\| !tlSeg\[2\]\)/.test(js));
  ck('★复位有 try/catch 兜底', /btnTlReset[\s\S]{0,400}try\{/.test(js));
  ck('★复位出错置 null 让下一帧重建', js.includes('tlSeg=null;'));
  ck('renderDragTL 有 null 保护', /if\(!tlSeg\|\|!tlSeg\[0\]\) return;/.test(js));
  ck('★拖动后不残留非法值', /TL_SPAN_MAX\)/.test(js));
}

console.log('\n【4】加班费独立结算');
{
  ck('isDue 排除休息日加班', /if\(CFG\.override\[key\]==='work' && baseStatus\(key\)===0\) return false/.test(js));
  ck('加班费单独算', /const otPay = otDays\*HRS\*otHourRate/.test(js));
  ck('实发含加班费', /CFG\.salary - deduct \+ otPay/.test(js));
  ck('加班倍率可调', /CFG\.otRate\|\|2/.test(js));
}

console.log('\n【5】z-index 层级');
{
  const zS=parseInt((style.match(/\.sheet\{[^}]*z-index:(\d+)/)||[])[1]||0);
  const zW=parseInt((style.match(/\.wheel-wrap\{[^}]*z-index:(\d+)/)||[])[1]||0);
  console.log(`  .sheet=${zS}  .wheel-wrap=${zW}`);
  ck('★轮盘高于日历', zW>zS, `${zW} > ${zS}`);
}

console.log('\n【6】彩蛋语录');
{
  ck('独立语录库', /const EGG_QUOTES = \{/.test(js));
  ck('10次+ 玩够了没有？', js.includes('玩够了没有？'));
  ck('7次+ 别摸鱼了', js.includes('别摸鱼了，你的工作要被你摸没了'));
  ck('5次+ 别闹了', js.includes('别闹了，再玩就玩坏了'));
  ck('2次+ 啊你得逞了', js.includes('啊 你得逞了 人'));
  ck('1次 有毛病', js.includes('你有毛病？手乱动就去治治。'));
  ck('>8h 先天打工圣体', js.includes('牛！你就是先天打工圣体！'));
  ck('<8h 想下班想疯了', js.includes('想下班想疯了？'));
  ck('2分钟重置计数', /eggCount=0; \}, 2\*60\*1000\)/.test(js));
  ck('不持久化', !/localStorage.*egg/i.test(js));
  ck('点击切回普通库', /if\(eggActive && !force\)\{ eggActive=false/.test(js));
}

console.log('\n【7】自定义背景毛玻璃');
{
  ck('卡片有 backdrop-filter', /body\.has-bgimg \.card[\s\S]{0,200}backdrop-filter:blur\(16px\)/.test(style));
  ck('hover 加强模糊', /body\.has-bgimg \.card:hover[\s\S]{0,200}blur\(24px\)/.test(style));
  ck('鼠标视差交互', /function initBgInteraction/.test(js) && /backgroundPosition/.test(js));
}

console.log('\n【8】出厂默认值（通用）');
{
  const DEF=js.match(/const DEF=\{[\s\S]*?\n\};/);
  ck('找到 DEF', !!DEF);
  if(DEF){
    const d=DEF[0];
    ck('★月薪 8000', /salary:8000/.test(d));
    ck('★上下班 09:00-18:00', /start:'09:00'/.test(d) && /end:'18:00'/.test(d));
    ck('★双休', /workMode:'double'/.test(d));
    ck('★无请假记录', /override:\{\}/.test(d));
  }
  ck('设置里有说明', /当前用的是.*默认设置/s.test(html));
  ck('设置里能改月薪', /id="sSalary"/.test(html));
  ck('设置里能改上下班', /id="sStart"/.test(html) && /id="sEnd"/.test(html));
}

console.log('\n【9】原有功能未破坏');
{
  ck('日薪计算', /const rate = due>0 \? CFG\.salary\/due/.test(js));
  ck('轮盘（请假/加班）', /function openWheel/.test(js));
  ck('年卡事件委托', /function initYearClick/.test(js));
  ck('日历事件委托', /function initCalClick/.test(js));
  ck('皮肤 6+1 套', /\[data-theme="keyboard"\]/.test(style)&&/\[data-theme="sakura"\]/.test(style));
  ck('皮肤装饰注入', /function injectDecor/.test(js));
  ck('调色盘', /PALETTE_KEYS/.test(js));
  ck('PWA 注册', /serviceWorker\.register\('\.\/sw\.js'\)/.test(js));
  ck('老板键已移除', !/toggleHide/.test(js) && !/id="mask"/.test(html));
  ck('双维度评级', /rkTEmoji/.test(html)&&/rkMEmoji/.test(html));
  ck('购物力维度切换', /shopSeg/.test(html)&&/let shopDim='today'/.test(js));
  ck('默认双休（月份展示用）', /workMode:'double'/.test(js));
}

console.log('\n────────────────────────────');
console.log(`通过 ${pass} · 失败 ${fail}`);
console.log('────────────────────────────');
process.exit(fail?1:0);