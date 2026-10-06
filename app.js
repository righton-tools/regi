// POSレジ本体（全店共通）。店ごとの中身は起動時に渡される設定 CFG で決まる
window.startPOS=function(CFG,SHOP_ID,DB,ME){
'use strict';
const ROOT=document.getElementById('root');
ROOT.innerHTML='<div id="app">  <header class="bar">    <div class="logo"><b></b><span></span></div>    <nav class="tabs" id="tabs"></nav>    <div class="meta"><span id="barhelp"></span><span class="pill" id="sync"><i></i><span>接続中</span></span><span class="clock num" id="clock"></span></div>  </header>  <div id="wxask" hidden></div>  <main id="main"></main></div><div id="modal" hidden></div><div id="toasts"></div>';
document.title=CFG.name+' POSレジ';
if(CFG.logoImg){const L=document.querySelector('.logo');L.classList.add('haslogo');L.innerHTML='<img alt=""><span></span>';L.querySelector('img').src=CFG.logoImg;L.querySelector('img').alt=CFG.name}
else document.querySelector('.logo b').textContent=CFG.logo||CFG.name;
document.querySelector('.logo span').textContent=CFG.sub||'';
try{localStorage.setItem('pos.brand',JSON.stringify({img:CFG.logoBig||CFG.logoImg||'',bar:(CFG.colors||{}).bar||'',accent:(CFG.colors||{}).accent||'',ink:(CFG.colors||{}).accentInk||'',name:CFG.name}))}catch(e){}
(()=>{const c=CFG.colors||{},d=c.dark||{},v=o=>Object.entries({'--shu':o.accent,'--shu-ink':o.accentInk,'--shu-soft':o.accentSoft,'--bar':o.bar,'--logo':o.logo,'--f-logo':o===c?CFG.logoFont:null,'--w-logo':o===c?CFG.logoWeight:null}).filter(x=>x[1]).map(x=>x[0]+':'+x[1]).join(';');
  const st=document.createElement('style');st.textContent=':root{'+v(c)+'}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){'+v(d)+'}}:root[data-theme="dark"]{'+v(d)+'}';document.head.appendChild(st);
  if(CFG.fontsHref){const l=document.createElement('link');l.rel='stylesheet';l.href=CFG.fontsHref;document.head.appendChild(l)}})();
(()=>{try{const ic=CFG.icon||{},cv=document.createElement('canvas');cv.width=cv.height=180;const x=cv.getContext('2d');
  const put=()=>{const u=cv.toDataURL('image/png');document.querySelectorAll('link[rel="apple-touch-icon"],link[rel="icon"]').forEach(l=>l.href=u)};
  x.fillStyle=ic.bg||(CFG.colors||{}).bar||'#2a2221';x.fillRect(0,0,180,180);
  const m=document.querySelector('meta[name="apple-mobile-web-app-title"]');if(m)m.content=CFG.short||CFG.name;
  if(CFG.logoImg){const im=new Image();im.onload=()=>{const pad=180*(ic.pad==null?.12:ic.pad),k=Math.min((180-pad*2)/im.width,(180-pad*2)/im.height),w=im.width*k,h=im.height*k;x.drawImage(im,(180-w)/2,(180-h)/2,w,h);put()};im.src=CFG.logoImg;return}
  const t=ic.text||CFG.logo||CFG.name;let fs=72;x.fillStyle=ic.fg||'#ffffff';x.textAlign='center';x.textBaseline='middle';do{x.font='900 '+fs+'px '+(ic.font==='serif'?'"Yu Mincho","Hiragino Mincho ProN",serif':'"Yu Gothic","Hiragino Sans",sans-serif');fs-=4}while(x.measureText(t).width>120&&fs>12);x.fillText(t,90,94);put()}catch(e){}})();
const PFX='pos.'+SHOP_ID+'.';
const HP=k=>window.POSHelp?window.POSHelp.btn(k):'';
const PA=window.POSAuth,BOSS=ME.role==='manager'||ME.role==='master';
/* ---------- 小道具 ---------- */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const yen=n=>'¥'+Math.round(n||0).toLocaleString('ja-JP');
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const p2=n=>String(n).padStart(2,'0');
const dayOf=t=>{const d=new Date(t);return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())};
const hm=t=>{const d=new Date(t);return p2(d.getHours())+':'+p2(d.getMinutes())};
const ls={get(k,d){try{const v=localStorage.getItem(PFX+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
          set(k,v){try{localStorage.setItem(PFX+k,JSON.stringify(v))}catch(e){}}};

const QS=new URLSearchParams(location.search);
const CAN_PRINT=true;

/* ---------- 店舗ごとの設定（shop.js）から読み込む ---------- */
const SHOP={name:CFG.name,addr:CFG.addr||'',tel:CFG.tel||''};
const TABS=CFG.tabs,GROUPS=CFG.groups||{},DEFAULT_MENU=(CFG.menu||[]).flatMap(g=>g.items?g.items.map(it=>({id:it[0],tab:g.tab,sec:g.sec,name:it[1],price:it[2],mods:it[3]||g.mods||[]})):[{...g,mods:g.mods||[]}]),DEFAULT_SEATS=CFG.seats;
const TAX=CFG.taxRate==null?10:CFG.taxRate,taxOf=(t,r)=>Math.floor(t*r/(100+r));
const rateFor=seat=>(CFG.takeoutWords||['テイクアウト','持ち帰り']).some(w=>String(seat).includes(w))?(CFG.takeoutTaxRate==null?8:CFG.takeoutTaxRate):TAX;
const METHODS=CFG.payments,METHOD=Object.fromEntries(METHODS.map(m=>[m.id,m.name])),isCash=id=>!!(METHODS.find(m=>m.id===id)||{}).cash;
const secTime=n=>{const w=(CFG.timeSections||[]).find(x=>x.sec===n);if(!w)return '';const d=new Date(),m=d.getHours()*60+d.getMinutes(),t=x=>+x.split(':')[0]*60+ +x.split(':')[1];
  return `<em>${w.from}〜${w.to}${m>=t(w.from)&&m<=t(w.to)?'':'（時間外）'}</em>`};
const ST={new:'新着',cooking:'調理中',served:'提供済'};

/* ---------- 会計のときに任意で残す記録項目・天気 ---------- */
const DEFAULT_TAGS=(CFG.tags||[
  {id:'pax',name:'人数',type:'num',on:true},
  {id:'sex',name:'性別',type:'one',opts:['男性','女性','男女'],on:true},
  {id:'age',name:'年齢層',type:'one',opts:['10代以下','20代','30代','40代','50代','60代以上'],on:true},
  {id:'grp',name:'利用',type:'one',opts:['ひとり','友人','カップル','家族','仕事'],on:false},
  {id:'rep',name:'来店',type:'one',opts:['はじめて','リピート','常連'],on:false},
  {id:'via',name:'きっかけ',type:'one',opts:['通りがかり','SNS','ネット検索','紹介','チラシ・看板'],on:false},
  {id:'memo',name:'ひとことメモ',type:'text',on:false}]).map(t=>({...t,opts:t.opts||[]}));
const TAGTYPE={one:'1つ選ぶ',multi:'いくつでも選ぶ',num:'数を入れる',text:'文字で書く'};
const WXC=CFG.weather||{office:'400000',area:'400010',amedas:'82182'};
const WX=['晴れ','くもり','雨','雪'],DOW=['日','月','火','水','木','金','土'];
const dstr=d=>d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
const dparse=s=>{const a=s.split('-').map(Number);return new Date(a[0],a[1]-1,a[2])};


/* ---------- 保存先（共有DB。使えない時はこの端末内に保存） ---------- */
const Store={mode:'wait',db:null,root:null,online:false,failed:false,cbs:{},q:{},bc:null,
  async init(){
    if(SHOP_ID){
      if(DB){try{
        this.root=DB.ref('shops/'+SHOP_ID);this.mode='fb';
        DB.ref('.info/connected').on('value',s=>{this.online=!!s.val();renderBar()});
        return}catch(e){}}
      this.failed=true;
    }
    let db=null;
    try{if(window.claude&&window.claude.use)db=await window.claude.use('db')}catch(e){}
    if(db){this.db=db;this.mode='db'}
    else{this.mode='local';
      try{this.bc=new BroadcastChannel(PFX);this.bc.onmessage=e=>this._emit(e.data)}catch(e){}
      window.addEventListener('storage',e=>{if(e.key&&e.key.startsWith(PFX+'db.'))this._emit(e.key.slice(PFX.length+3))});}
  },
  _load(c){return ls.get('db.'+c,{})},
  _emit(c){const m=this._load(c);(this.cbs[c]||[]).forEach(f=>f(Object.keys(m).map(id=>({...m[id],id}))))},
  _local(c,fn){const m=this._load(c);fn(m);ls.set('db.'+c,m);this._emit(c);try{this.bc&&this.bc.postMessage(c)}catch(e){}return Promise.resolve()},
  sub(c,cb){
    if(this.mode==='fb'){this.root.child(c).on('value',s=>{const v=s.val()||{};cb(Object.keys(v).map(id=>({...v[id],id})))},e=>{toast('このログインでは見られなくなりました。ログインし直してください','err');setTimeout(()=>ME.kick(),2500)});return}
    if(this.mode==='db'){this.db.collection(c).onSnapshot(s=>cb(s.docs.map(d=>({...d.data(),id:d.id}))),e=>toast('データの受信が止まりました。画面を開き直してください','err'));}
    else{(this.cbs[c]=this.cbs[c]||[]).push(cb);this._emit(c)}
  },
  _chain(path,fn){const run=async()=>{for(let i=0;;i++){try{return await fn()}catch(e){
        if(i<3&&e&&(e.code==='unavailable'||e.code==='resource_exhausted')){await new Promise(r=>setTimeout(r,800+Math.random()*900));continue}throw e}}};
    const p=(this.q[path]||Promise.resolve()).catch(()=>{}).then(run);this.q[path]=p;return p},
  _fb(fn){try{fn().catch(()=>toast('保存できませんでした。通信を確認してもう一度お試しください','err'))}catch(e){return Promise.reject(e)}return Promise.resolve()},
  set(c,id,data){return this.mode==='fb'?this._fb(()=>this.root.child(c+'/'+id).set(data)):this.mode==='db'?this._chain(c+'/'+id,()=>this.db.collection(c).doc(id).set(data)):this._local(c,m=>{m[id]=data})},
  update(c,id,patch){return this.mode==='fb'?this._fb(()=>this.root.child(c+'/'+id).update(patch)):this.mode==='db'?this._chain(c+'/'+id,()=>this.db.collection(c).doc(id).update(patch)):this._local(c,m=>{if(m[id])Object.assign(m[id],patch)})},
  del(c,id){return this.mode==='fb'?this._fb(()=>this.root.child(c+'/'+id).remove()):this.mode==='db'?this._chain(c+'/'+id,()=>this.db.collection(c).doc(id).delete()):this._local(c,m=>{delete m[id]})}
};
async function w(p,okMsg){
  try{await p;if(okMsg)toast(okMsg);return true}
  catch(e){toast(e&&e.code==='invalid_argument'?'この端末には書き込み権限がありません':e&&e.code==='quota_exceeded'?'保存容量がいっぱいです。日締めをしてください':'保存できませんでした。通信を確認してもう一度お試しください','err');return false}
}

/* ---------- 状態 ---------- */
const DEV=ls.get('dev',null)||(()=>{const d=uid();ls.set('dev',d);return d})();
const S={
  role:ls.get('role',null)||(['staff','register'].includes(QS.get('r'))?QS.get('r'):window.innerWidth>=900?'register':'staff'),
  tab:'order',cat:TABS[0][0],seat:null,soldMode:false,
  staff:ls.get('staff',''),sound:ls.get('sound',true),
  orders:[],sales:[],days:[],wx:[],tags:DEFAULT_TAGS,per:{k:'day',off:0},menu:DEFAULT_MENU,seats:DEFAULT_SEATS,sold:[],
  drafts:ls.get('drafts',{}),customMenu:false
};
S.seat=S.seats[0];
const item=id=>S.menu.find(m=>m.id===id);
const draft=()=>S.drafts[S.seat]||(S.drafts[S.seat]=[]);
const saveDrafts=()=>ls.set('drafts',S.drafts);
const unitOf=l=>l.base+l.mods.reduce((a,m)=>a+m.p,0);
const openOrders=seat=>S.orders.filter(o=>o.seat===seat&&!o.paid).sort((a,b)=>a.at-b.at);
const sumLines=ls_=>ls_.reduce((a,l)=>a+l.unit*l.qty,0);
const sumOrders=os=>os.reduce((a,o)=>a+sumLines(o.lines||[]),0);
const who=()=>S.staff||(S.role==='register'?'レジ':'スタッフ');

/* ---------- 通知 ---------- */
let actx=null;
function beep(){
  if(!S.sound)return;
  try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();
    [[880,0],[1175,.16],[1568,.32]].forEach(([f,t])=>{const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=f;o.type='sine';
      g.gain.setValueAtTime(.0001,actx.currentTime+t);g.gain.exponentialRampToValueAtTime(.35,actx.currentTime+t+.02);g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+t+.3);
      o.connect(g).connect(actx.destination);o.start(actx.currentTime+t);o.stop(actx.currentTime+t+.32)});
  }catch(e){}
}
function toast(msg,type){
  const d=document.createElement('div');d.className='toast '+(type||'');d.textContent=msg;$('#toasts').appendChild(d);
  setTimeout(()=>d.remove(),type==='new'?9000:3500);
}
let known=null;
function detectNew(arr){
  if(known&&S.role==='register'){
    const fresh=arr.filter(o=>!known.has(o.id)&&o.dev!==DEV&&o.status==='new');
    if(fresh.length){beep();fresh.forEach(o=>toast('新しい注文 '+o.seat+'：'+(o.lines||[]).map(l=>l.name+'×'+l.qty).join('、'),'new'))}
  }
  known=new Set(arr.map(o=>o.id));
}

/* ---------- 画面：上部バー ---------- */
function renderBar(){
  const nNew=S.orders.filter(o=>o.status==='new').length;
  const tabs=S.role==='register'?[['order','注文・会計'],['feed','オーダー'],['sales','売上'],['settings','設定']]:BOSS?[['order','注文'],['feed','オーダー'],['sales','売上'],['settings','設定']]:[['order','注文'],['feed','オーダー'],['settings','設定']];
  $('#tabs').innerHTML=tabs.map(([k,n])=>`<button class="tab ${S.tab===k?'on':''}" data-a="tab" data-t="${k}">${n}${k==='feed'&&nNew?`<span class="badge num">${nNew}</span>`:''}</button>`).join('');
  const live=Store.mode==='db'||(Store.mode==='fb'&&Store.online);
  const s=$('#sync');s.className='pill '+(live?'live':Store.mode==='wait'?'':'local');
  s.lastElementChild.textContent=live?'連動中':Store.mode==='fb'?'電波待ち':Store.failed?'未接続':Store.mode==='local'?'この端末のみ':'接続中';
  $('#clock').textContent=hm(Date.now());
  const hb=$('#barhelp');if(hb)hb.innerHTML=HP(S.tab);
}

/* ---------- 画面：注文 ---------- */
function renderOrder(main){
  if(main.dataset.view!=='order'){
    main.dataset.view='order';
    main.innerHTML=`<div class="order" id="orderRoot"><aside id="seats" aria-label="席"></aside>
      <section id="menuPane"><div id="cats"></div><div id="grid"></div></section>
      <aside id="check" aria-label="伝票"></aside><button class="btn dark" id="checkBar" data-a="showcheck"></button></div>`;
  }
  $('#seats').innerHTML=S.seats.map(n=>{
    const os=openOrders(n),d=(S.drafts[n]||[]).length,t=sumOrders(os);
    return `<button class="seat ${os.length?'busy':''} ${S.seat===n?'sel':''}" data-a="seat" data-s="${esc(n)}"><b>${esc(n)}${d?'<i class="dot" title="未送信あり"></i>':''}</b><small class="num">${os.length?yen(t):d?'入力中':'空席'}</small></button>`}).join('');
  $('#cats').innerHTML=TABS.map(([k,n])=>`<button class="cat ${S.cat===k?'on':''}" data-a="cat" data-c="${k}">${n}</button>`).join('')
    +(S.role==='register'?`<button class="cat tool ${S.soldMode?'on':''}" data-a="soldmode">${S.soldMode?'売切を設定中（タップで終了）':'売切を設定'}</button>`:'');
  const secs=[];S.menu.filter(m=>m.tab===S.cat).forEach(m=>{let s=secs.find(x=>x.n===m.sec);if(!s)secs.push(s={n:m.sec,it:[]});s.it.push(m)});
  const dq={};draft().forEach(l=>dq[l.mid]=(dq[l.mid]||0)+l.qty);
  $('#grid').innerHTML=secs.map(s=>`<div class="sec">${esc(s.n)}${secTime(s.n)}</div>
    <div class="items">${s.it.map(m=>`<button class="item ${S.sold.includes(m.id)?'sold':''}" data-a="item" data-id="${m.id}"><b>${esc(m.name)}</b><span class="num">${yen(m.price)}</span>${dq[m.id]?`<i class="q num">${dq[m.id]}</i>`:''}</button>`).join('')}</div>`).join('')
    ||'<p class="empty">この分類にメニューがありません</p>';
  renderCheck();
}
function renderCheck(){
  const os=openOrders(S.seat),d=draft(),sent=sumOrders(os),dsum=d.reduce((a,l)=>a+unitOf(l)*l.qty,0),reg=S.role==='register';
  let h=`<div class="chead"><button class="mini cclose" data-a="hidecheck">← メニュー</button><h2>${esc(S.seat)}</h2>${os.length?`<small class="num">${hm(os[0].at)}〜</small>`:''}</div><div class="cbody">`;
  if(!os.length&&!d.length)h+=`<p class="empty">まだ注文がありません。<br>メニューをタップして追加してください。</p>`;
  os.forEach(o=>{
    h+=`<div class="round"><span class="num">${hm(o.at)}</span><span>${esc(o.by||'')}</span><span class="st ${o.status}">${ST[o.status]||''}</span></div>`;
    (o.lines||[]).forEach(l=>{h+=`<div class="ln"><span class="nm">${esc(l.name)} ×${l.qty}</span><span class="num">${yen(l.unit*l.qty)}</span>
      ${(l.mods&&l.mods.length)||l.note?`<span class="sub">${esc([...(l.mods||[]),l.note].filter(Boolean).join(' ／ '))}</span>`:''}
      ${reg?`<span class="ops"><button class="mini danger" data-a="cancelline" data-id="${o.id}" data-k="${l.k}">1点取消</button></span>`:''}</div>`});
  });
  if(d.length){
    h+=`<div class="round"><span class="st cooking">未送信</span><span>まだ厨房に届いていません</span></div>`;
    d.forEach(l=>{h+=`<div class="ln"><span class="nm">${esc(l.name)}</span><span class="num">${yen(unitOf(l)*l.qty)}</span>
      ${l.mods.length||l.note?`<span class="sub">${esc([...l.mods.map(m=>m.n),l.note].filter(Boolean).join(' ／ '))}</span>`:''}
      <span class="ops"><span class="step"><button data-a="qty" data-k="${l.k}" data-d="-1" aria-label="減らす">−</button><span class="num">${l.qty}</span><button data-a="qty" data-k="${l.k}" data-d="1" aria-label="増やす">＋</button></span>
      <button class="mini" data-a="editline" data-k="${l.k}">変更・メモ</button></span></div>`});
  }
  h+=`</div><div class="cfoot"><div class="tot"><small>合計（税込）${dsum?`<br>うち未送信 ${yen(dsum)}`:''}</small><b class="num">${yen(sent+dsum)}</b></div>`;
  if(d.length)h+=`<button class="btn pri" data-a="send">注文を送信（${d.reduce((a,l)=>a+l.qty,0)}点）</button>`;
  if(reg)h+=`<button class="btn dark" data-a="pay" ${!os.length||d.length?'disabled':''}>会計へ進む</button>${d.length&&os.length?'<p class="hint">未送信の注文を送信すると会計できます</p>':''}`;
  h+='</div>';
  $('#check').innerHTML=h;
  const n=d.reduce((a,l)=>a+l.qty,0);
  $('#checkBar').innerHTML=`<span>${esc(S.seat)}の伝票${n?`・未送信${n}点`:''}</span><b class="num">${yen(sent+dsum)}</b>`;
}

/* ---------- オプション選択 ---------- */
let X=null;
const cloneU=u=>({sel:Object.fromEntries(Object.entries(u.sel).map(([g,v])=>[g,[...v]])),note:u.note});
function openItem(mid,k){
  const m=item(mid);if(!m)return;
  const ln=k?draft().find(l=>l.k===k):null;
  const u={sel:{},note:ln?ln.note:''};
  m.mods.forEach(g=>u.sel[g]=ln?ln.mods.filter(x=>x.g===g).map(x=>x.n):[]);
  X={mid,k:k||null,qty:ln?ln.qty:1,same:true,cur:0,units:[u],
    get sel(){return this.units[this.cur].sel},
    get note(){return this.units[this.cur].note},set note(v){this.units[this.cur].note=v}};
  renderItemSheet();
}
const unitMods=(m,u)=>{const r=[];m.mods.forEach(g=>GROUPS[g].opts.forEach(([n,p])=>{if((u.sel[g]||[]).includes(n))r.push({g,n,p})}));return r};
const unitOk=(m,u)=>m.mods.every(g=>GROUPS[g].type!=='req'||(u.sel[g]||[]).length);
function renderItemSheet(){
  const m=item(X.mid),sep=!X.same&&X.qty>1;
  const ok=X.units.every(u=>unitOk(m,u));
  const total=sep?X.units.reduce((a,u)=>a+m.price+unitMods(m,u).reduce((b,x)=>b+x.p,0),0):(m.price+unitMods(m,X.units[0]).reduce((b,x)=>b+x.p,0))*X.qty;
  const keep=$('#modal .sheet .body'),top=keep?keep.scrollTop:0;
  showModal(`<div class="sheet"><header><h2>${esc(m.name)}</h2>${HP('options')}<button class="x" data-a="close" aria-label="閉じる">×</button></header><div class="body">
    <div class="grp"><h4>数量</h4><span class="step"><button data-a="xqty" data-d="-1" aria-label="減らす">−</button><span class="num">${X.qty}</span><button data-a="xqty" data-d="1" aria-label="増やす">＋</button></span>
    ${X.qty>1?`<span class="seg" style="margin-left:10px;vertical-align:middle"><button class="${sep?'':'on'}" data-a="xsame" data-v="1">全部同じ内容</button><button class="${sep?'on':''}" data-a="xsame" data-v="0">1つずつ選ぶ</button></span>`:''}</div>
    ${sep?`<div class="grp" style="margin-bottom:0"><h4>どれの内容を選ぶか、押して切り替えます</h4><div class="utabs">${X.units.map((u,i)=>{const sm=[...unitMods(m,u).map(x=>x.n),u.note.trim()].filter(Boolean).join('・');return `<button class="${i===X.cur?'on':''} ${unitOk(m,u)?'':'ng'}" data-a="xunit" data-i="${i}" ${i===X.cur?'aria-current="true"':''}><b>${i===X.cur?'✎ ':''}${i+1}つ目</b><small>${i===X.cur?'いま選択中':unitOk(m,u)?esc(sm||'追加なし'):'未選択'}</small></button>`}).join('')}</div></div>
    <div class="upanel"><div class="uhead">${X.cur+1}つ目（全${X.qty}つ）の内容を選んでいます</div>`:''}
    ${m.mods.map(g=>{const G=GROUPS[g];return `<div class="grp"><h4>${G.label}${G.type==='req'?'<em>必須</em>':''}</h4><div class="chips">${G.opts.map(([n,p])=>`<button class="chip ${X.sel[g].includes(n)?'on':''}" data-a="mod" data-g="${g}" data-n="${esc(n)}">${esc(n)}${p?` <span class="num">${p>0?'+':''}${p}円</span>`:''}</button>`).join('')}</div></div>`}).join('')}
    <div class="grp"><h4>${sep?(X.cur+1)+'つ目の':''}メモ（${esc(CFG.noteHint||'抜き・少なめ など')}）</h4><input class="inp" id="itemNote" style="width:100%" data-i="note" value="${esc(X.note)}" maxlength="40"></div>
    ${sep?'</div>':''}
    </div><footer>${X.k?'<button class="btn" data-a="xdel">この行を削除</button>':''}<button class="btn pri" data-a="xok" ${ok?'':'disabled'}>${X.k?'変更を反映':'伝票に追加'}　<span class="num">${yen(total)}</span></button></footer></div>`);
  const nb=$('#modal .sheet .body');if(nb&&top)nb.scrollTop=top;
}
function commitItem(){
  const m=item(X.mid),d=draft(),sep=!X.same&&X.qty>1;
  /* 同じ内容のものは1行にまとめ、違うものは別の行にする */
  const rows=[];
  (sep?X.units:[X.units[0]]).forEach(u=>{const mods=unitMods(m,u),note=u.note.trim(),key=mods.map(x=>x.g+':'+x.n).join(',')+'|'+note;
    const e=rows.find(r=>r.key===key);if(e)e.qty++;else rows.push({key,mods,note,qty:sep?1:X.qty})});
  const lines=rows.map((r,i)=>({k:i===0&&X.k?X.k:uid(),mid:m.id,name:m.name,base:m.price,mods:r.mods,note:r.note,qty:r.qty}));
  const at=X.k?d.findIndex(l=>l.k===X.k):-1;
  if(at>=0)d.splice(at,1,...lines);else d.push(...lines);
  saveDrafts();closeModal();render();
}

/* ---------- 会計 ---------- */
let P=null;
function mergeLines(os){
  const map=new Map();
  os.forEach(o=>(o.lines||[]).forEach(l=>{const key=[l.name,l.unit,(l.mods||[]).join(','),l.note||''].join('|');
    const e=map.get(key);if(e)e.qty+=l.qty;else map.set(key,{name:l.name,unit:l.unit,qty:l.qty,mods:l.mods||[],note:l.note||''})}));
  return [...map.values()];
}
function openPay(){
  const os=openOrders(S.seat);if(!os.length)return;
  P={seat:S.seat,ids:os.map(o=>o.id),lines:mergeLines(os),sub:sumOrders(os),disc:0,recv:0,method:METHODS[0].id,field:isCash(METHODS[0].id)?'recv':'',busy:false,tags:{},notes:{}};
  renderPay();
}
function renderPay(){
  const total=Math.max(0,P.sub-P.disc),chg=P.recv-total,ok=!P.busy&&(!isCash(P.method)||P.recv>=total);
  const tf=tagFields(P.tags,P.notes),kb=$('#modal .sheet .body'),ktop=kb?kb.scrollTop:0;
  showModal(`<div class="sheet wide"><header><h2>会計　${esc(P.seat)}</h2>${HP('pay')}<button class="x" data-a="close" aria-label="閉じる">×</button></header><div class="body"><div class="pay">
    <div><div class="plines">${P.lines.map(l=>`<div><span>${esc(l.name)} ×${l.qty}${l.mods.length?`<br><small style="color:var(--muted)">${esc(l.mods.join('・'))}</small>`:''}</span><span class="num">${yen(l.unit*l.qty)}</span></div>`).join('')}</div>
      <div class="fld"><span>小計</span><b class="num">${yen(P.sub)}</b></div>
      <button class="fld ${P.field==='disc'?'on':''}" data-a="field" data-f="disc"><span>値引き（タップして入力）</span><b class="num">−${yen(P.disc)}</b></button>
      <div class="fld big"><span>合計（税込）<br><small style="color:var(--muted)">内消費税${rateFor(P.seat)}% ${yen(taxOf(total,rateFor(P.seat)))}</small></span><b class="num">${yen(total)}</b></div>${tf?`<div class="ptags"><h3>お客様の記録 <small>任意です。押さなくても会計できます</small> ${HP('tags')}</h3><div class="ptg">${tf}</div></div>`:''}</div>
    <div><div class="seg" style="width:100%">${METHODS.map(m=>`<button style="flex:1" class="${P.method===m.id?'on':''}" data-a="method" data-m="${m.id}">${esc(m.name)}</button>`).join('')}</div>
      ${isCash(P.method)?`<button class="fld ${P.field==='recv'?'on':''}" data-a="field" data-f="recv"><span>お預かり</span><b class="num">${yen(P.recv)}</b></button>
      <div class="fld ${chg>=0&&P.recv?'chg':''}"><span>お釣り</span><b class="num">${P.recv?(chg>=0?yen(chg):'不足 '+yen(-chg)):'—'}</b></div>
      <div class="quick">${[['ぴったり','exact'],['1,000','1000'],['5,000','5000'],['10,000','10000']].map(([n,v])=>`<button data-a="quick" data-v="${v}">${n}</button>`).join('')}</div>`
      :`<p class="hint" style="margin:16px 0">${esc(METHOD[P.method])}で ${yen(total)} の支払い完了を確認してから確定してください。</p>`}
      <div class="pad">${['7','8','9','4','5','6','1','2','3','0','00','C'].map(k=>`<button data-a="key" data-k="${k}">${k==='C'?'クリア':k}</button>`).join('')}</div></div>
    </div></div><footer><button class="btn" data-a="close">戻る</button><button class="btn pri" data-a="payok" ${ok?'':'disabled'}>${P.busy?'処理中…':'会計を確定 '+yen(total)}</button></footer></div>`);
  const nb=$('#modal .sheet .body');if(nb&&ktop)nb.scrollTop=ktop;
}
function receiptText(s){
  const L=[SHOP.name,SHOP.addr,SHOP.tel&&'TEL '+SHOP.tel,'--------------------------------',dayOf(s.at)+' '+hm(s.at)+'　No.'+s.no+'　'+s.seat,'--------------------------------'];
  s.lines.forEach(l=>{L.push(l.name+' ×'+l.qty+'　'+yen(l.unit*l.qty));if(l.mods&&l.mods.length)L.push('　'+l.mods.join('・'))});
  L.push('--------------------------------');
  if(s.discount){L.push('小計　'+yen(s.subtotal));L.push('値引き　−'+yen(s.discount))}
  L.push('合計　'+yen(s.total)+'（内消費税'+(s.taxRate==null?TAX:s.taxRate)+'% '+yen(s.tax)+'）');
  L.push('お支払い　'+(METHOD[s.method]||s.method));
  if(isCash(s.method)){L.push('お預かり　'+yen(s.received));L.push('お釣り　'+yen(s.change))}
  if(s.void)L.push('※この会計は取消済みです');
  return L.filter(x=>x!==''&&x!=null).join('\n');
}
async function confirmPay(){
  if(P.busy)return;P.busy=true;renderPay();
  const now=Date.now(),day=dayOf(now),total=Math.max(0,P.sub-P.disc);
  const closed=S.days.find(d=>d.id===day);
  const no=S.sales.filter(s=>s.day===day).length+(closed?closed.count||0:0)+1;
  const id=uid();
  const sale={no,at:now,day,seat:P.seat,lines:P.lines,subtotal:P.sub,discount:P.disc,total,taxRate:rateFor(P.seat),tax:taxOf(total,rateFor(P.seat)),method:P.method,
    received:isCash(P.method)?P.recv:total,change:isCash(P.method)?P.recv-total:0,orderIds:P.ids,by:who(),void:false,tags:P.tags,notes:cleanNotes(P.notes)};
  if(!await w(Store.set('sales',id,sale))){P.busy=false;renderPay();return}
  for(const oid of P.ids)await w(Store.update('orders',oid,{paid:true,saleId:id}));
  P=null;
  showModal(`<div class="sheet"><header><h2>会計が完了しました</h2></header><div class="body">
    <div class="done">${isCash(sale.method)?`<span>お釣り</span><b class="num">${yen(sale.change)}</b>`:`<span>${esc(METHOD[sale.method])}</span><b class="num">${yen(sale.total)}</b>`}</div>
    <pre class="rcpt">${esc(receiptText(sale))}</pre></div><footer>${CAN_PRINT?'<button class="btn" data-a="print">レシートを印刷</button>':''}<button class="btn pri" data-a="close">閉じる</button></footer></div>`);
}

/* ---------- お客様の記録（会計時・任意） ---------- */
let E=null;
const TG=()=>P||E;
const tgRedraw=()=>{if(P)renderPay();else if(E)renderTagEdit()};
const cleanNotes=n=>{const o={};for(const k in n||{}){const v=String(n[k]||'').trim();if(v)o[k]=v.slice(0,60)}return o};
function tagFields(v,nt){
  return S.tags.filter(t=>t.on).map(t=>`<div class="grp"><h4>${esc(t.name)}</h4>${
    t.type==='num'?`<span class="step"><button data-a="tgnum" data-t="${t.id}" data-d="-1" aria-label="減らす">−</button><span class="num">${v[t.id]==null?'—':v[t.id]}</span><button data-a="tgnum" data-t="${t.id}" data-d="1" aria-label="増やす">＋</button></span>`
    :t.type==='text'?`<input class="inp" style="width:100%" data-i="tgtext" data-t="${t.id}" value="${esc(nt[t.id]||'')}" maxlength="60">`
    :`<div class="chips">${t.opts.map((o,i)=>`<button class="chip ${[].concat(v[t.id]==null?[]:v[t.id]).includes(o)?'on':''}" data-a="tgopt" data-t="${t.id}" data-o="${i}">${esc(o)}</button>`).join('')}</div>`}</div>`).join('');
}
function renderTagEdit(){
  const s=S.sales.find(x=>x.id===E.id);if(!s){closeModal();return}
  const keep=$('#modal .sheet .body'),top=keep?keep.scrollTop:0;
  showModal(`<div class="sheet"><header><h2>お客様の記録　No.${s.no}</h2>${HP('tags')}<button class="x" data-a="close" aria-label="閉じる">×</button></header><div class="body">${tagFields(E.tags,E.notes)||'<p class="empty">使う記録項目がありません。設定の「会計のときの記録項目」で選べます。</p>'}</div><footer><button class="btn" data-a="close">やめる</button><button class="btn pri" data-a="tgsave">保存</button></footer></div>`);
  const nb=$('#modal .sheet .body');if(nb&&top)nb.scrollTop=top;
}

/* ---------- オーダー一覧 ---------- */
function renderFeed(main){
  main.dataset.view='feed';
  const os=S.orders.filter(o=>o.status!=='served').sort((a,b)=>(a.status==='new'?0:1)-(b.status==='new'?0:1)||a.at-b.at);
  const now=Date.now();
  main.innerHTML=`<div class="view"><h1 class="h1">未提供のオーダー <span class="badge num">${os.length}</span></h1>
    ${os.length?`<div class="feed">${os.map(o=>{const min=Math.floor((now-o.at)/60000);return `<article class="tk ${o.status}"><header><b>${esc(o.seat)}</b><span class="num ${min>=10?'late':''}">${hm(o.at)}・${min}分前</span><span class="st ${o.status}">${ST[o.status]}</span></header>
      <div class="by">${o.src==='staff'?'スタッフ端末':'レジ'}／${esc(o.by||'')}${o.paid?'／会計済':''}</div>
      <ul>${(o.lines||[]).map(l=>`<li class="${l.done?'done':''}" data-a="ldone" data-id="${o.id}" data-k="${l.k}"><span class="qq num">${l.qty}</span><span>${esc(l.name)}${(l.mods&&l.mods.length)||l.note?`<small>${esc([...(l.mods||[]),l.note].filter(Boolean).join('・'))}</small>`:''}</span></li>`).join('')}</ul>
      <footer>${o.status==='new'?`<button class="btn pri" data-a="st" data-id="${o.id}" data-s="cooking">確認した（調理へ）</button>`:`<button class="btn dark" data-a="st" data-id="${o.id}" data-s="served">提供済みにする</button>`}</footer></article>`}).join('')}</div>`
    :`<p class="empty">未提供のオーダーはありません。<br>スタッフ端末やレジで注文を送信すると、ここに並びます。品名をタップすると出した品に線が引けます。</p>`}</div>`;
}

/* ---------- 売上・集計 ---------- */
function addTg(map,e){const k=e.t+'|'+e.o,x=map[k]||(map[k]={t:e.t,tn:e.tn||e.t,o:e.o,c:0,a:0,n:0});x.c+=e.c||0;x.a+=e.a||0;x.n+=e.n||0;if(e.tn)x.tn=e.tn}
const norm=d=>({total:d.total||0,count:d.count||0,pay:d.pay||{},disc:d.disc||0,items:d.items||[],
  hours:Array.from({length:24},(_,h)=>(d.hours||[])[h]||0),hc:Array.from({length:24},(_,h)=>(d.hc||[])[h]||0),tg:(d.tg||[]).map(e=>({...e,o:e.o||''}))});
function summarize(sales){
  const s={total:0,count:0,pay:{},disc:0,items:[],hours:Array(24).fill(0),hc:Array(24).fill(0),tg:[]};const im={},tm={};
  sales.forEach(x=>{if(x.void)return;const h=new Date(x.at).getHours();
    s.total+=x.total;s.count++;s.pay[x.method]=(s.pay[x.method]||0)+x.total;s.disc+=x.discount||0;s.hours[h]+=x.total;s.hc[h]++;
    const tv=x.tags||{};for(const id in tv){const t=S.tags.find(z=>z.id===id),tn=t?t.name:id,v=tv[id];
      if(typeof v==='number')addTg(tm,{t:id,tn,o:'',c:1,a:x.total,n:v});
      else [].concat(v).forEach(o=>addTg(tm,{t:id,tn,o:String(o),c:1,a:x.total,n:0}))}
    (x.lines||[]).forEach(l=>{const e=im[l.name]||(im[l.name]={n:l.name,q:0,a:0});e.q+=l.qty;e.a+=l.unit*l.qty})});
  s.items=Object.values(im);s.tg=Object.values(tm);return s;
}
function mergeSum(a,b){
  b=norm(b);if(!a)return b;a=norm(a);
  const im={},tm={},pay={...a.pay};for(const k in b.pay)pay[k]=(pay[k]||0)+b.pay[k];
  [...a.items,...b.items].forEach(i=>{const e=im[i.n]||(im[i.n]={n:i.n,q:0,a:0});e.q+=i.q;e.a+=i.a});
  [...a.tg,...b.tg].forEach(e=>addTg(tm,e));
  return {total:a.total+b.total,count:a.count+b.count,pay,disc:a.disc+b.disc,items:Object.values(im),
    hours:a.hours.map((v,h)=>v+b.hours[h]),hc:a.hc.map((v,h)=>v+b.hc[h]),tg:Object.values(tm)};
}
function periodRange(){
  const k=S.per.k,o=S.per.off,n=new Date();n.setHours(0,0,0,0);let a,b,label;
  if(k==='day'){a=new Date(n);a.setDate(a.getDate()-o);b=new Date(a);label=dstr(a)+'（'+DOW[a.getDay()]+'）'}
  else if(k==='week'){a=new Date(n);a.setDate(a.getDate()-((a.getDay()+6)%7)-7*o);b=new Date(a);b.setDate(b.getDate()+6);label=(a.getMonth()+1)+'/'+a.getDate()+'（月）〜'+(b.getMonth()+1)+'/'+b.getDate()+'（日）'}
  else if(k==='month'){a=new Date(n.getFullYear(),n.getMonth()-o,1);b=new Date(a.getFullYear(),a.getMonth()+1,0);label=a.getFullYear()+'年'+(a.getMonth()+1)+'月'}
  else{a=new Date(n.getFullYear()-o,0,1);b=new Date(a.getFullYear(),11,31);label=a.getFullYear()+'年'}
  return {from:dstr(a),to:dstr(b),label};
}
function daySums(from,to){
  const m={};S.days.forEach(d=>{if(d.id>=from&&d.id<=to)m[d.id]=norm(d)});
  const by={};S.sales.forEach(s=>{if(s.day>=from&&s.day<=to)(by[s.day]=by[s.day]||[]).push(s)});
  for(const d in by)m[d]=mergeSum(m[d],summarize(by[d]));
  return m;
}
const wxOf=d=>S.wx.find(x=>x.id===d);
const wxName=x=>x?(x.mw||x.aw||x.ow||''):'';
const wxTemp=x=>x&&x.hi!=null?`${x.hi}℃／${x.lo}℃`:'';
const paxOf=t=>(t.tg||[]).find(e=>e.t==='pax'&&e.o==='');
const bars=(rows,w)=>{const mx=Math.max(1,...rows.map(r=>r[1]));return rows.map(r=>`<div class="hbar" style="grid-template-columns:${w||44}px minmax(0,1fr) 150px"><span class="num">${esc(r[0])}</span><span><i style="width:${Math.round(r[1]/mx*100)}%"></i></span><span class="num">${r[2]!=null?esc(r[2]):yen(r[1])}</span></div>`).join('')};
const dlabel=d=>{const x=dparse(d);return (x.getMonth()+1)+'/'+x.getDate()+'('+DOW[x.getDay()]+')'};
function renderSales(main){
  const se=document.scrollingElement,keep=main.dataset.view==='sales'?[main.scrollTop,se?se.scrollTop:0,(main.firstElementChild||{}).scrollTop||0]:null;
  main.dataset.view='sales';
  const R=periodRange(),k=S.per.k,today=dayOf(Date.now()),isToday=k==='day'&&S.per.off===0;
  const hv=(tt,h)=>yen(tt.hours[h])+(tt.hc.reduce((a,b)=>a+b,0)===tt.count?'・'+tt.hc[h]+'件':'');
  const dm=daySums(R.from,R.to),dkeys=Object.keys(dm).sort();
  let t=null;dkeys.forEach(d=>{t=mergeSum(t,dm[d])});t=t||summarize([]);
  const live=S.sales.filter(s=>s.day===today).sort((a,b)=>b.at-a.at);
  const open=S.orders.filter(o=>!o.paid).length,pax=paxOf(t);
  const card=(title,body,help)=>`<div class="card"><h2 class="h2" style="margin-top:0">${title}${help?' '+HP(help):''}</h2>${body}</div>`;
  /* 推移 */
  let trend;
  if(k==='day'){const r=t.hours.map((v,h)=>[h+'時',v,hv(t,h)]).filter(x=>x[1]>0);trend=card('時間帯別の売上',r.length?bars(r):'<p class="empty">会計するとここに時間帯ごとの売上が出ます</p>')}
  else if(k==='year'){const mm=Array(12).fill(0);dkeys.forEach(d=>{mm[+d.slice(5,7)-1]+=dm[d].total});const r=mm.map((v,i)=>[(i+1)+'月',v]).filter(x=>x[1]>0);trend=card('月ごとの売上',r.length?bars(r):'<p class="empty">この年の売上はまだありません</p>')}
  else{const r=dkeys.map(d=>[dlabel(d),dm[d].total,yen(dm[d].total)+(wxName(wxOf(d))?'・'+wxName(wxOf(d)):'')]);trend=card('日ごとの売上',r.length?bars(r,76):'<p class="empty">この期間の売上はまだありません</p>')}
  const rank=[...t.items].sort((a,b)=>b.q-a.q).slice(0,k==='day'?15:30);
  const rankCard=card('よく出た商品',rank.length?`<div class="tblwrap"><table><tr><th>商品</th><th class="r">数量</th><th class="r">金額</th></tr>${rank.map(i=>`<tr><td style="white-space:normal">${esc(i.n)}</td><td class="r num">${i.q}</td><td class="r num">${yen(i.a)}</td></tr>`).join('')}</table></div>`:'<p class="empty">まだ会計がありません</p>');
  /* 期間の切り口（週・月・年） */
  let cuts='';
  if(k!=='day'&&dkeys.length){
    const hr=t.hours.map((v,h)=>[h+'時',v,hv(t,h)]).filter(x=>x[1]>0);
    const grp=(keyOf,order)=>{const g={};dkeys.forEach(d=>{const key=keyOf(d),e=g[key]||(g[key]={n:0,total:0,count:0});e.n++;e.total+=dm[d].total;e.count+=dm[d].count});
      return Object.keys(g).sort((a,b)=>(order.indexOf(a)+1||99)-(order.indexOf(b)+1||99)).map(key=>[key,g[key].total/g[key].n,yen(g[key].total/g[key].n)+'（'+g[key].n+'日）'])};
    const dw=grp(d=>DOW[dparse(d).getDay()],['月','火','水','木','金','土','日']);
    const wr=grp(d=>wxName(wxOf(d))||'記録なし',[...WX,'記録なし']);
    const TB=['9℃以下','10〜19℃','20〜24℃','25〜29℃','30℃以上','記録なし'];
    const tr=grp(d=>{const x=wxOf(d);if(!x||x.hi==null)return '記録なし';const h=x.hi;return h<10?TB[0]:h<20?TB[1]:h<25?TB[2]:h<30?TB[3]:TB[4]},TB);
    cuts=`<div class="cols" style="margin-top:16px">${card('時間帯別の売上',hr.length?bars(hr):'<p class="empty">—</p>')}${card('曜日別（1日あたりの平均）',bars(dw))}</div>
      <div class="cols" style="margin-top:16px">${card('天気別（1日あたりの平均）',bars(wr,64),'wx')}${card('最高気温別（1日あたりの平均）',bars(tr,76))}</div>`;
  }
  /* お客様の記録 */
  const ids=[...new Set(t.tg.map(e=>e.t))].sort((a,b)=>(S.tags.findIndex(x=>x.id===a)+1||99)-(S.tags.findIndex(x=>x.id===b)+1||99));
  const tagCards=ids.map(id=>{const es=t.tg.filter(e=>e.t===id),def=S.tags.find(x=>x.id===id),name=def?def.name:es[0].tn,num=es.find(e=>e.o==='');
    if(num)return card(esc(name),`<div class="tblwrap"><table><tr><th>合計</th><th class="r">記録した会計</th><th class="r">1会計あたり</th><th class="r">1あたりの売上</th></tr><tr><td class="num">${num.n}</td><td class="r num">${num.c}件</td><td class="r num">${(num.n/Math.max(1,num.c)).toFixed(1)}</td><td class="r num">${yen(num.a/Math.max(1,num.n))}</td></tr></table></div>`);
    const ord=def?def.opts:[],rows=es.sort((a,b)=>(ord.indexOf(a.o)+1||99)-(ord.indexOf(b.o)+1||99)),sum=rows.reduce((a,e)=>a+e.c,0);
    return card(esc(name),`<div class="tblwrap"><table><tr><th>内容</th><th class="r">会計数</th><th class="r">割合</th><th class="r">売上</th><th class="r">会計単価</th></tr>${rows.map(e=>`<tr><td>${esc(e.o)}</td><td class="r num">${e.c}</td><td class="r num">${Math.round(e.c/Math.max(1,sum)*100)}%</td><td class="r num">${yen(e.a)}</td><td class="r num">${yen(e.a/Math.max(1,e.c))}</td></tr>`).join('')}</table></div>`)}).join('');
  const wxT=wxOf(R.from);
  main.innerHTML=`<div class="view"><h1 class="h1">売上 <small class="num" style="color:var(--muted);font-size:14px">${esc(R.label)}</small></h1>
    <div class="pernav"><div class="seg">${[['day','日'],['week','週'],['month','月'],['year','年']].map(([v,n])=>`<button class="${k===v?'on':''}" data-a="per" data-k="${v}">${n}</button>`).join('')}</div>
      <button class="btn" data-a="pmove" data-d="1">‹ 前</button><button class="btn" data-a="pmove" data-d="-1" ${S.per.off?'':'disabled'}>次 ›</button>${S.per.off?'<button class="btn" data-a="pmove" data-d="0">今に戻る</button>':''}${HP('period')}</div>
    ${k==='day'?`<div class="wxline"><span>天気：<b>${esc(wxName(wxT)||'記録なし')}</b>${wxT&&wxT.mw?'（手入力）':wxT&&wxT.aw?'（自動）':''}${wxT&&wxT.hi!=null?`　最高 ${wxT.hi}℃／最低 ${wxT.lo}℃／雨 ${wxT.rain||0}mm`:''}${wxT&&wxT.ow?'　開店時：'+esc(wxT.ow):''}</span>${BOSS?`<button class="mini" data-a="wxpick" data-day="${R.from}">天気を直す</button>`:''}${HP('wx')}</div>`:''}
    <div class="kpis"><div class="kpi main"><span>売上（税込）</span><b class="num">${yen(t.total)}</b></div>
      <div class="kpi"><span>会計数</span><b class="num">${t.count}件</b></div><div class="kpi"><span>会計単価</span><b class="num">${yen(t.count?t.total/t.count:0)}</b></div>
      ${pax?`<div class="kpi"><span>客数（記録分）</span><b class="num">${pax.n}人</b></div><div class="kpi"><span>客単価</span><b class="num">${yen(pax.a/Math.max(1,pax.n))}</b></div>`:''}
      ${k!=='day'?`<div class="kpi"><span>営業日数</span><b class="num">${dkeys.length}日</b></div><div class="kpi"><span>1日あたり</span><b class="num">${yen(dkeys.length?t.total/dkeys.length:0)}</b></div>`:''}
      ${METHODS.map(m=>`<div class="kpi"><span>${esc(m.name)}</span><b class="num">${yen((t.pay||{})[m.id])}</b></div>`).join('')}
      ${isToday?`<div class="kpi"><span>未会計の注文</span><b class="num">${open}件</b></div>`:''}</div>
    <div class="cols" style="margin-top:16px">${trend}${rankCard}</div>
    ${cuts}
    ${tagCards?`<h2 class="h2">お客様の記録 ${HP('tags')}</h2><div class="cols">${tagCards}</div>`:''}
    ${isToday?`<h2 class="h2">本日の会計履歴（日締め前）</h2>
    <div class="card">${live.length?`<div class="tblwrap"><table><tr><th>No.</th><th>時刻</th><th>席</th><th>支払</th><th class="r">金額</th><th></th></tr>${live.map(s=>`<tr class="${s.void?'void':''}"><td class="num">${s.no}</td><td class="num">${hm(s.at)}</td><td>${esc(s.seat)}</td><td>${esc(METHOD[s.method]||s.method)}</td><td class="r num">${yen(s.total)}</td>
      <td class="r" style="text-decoration:none;opacity:1"><button class="mini" data-a="rcpt" data-id="${s.id}">明細</button> ${s.void?'':`<button class="mini" data-a="tagedit" data-id="${s.id}">記録${Object.keys(s.tags||{}).length||Object.keys(s.notes||{}).length?'✓':''}</button> <button class="mini danger" data-a="voidsale" data-id="${s.id}">取消</button>`}</td></tr>`).join('')}</table></div>`:'<p class="empty">日締め前の会計はありません</p>'}</div>
    <h2 class="h2">日締め ${HP('closeday')}</h2>
    <div class="card"><p style="margin:0 0 10px;color:var(--muted);font-size:13px">営業終了後に押してください。会計履歴を日別の集計にまとめ、済んだ伝票を片付けます（未会計の伝票は残ります）。</p>
      <button class="btn dark" data-a="closeday" ${S.sales.length?'':'disabled'}>日締めをする</button></div>`:''}
    ${k!=='day'?`<h2 class="h2">日ごとの一覧</h2>
    <div class="card">${dkeys.length?`<div class="tblwrap"><table><tr><th>日付</th><th>天気</th><th>気温</th><th class="r">売上</th><th class="r">会計数</th><th class="r">客数</th>${METHODS.map(m=>`<th class="r">${esc(m.name)}</th>`).join('')}<th class="r">値引き</th></tr>${[...dkeys].reverse().map(d=>{const x=dm[d],wx=wxOf(d),px=paxOf(x);return `<tr><td class="num">${dlabel(d)}</td><td>${BOSS?`<button class="mini" data-a="wxpick" data-day="${d}">${esc(wxName(wx)||'入れる')}</button>`:esc(wxName(wx)||'—')}</td><td class="num">${esc(wxTemp(wx)||'—')}</td><td class="r num">${yen(x.total)}</td><td class="r num">${x.count}</td><td class="r num">${px?px.n:'—'}</td>${METHODS.map(m=>`<td class="r num">${yen((x.pay||{})[m.id])}</td>`).join('')}<td class="r num">${yen(x.disc)}</td></tr>`}).join('')}</table></div>`:'<p class="empty">この期間の売上はまだありません</p>'}</div>`:'<p class="hint" style="margin-top:16px">上の「週」「月」「年」を押すと、期間ごとの集計と日ごとの一覧が出ます。</p>'}
    ${BOSS?`<h2 class="h2">データを取り出す ${HP('csv')}</h2><div class="card"><p style="margin:0 0 10px;color:var(--muted);font-size:13px">いま表示している期間（${esc(R.label)}）を、表計算ソフトで開ける形で保存します。</p>
      <div class="row"><button class="btn" data-a="csvdays">日ごとの集計を保存</button><button class="btn" data-a="csvsales">会計1件ずつの明細を保存</button></div></div>`:''}</div>`;
  if(keep){main.scrollTop=keep[0];if(se)se.scrollTop=keep[1];if(main.firstElementChild)main.firstElementChild.scrollTop=keep[2]}
}
async function closeDay(){
  const byDay={};S.sales.forEach(s=>(byDay[s.day]=byDay[s.day]||[]).push(s));
  const sales=[...S.sales],paid=S.orders.filter(o=>o.paid);let n=0;const all=sales.length+paid.length;
  const prog=()=>showModal(`<div class="sheet"><header><h2>日締め処理中…</h2></header><div class="body"><p class="num">${n} / ${all} 件を整理しました。画面を閉じずにお待ちください。</p></div></div>`);
  prog();
  for(const day of Object.keys(byDay)){
    const ex=S.days.find(d=>d.id===day),sum=mergeSum(ex?{...ex}:null,summarize(byDay[day]));
    if(!await w(Store.set('days',day,sum))){closeModal();return}
  }
  /* 会計1件ずつの中身は「記録の倉庫」に移してから、レジの一覧から片付ける */
  for(const s of sales){const {id,orderIds,...rest}=s;
    if(!await w(Store.set('log',s.day+'/'+s.id,rest))){closeModal();return}
    await w(Store.del('sales',s.id));n++;if(n%5===0)prog()}
  for(const o of paid){await w(Store.del('orders',o.id));n++;if(n%5===0)prog()}
  closeModal();toast('日締めが完了しました');
}
/* ---------- 天気（気象庁の観測データを自動で記録。手で直すこともできる） ---------- */
async function fetchWx(day){
  const J='https://www.jma.go.jp/bosai/',ymd=day.replace(/-/g,''),isT=day===dayOf(Date.now()),maxH=isT?new Date().getHours():23,ps=[];
  for(let h=0;h<=maxH;h+=3)ps.push(fetch(J+'amedas/data/point/'+WXC.amedas+'/'+ymd+'_'+p2(h)+'.json',{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({})));
  const rec=Object.assign({},...(await Promise.all(ps)));
  let hi=null,lo=null,rain=0,sun=0,sunN=0,n=0;
  for(const key in rec){if(key.slice(0,8)!==ymd)continue;const r=rec[key],v=x=>Array.isArray(r[x])&&typeof r[x][0]==='number'?r[x][0]:null;n++;
    const tp=v('temp');if(tp!=null){hi=hi==null?tp:Math.max(hi,tp);lo=lo==null?tp:Math.min(lo,tp)}
    const p=v('precipitation10m');if(p!=null)rain+=p;
    const hh=+key.slice(8,10),s=v('sun10m');if(s!=null&&hh>=7&&hh<17){sun+=s;sunN++}}
  if(!n)return null;
  rain=Math.round(rain*10)/10;let aw='';
  if(rain>=1)aw=lo!=null&&lo<=1?'雪':'雨';
  else if(sunN>=6)aw=sun/(sunN*10)>=.4?'晴れ':'くもり';
  else if(isT){try{const j=await (await fetch(J+'forecast/data/forecast/'+WXC.office+'.json',{cache:'no-store'})).json(),ts=j[0].timeSeries[0],ar=ts.areas.find(a=>a.area.code===WXC.area)||ts.areas[0];
    if(String(ts.timeDefines[0]).slice(0,10)===day)aw={1:'晴れ',2:'くもり',3:'雨',4:'雪'}[String(ar.weatherCodes[0])[0]]||''}catch(e){}}
  const out={rain};if(aw)out.aw=aw;if(hi!=null){out.hi=hi;out.lo=lo}return out;
}
/* 開店時に1回だけ「今日の天気は？」と聞く（自動の記録とは別に残す。答えなくても使える） */
function renderWxAsk(){
  const el=$('#wxask');if(!el)return;const today=dayOf(Date.now()),cur=wxOf(today);
  const show=S.wxReady&&(S.role==='register'||BOSS)&&!(cur&&cur.ow)&&ls.get('wxSkip','')!==today;
  el.hidden=!show;if(!show){el.innerHTML='';return}
  const html=`<b>今日の天気は？</b><span class="wxa-sub">開店時に1回だけ${cur&&cur.aw?'（自動の記録：'+esc(cur.aw)+'）':''}</span>${WX.map(n=>`<button class="chip" data-a="wxopen" data-w="${n}">${n}</button>`).join('')}<button class="mini" data-a="wxskip">あとで</button>${HP('wx')}`;
  if(el.dataset.h!==html){el.innerHTML=html;el.dataset.h=html}
}
let wxBusy=false;
async function autoWx(){
  if(wxBusy||Store.mode!=='fb'||!Store.online||!WXC||!WXC.amedas||!(S.role==='register'||BOSS))return;wxBusy=true;
  const put=(day,r,cur)=>{const v={...r,at:Date.now()};return cur?Store.update('wx',day,v):Store.set('wx',day,v)};
  try{const today=dayOf(Date.now()),cur=wxOf(today);
    if(!cur||!cur.at||Date.now()-cur.at>50*60000){const r=await fetchWx(today);if(r)await put(today,r,cur)}
    /* 過ぎた営業日は、1日分そろった数字で1回だけ確定させる（気象庁が持っているのは直近10日ほど） */
    const lim=new Date();lim.setDate(lim.getDate()-9);const from=dstr(lim);
    for(const d of S.days){if(d.id<from||d.id>=today)continue;const c=wxOf(d.id);if(c&&c.fin)continue;const r=await fetchWx(d.id);if(r)await put(d.id,{...r,fin:true},c)}
  }catch(e){}
  wxBusy=false;
}
/* ---------- データの取り出し（CSV） ---------- */
function dl(name,rows){
  const cell=c=>{c=c==null?'':String(c);if(/^[=+\-@]/.test(c)&&isNaN(+c))c="'"+c;return /[",\r\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv'}));
  a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
}
async function loadLog(days){
  if(Store.mode==='fb'){const out=[];
    await Promise.all(days.map(async d=>{const s=await Store.root.child('log/'+d).once('value'),v=s.val()||{};for(const id in v)out.push({...v[id],day:d,id})}));return out}
  const m=Store._load('log');return Object.keys(m).filter(key=>days.includes(key.split('/')[0])).map(key=>({...m[key],day:key.split('/')[0],id:key.split('/')[1]}));
}
function csvDays(){
  const R=periodRange(),dm=daySums(R.from,R.to),dkeys=Object.keys(dm).sort();if(!dkeys.length){toast('この期間の売上はまだありません');return}
  const cols=[];dkeys.forEach(d=>dm[d].tg.forEach(e=>{const key=e.t+'|'+e.o;if(!cols.find(c=>c.key===key))cols.push({key,name:e.tn+(e.o?'：'+e.o:'')})}));
  const rows=[['日付','曜日','天気','開店時の天気','最高気温','最低気温','雨量mm','売上','会計数','会計単価',...METHODS.map(m=>m.name),'値引き',...cols.map(c=>c.name),...Array.from({length:24},(_,h)=>h+'時')]];
  dkeys.forEach(d=>{const x=dm[d],wx=wxOf(d)||{};rows.push([d,DOW[dparse(d).getDay()],wxName(wx),wx.ow||'',wx.hi==null?'':wx.hi,wx.lo==null?'':wx.lo,wx.rain==null?'':wx.rain,x.total,x.count,x.count?Math.round(x.total/x.count):0,
    ...METHODS.map(m=>(x.pay||{})[m.id]||0),x.disc,...cols.map(c=>{const e=x.tg.find(z=>z.t+'|'+z.o===c.key);return e?(e.o===''?e.n:e.c):0}),...x.hours])});
  dl(SHOP_ID+'_days_'+R.from+'_'+R.to+'.csv',rows);
}
async function csvSales(){
  const R=periodRange(),days=S.days.filter(d=>d.id>=R.from&&d.id<=R.to).map(d=>d.id);
  toast('明細を集めています…');let list;
  try{list=await loadLog(days)}catch(e){toast('明細を読み込めませんでした。通信を確認してください','err');return}
  S.sales.forEach(s=>{if(s.day>=R.from&&s.day<=R.to)list.push(s)});
  if(!list.length){toast('この期間の明細はありません（明細が残るのは、この機能が入った後の日締めからです）');return}
  list.sort((a,b)=>a.at-b.at);
  const tids=[],nids=[];list.forEach(s=>{for(const id in s.tags||{})if(!tids.includes(id))tids.push(id);for(const id in s.notes||{})if(!nids.includes(id))nids.push(id)});
  const nm=id=>(S.tags.find(t=>t.id===id)||{}).name||id;
  const rows=[['日付','時刻','曜日','天気','No.','席','合計','値引き','支払','担当','取消',...tids.map(nm),...nids.map(nm),'品数','商品']];
  list.forEach(s=>rows.push([s.day,hm(s.at),DOW[dparse(s.day).getDay()],wxName(wxOf(s.day)),s.no,s.seat,s.total,s.discount||0,METHOD[s.method]||s.method,s.by||'',s.void?'取消':'',
    ...tids.map(id=>{const v=(s.tags||{})[id];return v==null?'':[].concat(v).join('・')}),...nids.map(id=>(s.notes||{})[id]||''),
    (s.lines||[]).reduce((a,l)=>a+l.qty,0),(s.lines||[]).map(l=>l.name+((l.mods||[]).length?'('+l.mods.join('・')+')':'')+'×'+l.qty).join(' / ')]));
  dl(SHOP_ID+'_sales_'+R.from+'_'+R.to+'.csv',rows);
}

/* ---------- 設定 ---------- */
function renderSettings(main,force){
  if(main.dataset.view==='settings'&&!force)return;
  main.dataset.view='settings';
  const secList=[];S.menu.forEach(m=>{if(!secList.find(x=>x.tab===m.tab&&x.sec===m.sec))secList.push({tab:m.tab,sec:m.sec})});
  const reg=S.role==='register';
  main.innerHTML=`<div class="view"><div class="set">
    <div class="card"><h3>この端末の役割 ${HP('role')}</h3><p>レジに置くタブレットは「メインレジ」、注文を取りに行くスマホは「スタッフ端末」にします。</p>
      <div class="seg"><button class="${reg?'on':''}" data-a="role" data-r="register">メインレジ</button><button class="${reg?'':'on'}" data-a="role" data-r="staff">スタッフ端末</button></div></div>
    <div class="card"><h3>担当者名 ${HP('staffname')}</h3><p>注文に「誰が取ったか」が残ります。</p><div class="row"><input class="inp" id="staffName" value="${esc(S.staff)}" placeholder="例：たなか" maxlength="12"><button class="btn" data-a="savestaff">保存</button></div></div>
    <div class="card"><h3>新しい注文の通知音 ${HP('sound')}</h3><p>メインレジで、スタッフ端末から注文が届いた時に鳴ります。</p>
      <div class="row"><div class="seg"><button class="${S.sound?'on':''}" data-a="sound" data-v="1">鳴らす</button><button class="${S.sound?'':'on'}" data-a="sound" data-v="0">鳴らさない</button></div><button class="btn" data-a="testbeep">音を試す</button></div></div>
    <div class="card"><h3>連動の状態 ${HP('sync')}</h3><p>${Store.mode==='fb'?(Store.online?'連動中です。同じお店にログインしている全端末で、注文・会計・売切がすぐに共有されます。':'いまは電波待ちです。入力した内容はこの画面を開いたままにしておけば、電波が戻った時に自動で送られます。'):Store.mode==='db'?'連動中です。同じページを開いている全端末で、注文・会計・売切がすぐに共有されます。':Store.failed?'連動の準備に失敗しました。電波を確認して画面を開き直してください。いまの入力はこの端末の中だけに保存されます。':Store.mode==='local'?'店舗キーなしで開いているため、この端末の中だけに保存するお試しモードです（他の端末とは連動しません）。':'接続を確認しています…'}</p>
      ${Store.mode==='fb'?`<h3 style="margin-top:14px">端末を追加する</h3><p>追加したいスマホやタブレットのカメラでこのQRを読み、スタッフ用のIDとパスワードでログインします。</p>
      <div class="row" style="align-items:flex-start"><div class="qr">${qrSvg(joinUrl())}</div><div style="flex:1;min-width:200px"><input class="inp" id="joinUrl" readonly value="${esc(joinUrl())}" style="width:100%"><div class="row" style="margin-top:8px"><button class="btn" data-a="copyjoin">URLをコピー</button></div></div></div>`:''}</div>
    <div class="card"><h3>ログイン ${HP('mylogin')}</h3><p>いまのログイン：<b>${esc(ME.login)}</b>（${esc(PA.ROLE[ME.role]||'')}）</p><div class="row"><button class="btn" data-a="logout">ログアウト</button></div></div>
    ${BOSS?`<div class="card"><h3>スタッフ用ログイン ${HP('stafflogin')}</h3><p>お店の端末で使うIDとパスワードです。作り直すと、古いIDとパスワードは使えなくなります（アルバイトが辞めた時などに）。</p>
      <p id="staffNow" style="color:var(--ink)">確認中…</p>
      <div class="lgrid"><label>ログインID<input class="inp" id="slId" autocapitalize="none" spellcheck="false" autocomplete="off" placeholder="例：${esc(SHOP_ID)}-staff"></label>
      <label>新しいパスワード（6文字以上）<input class="inp" id="slPw" type="password" autocomplete="new-password"></label>
      <label>いまのパスワード（同じIDのまま変える時だけ）<input class="inp" id="slCur" type="password" autocomplete="off"></label></div>
      <p class="lerr" id="slMsg"></p><div class="row"><button class="btn dark" data-a="savestafflogin">スタッフ用ログインを作り直す</button></div></div>`:''}
    ${ME.role==='manager'?`<div class="card"><h3>店長のパスワードを変える ${HP('managerpass')}</h3><p>店長のIDそのものを変えたい時は、管理者（マスター）に依頼してください。</p>
      <div class="lgrid"><label>いまのパスワード<input class="inp" id="mpCur" type="password" autocomplete="current-password"></label>
      <label>新しいパスワード（6文字以上）<input class="inp" id="mpNew" type="password" autocomplete="new-password"></label></div>
      <p class="lerr" id="mpMsg"></p><div class="row"><button class="btn dark" data-a="changemypass">パスワードを変える</button></div></div>`:''}
    ${BOSS?`<div class="card"><h3>会計のときの記録項目 ${HP('tagset')}</h3><p>会計の画面に出す「お客様の記録」です。使うものにチェックを入れます。押さなくても会計はできます。選択肢は「、」で区切って書きます。名前を空にすると、その項目は消えます。</p>
      ${S.tags.map(t=>`<div class="trow"><label class="tck"><input type="checkbox" id="tgon_${t.id}" ${t.on?'checked':''}>使う</label><input class="inp" id="tgn_${t.id}" value="${esc(t.name)}" maxlength="12" aria-label="項目の名前"><span class="tty">${TAGTYPE[t.type]||''}</span>${t.type==='one'||t.type==='multi'?`<input class="inp" id="tgo_${t.id}" value="${esc(t.opts.join('、'))}" aria-label="選択肢">`:'<span></span>'}</div>`).join('')}
      <h2 class="h2" style="margin:18px 0 6px">新しい項目を追加</h2>
      <div class="row"><input class="inp" id="tgNewName" placeholder="項目の名前（例：席の希望）" maxlength="12"><select class="inp" id="tgNewType">${Object.entries(TAGTYPE).map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select><input class="inp" id="tgNewOpts" placeholder="選択肢（例：カウンター、テーブル）" style="flex:1;min-width:180px"></div>
      <div class="row" style="margin-top:12px"><button class="btn dark" data-a="savetags">記録項目を保存</button><button class="btn" data-a="resettags">初期の項目に戻す</button></div></div>`:''}
    ${reg&&BOSS?`<div class="card"><h3>席の設定 ${HP('seats')}</h3><p>1行に1つ、席やテーブルの名前を書きます。</p>
      <textarea class="inp" id="seatText" rows="6">${esc(S.seats.join('\n'))}</textarea><div class="row" style="margin-top:8px"><button class="btn dark" data-a="saveseats">席を保存</button></div></div>
    <div class="card"><h3>メニューの編集 ${HP('menuedit')}</h3><p>名前と価格（税込）を直して「メニューを保存」を押すと全端末に反映されます。名前を空にするとその品は消えます。</p>
      ${secList.map(sc=>`<h2 class="h2" style="margin:14px 0 6px">${esc(TABS.find(t=>t[0]===sc.tab)[1])}／${esc(sc.sec)}</h2>${S.menu.filter(m=>m.tab===sc.tab&&m.sec===sc.sec).map(m=>`<div class="mrow"><input class="inp" id="mn_${m.id}" value="${esc(m.name)}" aria-label="品名"><input class="inp num" id="mp_${m.id}" type="number" inputmode="numeric" value="${m.price}" aria-label="価格"><span></span></div>`).join('')}`).join('')}
      <h2 class="h2" style="margin:18px 0 6px">新しい品を追加</h2>
      <div class="row"><select class="inp" id="newSec">${secList.map((sc,i)=>`<option value="${i}">${esc(TABS.find(t=>t[0]===sc.tab)[1])}／${esc(sc.sec)}</option>`).join('')}</select>
        <input class="inp" id="newName" placeholder="品名（期間限定など）" style="flex:1"><input class="inp num" id="newPrice" type="number" inputmode="numeric" placeholder="価格" style="width:100px"></div>
      <div class="row" style="margin-top:12px"><button class="btn dark" data-a="savemenu">メニューを保存</button><button class="btn" data-a="resetmenu">初期メニューに戻す</button></div></div>`:''}
  </div></div>`;
}

function joinUrl(){return location.origin+location.pathname+'?r=staff'}
async function showStaffNow(){const el=$('#staffNow');if(!el)return;try{const l=(await PA.listLogins(DB,SHOP_ID)).filter(x=>x.role==='staff');el.textContent=l.length?'いまのスタッフ用ID：'+l.map(x=>x.login).join('、'):'スタッフ用ログインはまだありません。下で作ってください。'}catch(e){el.textContent='いまのIDを確認できませんでした'}}
function qrSvg(t){try{const q=qrcode(0,'M');q.addData(t);q.make();return q.createSvgTag({cellSize:4,margin:2})}catch(e){return ''}}
/* ---------- 描画・モーダル ---------- */
function render(force){
  renderBar();renderWxAsk();
  const main=$('#main');
  if(S.role!=='register'&&!BOSS&&S.tab==='sales')S.tab='order';
  if(S.tab==='order')renderOrder(main);
  else if(S.tab==='feed')renderFeed(main);
  else if(S.tab==='sales')renderSales(main);
  else renderSettings(main,force);
}
function showModal(html){const m=$('#modal');m.innerHTML=html;m.hidden=false}
function closeModal(){const m=$('#modal');m.hidden=true;m.innerHTML='';X=null;P=null;E=null}
function confirmBox(title,msg,okLabel,fn){
  showModal(`<div class="sheet"><header><h2>${esc(title)}</h2></header><div class="body"><p>${esc(msg)}</p></div><footer><button class="btn" data-a="close">やめる</button><button class="btn pri" data-a="cok">${esc(okLabel)}</button></footer></div>`);
  confirmFn=fn;
}
let confirmFn=null;

/* ---------- 操作 ---------- */
const A={
  tab(d){S.tab=d.t;render(true);if(d.t==='settings')showStaffNow()},
  seat(d){S.seat=d.s;render()},
  cat(d){S.cat=d.c;render();$('#grid').scrollTop=0},
  soldmode(){S.soldMode=!S.soldMode;render()},
  showcheck(){$('#orderRoot').classList.add('showcheck')},
  hidecheck(){$('#orderRoot').classList.remove('showcheck')},
  item(d){
    const m=item(d.id);if(!m)return;
    if(S.soldMode){const ids=S.sold.includes(m.id)?S.sold.filter(x=>x!==m.id):[...S.sold,m.id];S.sold=ids;render();w(Store.set('config','sold',{ids}));return}
    if(S.sold.includes(m.id)){toast('「'+m.name+'」は売切です');return}
    if(m.mods.some(g=>GROUPS[g].type==='req')){openItem(m.id);return}
    const dr=draft(),l=dr.find(l=>l.mid===m.id&&!l.mods.length&&!l.note);
    if(l)l.qty++;else dr.push({k:uid(),mid:m.id,name:m.name,base:m.price,mods:[],note:'',qty:1});
    saveDrafts();render();
  },
  qty(d){const dr=draft(),l=dr.find(l=>l.k===d.k);if(!l)return;l.qty+=+d.d;if(l.qty<=0)dr.splice(dr.indexOf(l),1);saveDrafts();render()},
  editline(d){const l=draft().find(l=>l.k===d.k);if(l)openItem(l.mid,l.k)},
  mod(d){const G=GROUPS[d.g],cur=X.sel[d.g];
    if(G.type==='multi')X.sel[d.g]=cur.includes(d.n)?cur.filter(x=>x!==d.n):[...cur,d.n];
    else X.sel[d.g]=cur.includes(d.n)&&G.type==='one'?[]:[d.n];
    renderItemSheet()},
  xqty(d){X.qty=Math.max(1,X.qty+ +d.d);
    if(X.qty<2){X.same=true;X.units=[X.units[X.cur]||X.units[0]];X.cur=0}
    else if(!X.same){const m=item(X.mid);while(X.units.length<X.qty){const u={sel:{},note:''};m.mods.forEach(g=>u.sel[g]=[]);X.units.push(u)}
      X.units.length=X.qty;X.cur=Math.min(X.cur,X.qty-1)}
    renderItemSheet()},
  xsame(d){const same=d.v==='1';if(same===X.same){return}
    if(same){X.units=[X.units[X.cur]];X.cur=0}else{const u=X.units[0];X.units=Array.from({length:X.qty},()=>cloneU(u));X.cur=0}
    X.same=same;renderItemSheet()},
  xunit(d){X.cur=Math.max(0,Math.min(X.units.length-1,+d.i));renderItemSheet()},
  xok(){commitItem()},
  xdel(){const dr=draft(),i=dr.findIndex(l=>l.k===X.k);if(i>=0)dr.splice(i,1);saveDrafts();closeModal();render()},
  close(){closeModal()},
  cok(){const f=confirmFn;confirmFn=null;closeModal();f&&f()},
  async send(){
    const d=draft();if(!d.length)return;
    const seat=S.seat,now=Date.now();
    const o={seat,lines:d.map(l=>({k:l.k,mid:l.mid,name:l.name,unit:unitOf(l),qty:l.qty,mods:l.mods.map(m=>m.n),note:l.note,done:false})),
      status:S.role==='register'?'cooking':'new',src:S.role,by:who(),dev:DEV,at:now,day:dayOf(now),paid:false};
    S.drafts[seat]=[];saveDrafts();render();
    if(await w(Store.set('orders',uid(),o),seat+'の注文を送信しました'))A.hidecheck&&$('#orderRoot')&&$('#orderRoot').classList.remove('showcheck');
    else{S.drafts[seat]=d;saveDrafts();render()}
  },
  cancelline(d){
    const o=S.orders.find(o=>o.id===d.id);if(!o)return;const l=o.lines.find(l=>l.k===d.k);if(!l)return;
    confirmBox('注文の取消','「'+l.name+'」を1点取り消します。よろしいですか？','取り消す',()=>{
      const lines=o.lines.map(x=>({...x})).map(x=>x.k===d.k?{...x,qty:x.qty-1}:x).filter(x=>x.qty>0);
      w(lines.length?Store.update('orders',o.id,{lines}):Store.del('orders',o.id),'取り消しました')});
  },
  pay(){openPay()},
  field(d){P.field=d.f;renderPay()},
  method(d){P.method=d.m;P.field=isCash(d.m)?'recv':'';renderPay()},
  key(d){const f=P.field;if(!f)return;let v=P[f];if(d.k==='C')v=0;else v=Math.min(9999999,Number(String(v||'')+d.k));
    if(f==='disc')v=Math.min(v,P.sub);P[f]=v;renderPay()},
  quick(d){const total=Math.max(0,P.sub-P.disc);P.field='recv';P.recv=d.v==='exact'?total:+d.v;renderPay()},
  payok(){confirmPay()},
  st(d){w(Store.update('orders',d.id,{status:d.s}))},
  ldone(d){const o=S.orders.find(o=>o.id===d.id);if(!o)return;w(Store.update('orders',o.id,{lines:o.lines.map(l=>l.k===d.k?{...l,done:!l.done}:{...l})}))},
  rcpt(d){const s=S.sales.find(s=>s.id===d.id);if(!s)return;
    showModal(`<div class="sheet"><header><h2>会計明細 No.${s.no}</h2><button class="x" data-a="close" aria-label="閉じる">×</button></header><div class="body"><pre class="rcpt">${esc(receiptText(s))}</pre></div><footer>${CAN_PRINT?'<button class="btn" data-a="print">印刷</button>':''}<button class="btn pri" data-a="close">閉じる</button></footer></div>`)},
  voidsale(d){const s=S.sales.find(s=>s.id===d.id);if(!s)return;
    confirmBox('会計の取消','No.'+s.no+'（'+s.seat+'・'+yen(s.total)+'）の会計を取り消し、伝票を未会計に戻します。','会計を取り消す',async()=>{
      if(!await w(Store.update('sales',s.id,{void:true})))return;
      for(const oid of s.orderIds||[])if(S.orders.find(o=>o.id===oid))await w(Store.update('orders',oid,{paid:false,saleId:null}));
      toast('会計を取り消しました')})},
  closeday(){const open=S.orders.filter(o=>!o.paid).length;
    confirmBox('日締め','会計履歴を日別の集計にまとめます。'+(open?'未会計の注文が'+open+'件残っています（そのまま残ります）。':'')+'実行しますか？','日締めをする',closeDay)},
  per(d){S.per={k:d.k,off:0};render()},
  pmove(d){S.per.off=d.d==='0'?0:Math.max(0,S.per.off+ +d.d);render()},
  tgnum(d){const o=TG();if(!o)return;const c=o.tags[d.t],n=(c==null?0:c)+ +d.d;if(n<=0)delete o.tags[d.t];else o.tags[d.t]=Math.min(99,n);tgRedraw()},
  tgopt(d){const o=TG(),t=S.tags.find(x=>x.id===d.t);if(!o||!t)return;const v=t.opts[+d.o],c=o.tags[d.t];
    if(t.type==='multi'){const a=[].concat(c==null?[]:c),n=a.includes(v)?a.filter(x=>x!==v):[...a,v];if(n.length)o.tags[d.t]=n;else delete o.tags[d.t]}
    else if(c===v)delete o.tags[d.t];else o.tags[d.t]=v;
    tgRedraw()},
  tagedit(d){const s=S.sales.find(x=>x.id===d.id);if(!s)return;E={id:s.id,tags:JSON.parse(JSON.stringify(s.tags||{})),notes:{...(s.notes||{})}};renderTagEdit()},
  tgsave(){const e=E;if(!e)return;closeModal();w(Store.update('sales',e.id,{tags:e.tags,notes:cleanNotes(e.notes)}),'記録を保存しました')},
  wxpick(d){const x=wxOf(d.day);
    showModal(`<div class="sheet"><header><h2>天気を直す　${esc(d.day)}</h2>${HP('wx')}<button class="x" data-a="close" aria-label="閉じる">×</button></header><div class="body">
      <p class="hint" style="margin:0 0 12px">${x&&x.ow?'開店時の記録：'+esc(x.ow)+'　／　':''}自動の記録：${esc((x&&x.aw)||'なし')}${x&&x.hi!=null?`（最高 ${x.hi}℃／最低 ${x.lo}℃／雨 ${x.rain||0}mm）`:''}</p>
      <div class="chips">${WX.map(n=>`<button class="chip ${x&&x.mw===n?'on':''}" data-a="wxset" data-day="${d.day}" data-w="${n}">${n}</button>`).join('')}</div></div>
      <footer>${x&&x.mw?`<button class="btn" data-a="wxset" data-day="${d.day}" data-w="">自動の記録に戻す</button>`:''}<button class="btn pri" data-a="close">閉じる</button></footer></div>`)},
  wxopen(d){const day=dayOf(Date.now()),cur=wxOf(day),v={ow:d.w,oat:Date.now()};w(cur?Store.update('wx',day,v):Store.set('wx',day,v),'開店時の天気を「'+d.w+'」で記録しました')},
  wxskip(){ls.set('wxSkip',dayOf(Date.now()));renderWxAsk()},
  wxset(d){const cur=wxOf(d.day),mw=d.w||null;closeModal();w(cur?Store.update('wx',d.day,{mw}):Store.set('wx',d.day,{mw}),mw?'天気を「'+mw+'」にしました':'自動の記録に戻しました')},
  csvdays(){csvDays()},
  csvsales(d,btn){btn.disabled=true;csvSales().finally(()=>{btn.disabled=false})},
  savetags(){
    const split=s=>[...new Set(String(s).split(/[、,，\n]/).map(x=>x.trim().slice(0,16)).filter(Boolean))],list=[];let bad='';
    S.tags.forEach(t=>{const n=$('#tgn_'+t.id);if(!n)return list.push(t);const name=n.value.trim().slice(0,12);if(!name)return;
      const o=$('#tgo_'+t.id),opts=o?split(o.value):[];if(o&&!opts.length){bad=name;return}
      list.push({id:t.id,name,type:t.type,opts,on:$('#tgon_'+t.id).checked})});
    const nn=$('#tgNewName').value.trim().slice(0,12);
    if(nn){const type=$('#tgNewType').value,opts=type==='one'||type==='multi'?split($('#tgNewOpts').value):[];
      if((type==='one'||type==='multi')&&!opts.length)bad=nn;else list.push({id:'c'+uid(),name:nn,type,opts,on:true})}
    if(bad){toast('「'+bad+'」の選択肢を1つ以上入れてください','err');return}
    if(!list.length){toast('項目を全部消すことはできません。使わない時は「使う」のチェックを外してください','err');return}
    w(Store.set('config','tags',{list}),'記録項目を保存しました').then(()=>render(true))},
  resettags(){confirmBox('初期の項目に戻す','記録項目を最初の状態に戻します。これまでに記録した内容は消えません。','戻す',()=>w(Store.del('config','tags'),'初期の項目に戻しました').then(()=>render(true)))},
  logout(){confirmBox('ログアウト','この端末からログアウトします。未送信の注文は残ります。','ログアウト',()=>ME.auth.signOut())},
  async savestafflogin(d,btn){const m=$('#slMsg');m.textContent='作成中…';btn.disabled=true;
    try{const r=await PA.replaceLogin(DB,SHOP_ID,'staff',$('#slId').value,$('#slPw').value,$('#slCur').value);
      m.textContent='スタッフ用ログイン「'+r.login+'」を作りました。'+(r.removed?'古いログインは使えなくなりました。':'')+'各端末でこのIDとパスワードを使ってログインしてください。';
      $('#slPw').value='';$('#slCur').value='';showStaffNow()}
    catch(e){m.textContent=PA.msg(e)}btn.disabled=false},
  async changemypass(d,btn){const m=$('#mpMsg');m.textContent='変更中…';btn.disabled=true;
    try{await PA.changeMyPassword(ME.auth,$('#mpCur').value,$('#mpNew').value);m.textContent='パスワードを変えました。';$('#mpCur').value='';$('#mpNew').value=''}
    catch(e){m.textContent=PA.msg(e)}btn.disabled=false},
  copyjoin(){const i=$('#joinUrl');i.select();try{navigator.clipboard.writeText(i.value).then(()=>toast('URLをコピーしました'),()=>toast('URLを選択しました。長押しでコピーしてください'))}catch(e){toast('URLを選択しました。長押しでコピーしてください')}},
  print(){try{window.print()}catch(e){}},
  role(d){S.role=d.r;ls.set('role',d.r);S.soldMode=false;render(true);showStaffNow()},
  savestaff(){S.staff=$('#staffName').value.trim();ls.set('staff',S.staff);toast('担当者名を保存しました')},
  sound(d){S.sound=d.v==='1';ls.set('sound',S.sound);render(true);showStaffNow()},
  testbeep(){const s=S.sound;S.sound=true;beep();S.sound=s},
  saveseats(){const list=[...new Set($('#seatText').value.split('\n').map(x=>x.trim().slice(0,16)).filter(Boolean))];
    if(!list.length){toast('席を1つ以上入力してください','err');return}w(Store.set('config','seats',{list}),'席を保存しました')},
  savemenu(){
    const items=[];
    S.menu.forEach(m=>{const n=$('#mn_'+m.id),p=$('#mp_'+m.id);if(!n)return items.push(m);const name=n.value.trim();if(!name)return;items.push({...m,name,price:Math.max(0,Math.round(+p.value||0))})});
    const nn=$('#newName').value.trim(),np=Math.round(+$('#newPrice').value||0);
    if(nn){const secList=[];S.menu.forEach(m=>{if(!secList.find(x=>x.tab===m.tab&&x.sec===m.sec))secList.push({tab:m.tab,sec:m.sec})});
      const sc=secList[+$('#newSec').value]||secList[0];items.push({id:'x'+uid(),tab:sc.tab,sec:sc.sec,name:nn,price:Math.max(0,np),mods:(CFG.newItemMods||{})[sc.tab+'|'+sc.sec]||(CFG.newItemMods||{})[sc.tab]||[]})}
    w(Store.set('config','menu',{items}),'メニューを保存しました').then(()=>render(true))},
  resetmenu(){confirmBox('初期メニューに戻す','編集した内容を消して、最初のメニューに戻します。','戻す',()=>w(Store.del('config','menu'),'初期メニューに戻しました').then(()=>render(true)))}
};
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b||b.disabled)return;
  const f=A[b.dataset.a];if(f)f(b.dataset,b);
});
document.addEventListener('input',e=>{if(e.target.dataset.i==='note'&&X)X.note=e.target.value;if(e.target.dataset.i==='tgtext'){const o=TG();if(o)o.notes[e.target.dataset.t]=e.target.value}});
document.addEventListener('pointerdown',()=>{
  try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume()}catch(e){}
  try{navigator.wakeLock&&navigator.wakeLock.request('screen').catch(()=>{})}catch(e){}
},{once:true});

/* ---------- 起動 ---------- */
render();
setInterval(()=>{renderBar();if(S.tab==='feed')render()},30000);
Store.init().then(()=>{
  render(true);
  if(Store.failed)toast('連動できませんでした。電波を確認して開き直してください','err');
  try{if(document.querySelector('link[rel=manifest]')&&'serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{})}catch(e){}
  Store.sub('orders',a=>{detectNew(a);S.orders=a;render()});
  Store.sub('sales',a=>{S.sales=a;render()});
  Store.sub('days',a=>{S.days=a;render()});
  Store.sub('wx',a=>{S.wx=a;S.wxReady=true;render()});
  setTimeout(autoWx,8000);setInterval(autoWx,30*60000);
  Store.sub('config',a=>{
    const g=id=>a.find(x=>x.id===id);
    const mn=g('menu'),st=g('seats'),sd=g('sold'),tg=g('tags');
    S.tags=tg&&Array.isArray(tg.list)&&tg.list.length?tg.list.map(t=>({...t,opts:t.opts||[],on:!!t.on})):DEFAULT_TAGS;
    S.menu=mn&&Array.isArray(mn.items)&&mn.items.length?mn.items.map(m=>({...m,mods:m.mods||[]})):DEFAULT_MENU;
    S.seats=st&&Array.isArray(st.list)&&st.list.length?st.list:DEFAULT_SEATS;
    S.sold=sd&&Array.isArray(sd.ids)?sd.ids:[];
    if(!S.seats.includes(S.seat))S.seat=S.seats[0];
    render();
  });
});
};
