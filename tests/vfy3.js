// 用「真身」查词链核对，禁止重写业务函数
const fs=require('fs');const H=fs.readFileSync('index.html','utf8');
function lit(name){
  const i=H.indexOf('const '+name+' = '); if(i<0) throw new Error('no '+name);
  let st=H.indexOf('{',i),d=0,j=st,inS=false,esc=false;
  for(;j<H.length;j++){const c=H[j];
    if(inS){if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')inS=false;continue;}
    if(c==='"'){inS=true;continue;}
    if(c==='{')d++;else if(c==='}'){d--;if(d===0){j++;break;}}}
  return eval('('+H.slice(st,j)+')');
}
const VOCAB=lit('VOCAB'),READINGS=lit('READINGS'),SENTENCES=lit('SENTENCES'),
      FORMS_MAP=lit('FORMS_MAP'),IPA_MAP=lit('IPA_MAP'),IPA_EXTRA=lit('IPA_EXTRA'),
      BASE_CN=lit('BASE_CN'),BASE_IPA=lit('BASE_IPA');
const normKey=s=>String(s||'').toLowerCase().replace(/[’]/g,"'").replace(/[^a-z']/g,'');
const EN2CN={};Object.keys(VOCAB).forEach(k=>(VOCAB[k].words||[]).forEach(w=>{if(EN2CN[w.en]===undefined)EN2CN[w.en]=w.cn;}));
const GLOSS_MAP={};
Object.keys(SENTENCES).forEach(k=>(SENTENCES[k].items||[]).forEach(it=>{
  Object.keys(it.g||{}).forEach(w=>{const n=w.toLowerCase().replace(/[’]/g,"'");if(n&&GLOSS_MAP[n]===undefined)GLOSS_MAP[n]=it.g[w];});}));
const BASE_MAP={};Object.keys(BASE_CN).forEach(k=>BASE_MAP[normKey(k)]=BASE_CN[k]);
const BASE_IPA_MAP={};Object.keys(BASE_IPA).forEach(k=>BASE_IPA_MAP[normKey(k)]=BASE_IPA[k]);

// ↓↓↓ 切真身，不重写
const a=H.indexOf('  function lemmaCandidates(w) {');
const b=H.indexOf('  // ---- 把句子切成可点的词 ----', a);
const REAL=H.slice(a,b);
const CH=new Function('normKey','FORMS_MAP','IPA_MAP','IPA_EXTRA','BASE_IPA_MAP','GLOSS_MAP','EN2CN','BASE_MAP',
  REAL+'\n return { lemmaCandidates, ipaOf, glossOf };')(normKey,FORMS_MAP,IPA_MAP,IPA_EXTRA,BASE_IPA_MAP,GLOSS_MAP,EN2CN,BASE_MAP);

const TOK=/[A-Za-z][A-Za-z'’\-]*/g;
const norm=s=>s.toLowerCase().replace(/[’]/g,"'").replace(/[^a-z']/g,'');
const mI=new Set(),mG=new Set();
function scan(txt,src,extraGloss){
  (String(txt).match(TOK)||[]).forEach(t=>{
    const c0=t.charCodeAt(0); if(!((c0>=65&&c0<=90)||(c0>=97&&c0<=122)))return;
    const c=norm(t); if(!c)return;
    if(!CH.ipaOf(c)) mI.add(src+'|'+t);
    if(!CH.glossOf(c,extraGloss)) mG.add(src+'|'+t);
  });
}
console.log('=== 用真身链核对 ===');
Object.keys(SENTENCES).forEach(k=>(SENTENCES[k].items||[]).forEach(it=>scan(it.en,'句库',it.g)));
Object.keys(READINGS).forEach(k=>READINGS[k].paras.forEach(p=>scan(p.en,k,Object.assign({},READINGS[k].gloss,p.g||{}))));
console.log('  缺音标 '+mI.size+' 个: '+[...mI].join(', '));
console.log('  缺释义 '+mG.size+' 个: '+[...mG].join(', '));
console.log('\n=== separate 走真身链的结果 ===');
console.log('  lemmaCandidates:', JSON.stringify(CH.lemmaCandidates('separate')));
console.log('  ipaOf:', JSON.stringify(CH.ipaOf('separate')));
console.log('  glossOf:', JSON.stringify(CH.glossOf('separate',{})), '（句库里有 g 时应能查到）');
const g={}; Object.keys(SENTENCES).forEach(k=>(SENTENCES[k].items||[]).forEach(it=>{if(/separate/i.test(it.en))Object.assign(g,it.g);}));
console.log('  带句库 g:', JSON.stringify(CH.glossOf('separate',g)));
