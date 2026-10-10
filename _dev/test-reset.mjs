// 实测：四个复位按钮
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
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
    _fire(ev,e){(h[ev]||[]).forEach(fn=>{try{fn(e||{});}catch(err){errors.push(`${id}.${ev}: ${err.message}`);}});},
    getBoundingClientRect(){return {left:0,width:100,top:0,height:20};},
    closest(){return null;}, appendChild(c){kids.push(c);return c;}, insertBefore(c){kids.push(c);return c;},
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
global.window={open:null,scrollTo(){},addEventListener(){}};
global.setInterval=()=>0; global.setTimeout=()=>0; global.clearTimeout=()=>{};
global.getSelection=()=>({removeAllRanges(){},addRange(){}});

const FIXED=new Date(2026,9,9,14,30,0).getTime();
const RD=Date;
global.Date=class extends RD{
  constructor(...a){return a.length?new RD(...a):new RD(FIXED);}
  static now(){return FIXED;}
};

new Function(js)();

const show=()=>`上午 ${nodes.tlA1.textContent}→${nodes.tlA2.textContent} | 午休 ${nodes.tlB1.textContent}→${nodes.tlB2.textContent} | 下午 ${nodes.tlC1.textContent}→${nodes.tlC2.textContent}`;
const pre=()=>`已过 A=${nodes.filA.style.width} 预设A=${nodes.preA.style.width} | B=${nodes.filB.style.width}/${nodes.preB.style.width} | C=${nodes.filC.style.width}/${nodes.preC.style.width}`;

console.log('配置: 上班 09:00 下班 18:00 午休 12:00-13:00');
console.log('当前时间: 14:30\n');
console.log('初始:   '+show());
console.log('        '+pre());

console.log('\n=== 模拟把下午拉到 6 小时（拖动到一半位置）===');
nodes.trkC._fire('mousedown',{preventDefault(){},stopPropagation(){},clientX:50,touches:[{clientX:50}]});
console.log('拖动后: '+show());
console.log('        '+pre());

console.log('\n=== 点「下班复位」===');
nodes.btnResetDown._fire('click',{preventDefault(){},stopPropagation(){}});
console.log('复位后: '+show());
console.log('        '+pre());
console.log('  toast: '+nodes.toast.textContent);

console.log('\n=== 点「上班复位」===');
nodes.trkA._fire('mousedown',{preventDefault(){},stopPropagation(){},clientX:95,touches:[{clientX:95}]});
console.log('拖动后: '+show());
nodes.btnResetUp._fire('click',{preventDefault(){},stopPropagation(){}});
console.log('复位后: '+show());
console.log('  toast: '+nodes.toast.textContent);

console.log('\n=== 点「午休复位」===');
nodes.trkB._fire('mousedown',{preventDefault(){},stopPropagation(){},clientX:20,touches:[{clientX:20}]});
console.log('拖动后: '+show());
nodes.btnResetNoon._fire('click',{preventDefault(){},stopPropagation(){}});
console.log('复位后: '+show());
console.log('  toast: '+nodes.toast.textContent);

console.log('\n=== 点「全部复位」===');
nodes.trkA._fire('mousedown',{preventDefault(){},stopPropagation(){},clientX:88,touches:[{clientX:88}]});
nodes.trkB._fire('mousedown',{preventDefault(){},stopPropagation(){},clientX:88,touches:[{clientX:88}]});
console.log('全部拖动后: '+show());
nodes.btnTlReset._fire('click',{preventDefault(){},stopPropagation(){}});
console.log('全部复位后: '+show());
console.log('  toast: '+nodes.toast.textContent);
console.log('        '+pre());

if(errors.length){ console.log('\n错误:'); errors.forEach(e=>console.log('  '+e)); }
else console.log('\n✓ 无错误');
