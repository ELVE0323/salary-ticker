// 真机模拟：引导页两条路径（A 填完提交 / B 点叉跳过）
import fs from 'fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const js   = html.split('<script>')[1].split('</script>')[0];

const store={}, nodes={}, errors=[];
let SKIP_ANSWER=true;                    // confirm() 返回 true
function mkNode(id){
  const h={}, kids=[];
  const cls={_s:new Set()};
  const obj={
    id, innerHTML:'', textContent:'', value:'', type:'', tagName:'DIV',
    contentEditable:'false', isContentEditable:false,
    style:{_v:{},setProperty(k,v){this._v[k]=v;},removeProperty(k){delete this._v[k];},getPropertyValue(k){return this._v[k]||'';}},
    dataset:{}, _kids:kids, className:'',
    classList:{
      _s:cls._s,
      add(...c){c.forEach(x=>cls._s.add(x)); obj.className=[...cls._s].join(' ');},
      remove(...c){c.forEach(x=>cls._s.delete(x)); obj.className=[...cls._s].join(' ');},
      toggle(c,f){ const on=f===undefined?!cls._s.has(c):f; on?cls._s.add(c):cls._s.delete(c); obj.className=[...cls._s].join(' ');},
      contains(c){return cls._s.has(c);}
    },
    addEventListener(ev,fn){ (h[ev]=h[ev]||[]).push(fn); },
    _fire(ev,e){ (h[ev]||[]).forEach(fn=>{ try{ fn(e||{}); }catch(err){ errors.push(`${id}.${ev}: ${err.message}`); } }); },
    getBoundingClientRect(){ return {left:0,width:100,top:0,height:16}; },
    closest(){ return null; }, appendChild(c){ kids.push(c); return c; }, insertBefore(c){ kids.push(c); return c; },
    remove(){}, focus(){}, blur(){}, scrollIntoView(){}, setAttribute(){}, getAttribute(){return null}, removeAttribute(){},
    querySelectorAll(){ return []; }, querySelector(){ return null; },
  };
  return obj;
}
global.document={
  body: mkNode('body'),
  activeElement: null,
  getElementById(id){ return nodes[id]||(nodes[id]=mkNode(id)); },
  querySelectorAll(sel){
    if(sel==='.time-quick') return [];
    if(sel==='[data-close]') return [];
    if(sel==='.sheet') return [];
    if(sel.includes('.day')) return Array.from({length:31},(_,i)=>{
      const el=mkNode('d'+i); el.dataset.k=`2026-10-${String(i+1).padStart(2,'0')}`; return el;});
    return [];
  },
  querySelector(sel){
    if(sel==='.hero') return mkNode('hero');
    if(sel==='.rankcard') return mkNode('rankcard');
    if(sel==='.quotebox') return mkNode('quotebox');
    return null;
  },
  createElement(t){ return mkNode('new-'+t); },
  createElementNS(ns,t){ return mkNode('svg'); },
  addEventListener(){},
  documentElement:{dataset:{theme:'keyboard'}, style:{colorScheme:'dark', setProperty(){},removeProperty(){}}},
  createRange:()=>({selectNodeContents(){}}),
};
global.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;},removeItem:k=>{delete store[k];}};
Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:()=>Promise.resolve()}},writable:true,configurable:true});
global.requestAnimationFrame=()=>0;
global.confirm=()=>SKIP_ANSWER;
global.prompt=()=>null;
global.window={open:null,scrollTo(){},addEventListener(){}};
global.setInterval=()=>0; global.setTimeout=()=>0; global.clearTimeout=()=>{};
global.getSelection=()=>({removeAllRanges(){},addRange(){}});

console.log('=== 执行页面脚本 ===');
try{ new Function(js)(); console.log('✓ 脚本执行成功');
     console.log('  引导面板默认显示: '+(nodes.welcomeSheet.className.includes('show')?'是':'否'));
     console.log('  叉号按钮存在: '+(nodes.btnWelcomeSkip?'✓ 有':'★没有'));
     console.log('  开始按钮存在: '+(nodes.btnWelcomeSave?'✓ 有':'★没有'));
}catch(e){
  console.log('★ 脚本异常: '+e.message);
  console.log(e.stack.split('\n').slice(0,5).join('\n'));
  process.exit(1);
}

// ===== 路径 A：默认值直接点开始（不填任何东西）=====
console.log('\n=== A：什么都不改 → 直接点「开始算钱」 ===');
console.log('  默认值: 薪资='+JSON.stringify(nodes.wSalary.value)
  +' 上班='+nodes.wStart.value+' 下班='+nodes.wEnd.value
  +' 午休='+nodes.wLunch1.value+'-'+nodes.wLunch2.value
  +' 工时='+JSON.stringify(nodes.wHours.value));
nodes.btnWelcomeSave._fire('click',{preventDefault(){},stopPropagation(){}});
report('A');

// ===== 路径 B =====
console.log('\n=== B：什么都不填 → 点 ✕ 跳过 ===');
Object.keys(nodes).forEach(k=>delete nodes[k]);
Object.keys(store).forEach(k=>delete store[k]);
errors.length=0;
new Function(js)();                       // 重新执行（模拟刷新后再次进入）

nodes.btnWelcomeSkip._fire('click',{preventDefault(){},stopPropagation(){}});
report('B');

function report(tag){
  console.log('  错误: '+(errors.length ? errors.join(' | ') : '无 ✓'));
  const saved=store['salary_ticker_v2'];
  console.log('  CFG 保存: '+(saved?('✓ '+saved.slice(0,110)):'（跳过则不保存）'));
  console.log('  面板关闭: '+(nodes.welcomeSheet.className.includes('show')?'★还卡着':'✓ 已关'));
  console.log('  标记看过: '+(store['salary_ticker_v2_seen']?'✓ 是':'★否（会反复弹）'));
  if(saved){
    const c=JSON.parse(saved);
    console.log(`  → hours=${c.hours}  workMode=${c.workMode}  salary=${c.salary}`);
  }
}