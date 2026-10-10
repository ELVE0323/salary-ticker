// 结构与引用完整性校验
import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const js = html.split('<script>')[1].split('</script>')[0];
let fail=0;
const ck=(n,c,e='')=>{ c?console.log(`  ✓ ${n}`):(fail++,console.log(`  ✗ ${n} ${e}`)); };

console.log('\n【A】HTML 结构');
ck('DOCTYPE', html.startsWith('<!DOCTYPE html>'));
ck('script 成对', (html.match(/<script>/g)||[]).length===(html.match(/<\/script>/g)||[]).length);
ck('style 成对', (html.match(/<style>/g)||[]).length===(html.match(/<\/style>/g)||[]).length);
ck('viewport', html.includes('name="viewport"'));
ck('UTF-8', html.includes('charset="UTF-8"'));
ck('theme-color meta', html.includes('name="theme-color"'));

console.log('\n【B】JS 语法');
try{ new vm.Script(js); ck('语法通过', true); }
catch(e){ ck('语法通过', false, e.message); }

console.log('\n【C】DOM 引用完整性');
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
const used=[...new Set([...js.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]))];
const missing=used.filter(u=>!ids.has(u));
ck(`JS 引用的 ${used.length} 个 id 全部存在`, missing.length===0, '缺: '+missing.join(', '));
const segs=[...new Set([...js.matchAll(/segSync\('(\w+)'/g)].map(m=>m[1]))];
const segIds=[...new Set([...html.matchAll(/class="seg[^"]*"\s+id="(\w+)"/g)].map(m=>m[1]))];
ck('所有 seg 容器存在', segs.every(s=>segIds.includes(s)), segs.filter(s=>!segIds.includes(s)).join(','));

console.log('\n【E】皮肤');
const themes=[...html.matchAll(/\[data-theme="(\w+)"\]\{/g)].map(m=>m[1]);
ck('7 套皮肤定义(含sakura兼容)', themes.length===7, themes.join(','));
ck('含三套新皮肤', themes.includes('keyboard')&&themes.includes('cosmos')&&themes.includes('cat8'));
const skins=[...js.matchAll(/\{id:'([a-z0-9]+)',\s*n:'/g)].map(m=>m[1]);
ck('皮肤注册表 6 项', skins.length===6, skins.join(','));
ck('注册表都在 CSS 里有定义', skins.every(t=>themes.includes(t)), `CSS:${themes} JS:${skins}`);

console.log('\n【F】功能模块');
const feats={
  '多月视图 / 全年总览': /yearGrid/.test(js)&&/renderYear/.test(js),
  '月份前后切换': /prevM/.test(js)&&/nextM/.test(js),
  '休假制度可切换(3种)': /workMode:'(alt|double)'/.test(js)&&/double/.test(js)&&/single/.test(js),
  '节假日规则可切换(3种)': /holMode:'work'/.test(js)&&/'off'/.test(js)&&/holMode==='paid'/.test(js),
  '大周奇偶可切换': /parity/.test(js)&&/segParity/.test(js),
  '半天假支持': /lv1/.test(js)&&/lv2/.test(js)&&/leaveDaysF/.test(js),
  '休息日可设加班': /ov==='work'/.test(js),
  '轮盘选择器': /function openWheel/.test(js)&&/wheel-wrap/.test(html),
  '休息日不可请假': /baseIsRest/.test(js),
  '牛马语录库': /const QUOTES = \[/.test(js)&&/randomWorkQuote/.test(js),
  '工资评级': /const RANKS = \[/.test(js)&&/function getRank/.test(js),
  '消费力对照': /function shoppingLine/.test(js),
  '三段可拖动进度条': /initDragTL/.test(js)&&/sb-track/.test(html),
  '调色盘': /PALETTE_KEYS/.test(js)&&/type="color"/.test(html),
  '自定义背景': /bgImg/.test(js)&&/bgUpload/.test(html),
  '八条形象': /function cat8SVG/.test(js),
  '★老板键已移除': !/toggleHide/.test(js)&&!/id="mask"/.test(html),
  '配置持久化': /localStorage/.test(js),
  '导入导出': /btnExport/.test(js)&&/btnImport/.test(js),
};
Object.entries(feats).forEach(([n,c])=>ck(n,c));
ck('已删除「做六休一」', !/data-v="six"/.test(html) && !/workMode==='six'/.test(js) && !/six:'做六休一'/.test(js));

console.log('\n【F】节假日数据');
ck('7 组节假日', (js.match(/\{n:'/g)||[]).length===7);
ck('国庆 10/1-10/7', /s:'2026-10-01',e:'2026-10-07'/.test(js));
ck('调休含 9/20 与 10/10', js.includes("'2026-09-20'")&&js.includes("'2026-10-10'"));

console.log('\n【G】CSS 变量完整性');
const varNames=['--bg','--surface','--surface2','--stroke','--txt','--txt2','--txt3','--acc','--acc2','--ok','--warn','--bad','--num-grad','--btn','--btn-h','--shadow','--glow-line'];
varNames.forEach(v=>{
  const usedN=(html.match(new RegExp('var\\('+v+'\\)','g'))||[]).length;
  const defN=(html.match(new RegExp(v+':','g'))||[]).length;
  ck(`${v} 有定义且被使用`, defN>=4 && usedN>0, `定义${defN}处 使用${usedN}处`);
});

console.log('\n────────────────────────────');
console.log(fail?`✗ ${fail} 项失败`:'✓ 全部通过');
console.log('────────────────────────────');
process.exit(fail?1:0);