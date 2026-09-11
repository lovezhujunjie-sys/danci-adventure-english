const fs=require('fs');
const src=fs.readFileSync('index.html','utf8');
function cut(a,b){const i=src.indexOf(a),j=src.indexOf(b);
  if(i<0||j<0||j<i) throw new Error("提取失败: "+a); return src.slice(i,j);}

// 被测的全部是文件里的真实代码文本(todayStr / checkDay / 计时器)
const CODE =
  cut('  function todayStr() {','  function defaults()') +
  cut('  // 检查日期，更新连续天数','  // 任意一次学习互动：计入今日/历史/累计/连续天数') +
  cut('  // ===== ⏱️ 今日学习时长','  // ===== 生词本 + 间隔复习 (SRS) =====');

const RealDate = Date;
let NOW = new RealDate(2026,8,11,10,0,0).getTime();   // 2026-09-11 10:00
class FakeDate extends RealDate {
  constructor(...a){ if(a.length===0) super(NOW); else super(...a); }
  static now(){ return NOW; }
}

let progress={todaySec:0,todayDay:'2026-9-11',todayCount:0,_unsavedSec:0};
const saved=[];
const saveProgress=()=>saved.push(progress.todaySec);
// 2026-09-11 起 _isStudying() 不再看 window.__curScreen，改为直接查 DOM 哪个学习界面露着
// （闪卡/拼读/游戏三个模式走裸 classList，从不设 __curScreen，害得最常用的模式计时恒为 0）
// 所以桩要能提供带 classList.contains 的屏幕元素
const SCREENS=["study-screen","phonics-screen","games-screen","game-screen","type-screen",
  "listen-screen","sentence-screen","pattern-screen","map-screen","reading-screen","review-screen"];
const win={addEventListener:()=>{}};
const listeners={}; const els={};
function mkEl(id){
  const cls=new Set();
  return {id,textContent:"",style:{},cls,
    classList:{add:(c)=>cls.add(c),remove:(c)=>cls.delete(c),contains:(c)=>cls.has(c),
               toggle:(c,on)=>{on?cls.add(c):cls.delete(c);}}};
}
["m30","m30-val","m30-fill","m30-sub",...SCREENS].forEach(id=>{els[id]=mkEl(id);});
// 初始:全部学习界面都是隐藏的(等于停在首页)
SCREENS.forEach(id=>els[id].cls.add("hidden"));
const doc={visibilityState:"visible",
  addEventListener:(e,cb)=>{(listeners[e]=listeners[e]||[]).push(cb);},
  getElementById:(id)=>els[id]||null};
let tickCb=null;
const setIntervalStub=(cb)=>{tickCb=cb;};

new Function("window","document","progress","saveProgress","setInterval","setTimeout","Math","Date", CODE)
  (win,doc,progress,saveProgress,setIntervalStub,setTimeout,Math,FakeDate);

const act=()=>{(listeners["click"]||[]).forEach(f=>f());};
const tick=(ms)=>{ NOW+=ms; tickCb(); };
const hide=()=>{doc.visibilityState="hidden";(listeners["visibilitychange"]||[]).forEach(f=>f());};
const show=()=>{doc.visibilityState="visible";(listeners["visibilitychange"]||[]).forEach(f=>f());};
// 显示某个学习界面 = 把别的都藏起来、只留它（跟真实切屏一样，只会有一个露着）
const go=(id)=>{SCREENS.forEach(x=>x===id?els[x].cls.delete("hidden"):els[x].cls.add("hidden"));};
const goHome=()=>SCREENS.forEach(x=>els[x].cls.add("hidden"));

let pass=0,fail=0;
const chk=(name,got,exp)=>{const ok=got===exp;ok?pass++:fail++;
  console.log((ok?"✅":"❌")+" "+name+"  期望 "+exp+" 实得 "+got);};
const run=(name,setup,ms,exp)=>{const b=progress.todaySec; setup(); tick(ms); chk(name,progress.todaySec-b,exp);};

console.log("── 计时器实测(直接跑 index.html 里的真实代码) ──");
run("① 首页闲逛不计时",        ()=>{goHome();act();},30000,0);
run("② 闪卡(单词学习)计时",     ()=>{go("study-screen");act();},30000,30);
run("③ 阅读界面同样计时",       ()=>{go("reading-screen");act();},20000,20);
run("④ 切走页面(锁屏/切tab)不计",()=>{go("study-screen");hide();act();},60000,0);
show();
run("⑤ 挂机3分钟无操作不计",    ()=>{go("study-screen");NOW+=180000;},10000,0);
run("⑥ 休眠跳变10分钟只记30秒", ()=>{go("study-screen");NOW+=600000;act();},0,30);
run("⑥b 🔴切走那一刻的尾段要结算(以前被可见性判断挡掉白丢)",()=>{
  go("study-screen"); act(); NOW+=4000; hide();   // hide 内部会补一次结算
},0,4);
show(); goHome();
run("⑦ 成就页不计时(所有学习界面都藏着)",()=>{goHome();act();},30000,0);
run("⑧ 首页不计时(再验)",       ()=>{goHome();act();},30000,0);
run("⑧b 🔴字母拼读计时",        ()=>{go("phonics-screen");act();},30000,30);
run("⑧c 🔴游戏乐园计时",        ()=>{go("games-screen");act();},30000,30);

// ⑨ 跨天归零 —— 直接调真实入口 getTodaySec()(内部会跑真实 checkDay + 真实 todayStr)
progress.todaySec=1500; progress.todayCount=42;
NOW += 86400000;                      // 时间推进到第二天
chk('⑨ 跨天自动归零',win.getTodaySec(),0);
chk('⑨b 跨天计数归零',progress.todayCount,0);
chk('⑨c 跨天后日期已更新',progress.todayDay.indexOf('2026-9-12')>=0,true);

// ⑩ 渲染层
progress.todaySec=12*60; win.renderM30();
chk('⑩ 文案 12/30',els['m30-val'].textContent,'12 / 30 分钟');
chk('⑪ 进度条 40%',els['m30-fill'].style.width,'40%');
chk('⑫ 剩余提示含"还差 18 分钟"',els['m30-sub'].textContent.indexOf('还差 18 分钟')>=0,true);
chk('⑬ 未达标无 done',els['m30'].cls.has('done'),false);
progress.todaySec=31*60; win.renderM30();
chk('⑭ 达标加 done',els['m30'].cls.has('done'),true);
chk('⑮ 封顶不溢出',els['m30-fill'].style.width,'100%');
chk('⑯ 达标文案',els['m30-sub'].textContent.indexOf('今天达标了')>=0,true);
chk('⑰ 首页加载即渲染',typeof win.renderM30,'function');
chk('⑱ 对外暴露 getTodaySec',typeof win.getTodaySec,'function');
chk('⑲ getTodaySec 返回秒数',win.getTodaySec()>=31*60,true);

console.log('\n结果: '+pass+' 通过 / '+fail+' 失败');
process.exit(fail?1:0);
