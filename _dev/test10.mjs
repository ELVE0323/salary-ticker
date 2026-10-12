// v10 测试：分享安全 / 出厂默认值 / 首次引导 / 一键清空
import fs from 'fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js   = html.split('<script>')[1].split('</script>')[0];
const style= html.split('<style>')[1].split('</style>')[0];

let pass=0, fail=0;
const ck=(n,c,e='')=>{ c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} ${e}`)); };

console.log('\n【1】出厂默认值（★别人打开看到什么）');
{
  const DEF = js.match(/const DEF=\{[\s\S]*?\n\};/);
  ck('找到 DEF 定义', !!DEF);
  if(DEF){
    const d = DEF[0];
    ck('★workMode 默认 double（双休）', /workMode:'double'/.test(d), d.match(/workMode:'\w+'/)?.[0]);
    ck('★override 为空对象（不含任何请假记录）', /override:\{\},\s*\/\//.test(d),
       d.match(/override:\{[^}]*\}/)?.[0]);
    ck('★不含任何具体日期', !/override:\{[^}]*\d{4}-\d{2}-\d{2}/.test(d));
    ck('★palette 为空', /palette:\{\}/.test(d));
    ck('★默认月薪 8000（通用值）', /salary:8000/.test(d));
    ck('默认主题 keyboard', /theme:'keyboard'/.test(d));
    ck('默认工时 8 小时', /hours:8/.test(d));
    ck('加班倍率默认 2', /otRate:2/.test(d));
    ck('★未把任何真实姓名/公司写进代码', !/王一鸣|EDY|公司名|工号/.test(html));
  }
}

console.log('\n【2】隐私安全（★分享会不会泄露我的数据）');
{
  ck('★无后端上传接口', !/fetch\(['"]https?:|XMLHttpRequest|WebSocket|sendBeacon|axios/i.test(js));
  ck('★无第三方统计埋点', !/gtag|analytics|umeng|sensors|clarity|hotjar|baidu/i.test(html));
  ck('★无外部资源引用', (html.match(/(src|href)=["']https?:\/\//g)||[]).length===0);
  ck('★无 cookie 使用', !/document\.cookie/.test(js));
  ck('★无设备指纹采集', !/canvas.*getImageData|webgl.*getParameter/.test(js));
  ck('★链接不带任何配置参数', !/\?data=|\?cfg=|\?config=|location\.search/.test(js));
  ck('★URL hash 不用于读配置', !/location\.hash/.test(js));
  ck('数据只存 localStorage', /localStorage\.setItem\(KEY/.test(js) && !/indexedDB/.test(js));
  console.log('    → 别人打开网址 → 他自己的 localStorage 是空的 → 读到 DEF');
  console.log('    → 你的请假记录/皮肤/调色 物理隔离在你浏览器里，链接不携带');
}

console.log('\n【4】一键清空（借给别人前用）');
{
  ck('resetAllData 函数', /function resetAllData/.test(js));
  ck('确认面板存在', /id="resetSheet"/.test(html) && /id="resetBox"/.test(html));
  ck('设置里有入口按钮', /id="btnResetAll"/.test(html));
  ck('★删除所有 salary_ticker 开头的键', /startsWith\('salary_ticker'\)/.test(js));
  ck('★删完自动刷新', /location\.reload\(\)/.test(js));
  ck('有二次确认', /确认清空/.test(html));
  ck('★警告借给别人前要用', /借给别人用/.test(html));
  ck('★警告不可撤销', /无法撤销/.test(js));
  ck('列出清空的具体内容', /所有请假、加班记录/.test(js));
  ck('恢复默认也会标记为已看过', /CFG=JSON\.parse\(JSON\.stringify\(DEF\)\); markSeen\(\); save\(\)/.test(js));
}

console.log('\n【5】原有功能未破坏');
{
  ck('日薪计算仍在', /const rate = due>0 \? CFG\.salary\/due/.test(js));
  ck('加班费仍在', /const finalPay=CFG\.salary - deduct \+ otPay/.test(js));
  ck('★双休制度仍可被选中', /workMode:'double'/.test(js) && /segWork.*double|data-v="double"/.test(html));
  ck('大小周仍可被选中', /data-v="alt"/.test(html));
  ck('单休仍可被选中', /data-v="single"/.test(html));
  ck('轮盘仍在', /function openWheel/.test(js));
  ck('日历星期修正仍在', /const WEEK=\['日','一','二','三','四','五','六'\]/.test(js));
  ck('时间轴单端仍在', /class="sb-knob r"/.test(html));
  ck('事件委托仍在', /function initYearClick/.test(js));
  ck('PWA 注册仍在', /serviceWorker\.register\('\.\/sw\.js'\)/.test(js));
  ck('安装按钮仍在', /id="btnInstall"/.test(html));
  ck('皮肤系统仍在', /function injectDecor/.test(js));
  ck('★老板键已移除', !/toggleHide/.test(js));
  ck('导出配置仍在', /id="btnExport"/.test(html));
}
