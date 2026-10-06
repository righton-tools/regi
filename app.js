// POSレジ本体（全店共通）。店ごとの中身は起動時に渡される設定 CFG で決まる
window.startPOS=function(CFG,SHOP_ID,DB,ME){
'use strict';
const ROOT=document.getElementById('root');
ROOT.innerHTML='<div id="app">  <header class="bar">    <div class="logo"><b></b><span></span></div>    <nav class="tabs" id="tabs"></nav>    <div class="meta"><span id="barhelp"></span><span class="pill" id="sync"><i></i><span>接続中</span></span><span class="clock num" id="clock"></span></div>  </header>  <main id="main"></main></div><div id="modal" hidden></div><div id="toasts"></div>';
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
  orders:[],sales:[],days:[],menu:DEFAULT_MENU,seats:DEFAULT_SEATS,sold:[],
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
  const tabs=S.role==='register'?[['order','注文・会計'],['feed','オーダー'],['sales','売上'],['settings','設定']]:[['order','注文'],['feed','オーダー'],['settings','設定']];
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
  P={seat:S.seat,ids:os.map(o=>o.id),lines:mergeLines(os),sub:sumOrders(os),disc:0,recv:0,method:METHODS[0].id,field:isCash(METHODS[0].id)?'recv':'',busy:false};
  renderPay();
}
function renderPay(){
  const total=Math.max(0,P.sub-P.disc),chg=P.recv-total,ok=!P.busy&&(!isCash(P.method)||P.recv>=total);
  showModal(`<div class="sheet wide"><header><h2>会計　${esc(P.seat)}</h2>${HP('pay')}<button class="x" data-a="close" aria-label="閉じる">×</button></header><div class="body"><div class="pay">
    <div><div class="plines">${P.lines.map(l=>`<div><span>${esc(l.name)} ×${l.qty}${l.mods.length?`<br><small style="color:var(--muted)">${esc(l.mods.join('・'))}</small>`:''}</span><span class="num">${yen(l.unit*l.qty)}</span></div>`).join('')}</div>
      <div class="fld"><span>小計</span><b class="num">${yen(P.sub)}</b></div>
      <button class="fld ${P.field==='disc'?'on':''}" data-a="field" data-f="disc"><span>値引き（タップして入力）</span><b class="num">−${yen(P.disc)}</b></button>
      <div class="fld big"><span>合計（税込）<br><small style="color:var(--muted)">内消費税${rateFor(P.seat)}% ${yen(taxOf(total,rateFor(P.seat)))}</small></span><b class="num">${yen(total)}</b></div></div>
    <div><div class="seg" style="width:100%">${METHODS.map(m=>`<button style="flex:1" class="${P.method===m.id?'on':''}" data-a="method" data-m="${m.id}">${esc(m.name)}</button>`).join('')}</div>
      ${isCash(P.method)?`<button class="fld ${P.field==='recv'?'on':''}" data-a="field" data-f="recv"><span>お預かり</span><b class="num">${yen(P.recv)}</b></button>
      <div class="fld ${chg>=0&&P.recv?'chg':''}"><span>お釣り</span><b class="num">${P.recv?(chg>=0?yen(chg):'不足 '+yen(-chg)):'—'}</b></div>
      <div class="quick">${[['ぴったり','exact'],['1,000','1000'],['5,000','5000'],['10,000','10000']].map(([n,v])=>`<button data-a="quick" data-v="${v}">${n}</button>`).join('')}</div>`
      :`<p class="hint" style="margin:16px 0">${esc(METHOD[P.method])}で ${yen(total)} の支払い完了を確認してから確定してください。</p>`}
      <div class="pad">${['7','8','9','4','5','6','1','2','3','0','00','C'].map(k=>`<button data-a="key" data-k="${k}">${k==='C'?'クリア':k}</button>`).join('')}</div></div>
    </div></div><footer><button class="btn" data-a="close">戻る</button><button class="btn pri" data-a="payok" ${ok?'':'disabled'}>${P.busy?'処理中…':'会計を確定 '+yen(total)}</button></footer></div>`);
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
    received:isCash(P.method)?P.recv:total,change:isCash(P.method)?P.recv-total:0,orderIds:P.ids,by:who(),void:false};
  if(!await w(Store.set('sales',id,sale))){P.busy=false;renderPay();return}
  for(const oid of P.ids)await w(Store.update('orders',oid,{paid:true,saleId:id}));
  P=null;
  showModal(`<div class="sheet"><header><h2>会計が完了しました</h2></header><div class="body">
    <div class="done">${isCash(sale.method)?`<span>お釣り</span><b class="num">${yen(sale.change)}</b>`:`<span>${esc(METHOD[sale.method])}</span><b class="num">${yen(sale.total)}</b>`}</div>
    <pre class="rcpt">${esc(receiptText(sale))}</pre></div><footer>${CAN_PRINT?'<button class="btn" data-a="print">レシートを印刷</button>':''}<button class="btn pri" data-a="close">閉じる</button></footer></div>`);
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

/* ---------- 売上 ---------- */
function summarize(sales){
  const s={total:0,count:0,pay:{},disc:0,items:[],hours:Array(24).fill(0)};const im={};
  sales.forEach(x=>{if(x.void)return;s.total+=x.total;s.count++;s.pay[x.method]=(s.pay[x.method]||0)+x.total;s.disc+=x.discount||0;s.hours[new Date(x.at).getHours()]+=x.total;
    x.lines.forEach(l=>{const e=im[l.name]||(im[l.name]={n:l.name,q:0,a:0});e.q+=l.qty;e.a+=l.unit*l.qty})});
  s.items=Object.values(im);return s;
}
function mergeSum(a,b){
  if(!a)return b;const im={},pay={...(a.pay||{})};for(const k in b.pay)pay[k]=(pay[k]||0)+b.pay[k];
  [...(a.items||[]),...(b.items||[])].forEach(i=>{const e=im[i.n]||(im[i.n]={n:i.n,q:0,a:0});e.q+=i.q;e.a+=i.a});
  return {total:(a.total||0)+b.total,count:(a.count||0)+b.count,pay,disc:(a.disc||0)+b.disc,
    items:Object.values(im),hours:Array.from({length:24},(_,h)=>((a.hours||[])[h]||0)+b.hours[h])};
}
function renderSales(main){
  main.dataset.view='sales';
  const today=dayOf(Date.now()),live=S.sales.filter(s=>s.day===today).sort((a,b)=>b.at-a.at);
  const t=mergeSum(S.days.find(d=>d.id===today),summarize(live));
  const maxH=Math.max(1,...t.hours),hrs=t.hours.map((v,h)=>[h,v]).filter(x=>x[1]>0);
  const rank=[...t.items].sort((a,b)=>b.q-a.q).slice(0,15);
  const past=[...S.days].sort((a,b)=>a.id<b.id?1:-1).slice(0,60);
  const open=S.orders.filter(o=>!o.paid).length;
  main.innerHTML=`<div class="view"><h1 class="h1">本日の売上 <small class="num" style="color:var(--muted);font-size:14px">${today}</small></h1>
    <div class="kpis"><div class="kpi main"><span>売上（税込）</span><b class="num">${yen(t.total)}</b></div>
      <div class="kpi"><span>会計数</span><b class="num">${t.count}件</b></div><div class="kpi"><span>会計単価</span><b class="num">${yen(t.count?t.total/t.count:0)}</b></div>
      ${METHODS.map(m=>`<div class="kpi"><span>${esc(m.name)}</span><b class="num">${yen((t.pay||{})[m.id])}</b></div>`).join('')}
      <div class="kpi"><span>未会計の注文</span><b class="num">${open}件</b></div></div>
    <div class="cols" style="margin-top:16px">
      <div class="card"><h2 class="h2" style="margin-top:0">時間帯別の売上</h2>${hrs.length?hrs.map(([h,v])=>`<div class="hbar"><span class="num">${h}時</span><span><i style="width:${Math.round(v/maxH*100)}%"></i></span><span class="num">${yen(v)}</span></div>`).join(''):'<p class="empty">会計するとここに時間帯ごとの売上が出ます</p>'}</div>
      <div class="card"><h2 class="h2" style="margin-top:0">よく出た商品</h2>${rank.length?`<div class="tblwrap"><table><tr><th>商品</th><th class="r">数量</th><th class="r">金額</th></tr>${rank.map(i=>`<tr><td style="white-space:normal">${esc(i.n)}</td><td class="r num">${i.q}</td><td class="r num">${yen(i.a)}</td></tr>`).join('')}</table></div>`:'<p class="empty">まだ会計がありません</p>'}</div>
    </div>
    <h2 class="h2">本日の会計履歴（日締め前）</h2>
    <div class="card">${live.length?`<div class="tblwrap"><table><tr><th>No.</th><th>時刻</th><th>席</th><th>支払</th><th class="r">金額</th><th></th></tr>${live.map(s=>`<tr class="${s.void?'void':''}"><td class="num">${s.no}</td><td class="num">${hm(s.at)}</td><td>${esc(s.seat)}</td><td>${esc(METHOD[s.method]||s.method)}</td><td class="r num">${yen(s.total)}</td>
      <td class="r" style="text-decoration:none;opacity:1"><button class="mini" data-a="rcpt" data-id="${s.id}">明細</button> ${s.void?'':`<button class="mini danger" data-a="voidsale" data-id="${s.id}">取消</button>`}</td></tr>`).join('')}</table></div>`:'<p class="empty">日締め前の会計はありません</p>'}</div>
    <h2 class="h2">日締め ${HP('closeday')}</h2>
    <div class="card"><p style="margin:0 0 10px;color:var(--muted);font-size:13px">営業終了後に押してください。会計履歴を日別の集計にまとめ、済んだ伝票を片付けます（未会計の伝票は残ります）。</p>
      <button class="btn dark" data-a="closeday" ${S.sales.length?'':'disabled'}>日締めをする</button></div>
    <h2 class="h2">日別の売上（日締め済み）</h2>
    <div class="card">${past.length?`<div class="tblwrap"><table><tr><th>日付</th><th class="r">売上</th><th class="r">会計数</th>${METHODS.map(m=>`<th class="r">${esc(m.name)}</th>`).join('')}<th class="r">値引き</th></tr>${past.map(d=>`<tr><td class="num">${esc(d.id)}</td><td class="r num">${yen(d.total)}</td><td class="r num">${d.count}</td>${METHODS.map(m=>`<td class="r num">${yen((d.pay||{})[m.id])}</td>`).join('')}<td class="r num">${yen(d.disc)}</td></tr>`).join('')}</table></div>`:'<p class="empty">日締めをすると、ここに日ごとの売上が残ります</p>'}</div></div>`;
}
async function closeDay(){
  const byDay={};S.sales.forEach(s=>(byDay[s.day]=byDay[s.day]||[]).push(s));
  const sales=[...S.sales],paid=S.orders.filter(o=>o.paid);let n=0;const all=sales.length+paid.length;
  const prog=()=>showModal(`<div class="sheet"><header><h2>日締め処理中…</h2></header><div class="body"><p class="num">${n} / ${all} 件を整理しました。画面を閉じずにお待ちください。</p></div></div>`);
  prog();
  for(const day of Object.keys(byDay)){
    const ex=S.days.find(d=>d.id===day),sum=mergeSum(ex?{...ex}:null,summarize(byDay[day]));delete sum.id;
    if(!await w(Store.set('days',day,sum))){closeModal();return}
  }
  for(const s of sales){await w(Store.del('sales',s.id));n++;if(n%5===0)prog()}
  for(const o of paid){await w(Store.del('orders',o.id));n++;if(n%5===0)prog()}
  closeModal();toast('日締めが完了しました');
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
  renderBar();
  const main=$('#main');
  if(S.role!=='register'&&S.tab==='sales')S.tab='order';
  if(S.tab==='order')renderOrder(main);
  else if(S.tab==='feed')renderFeed(main);
  else if(S.tab==='sales')renderSales(main);
  else renderSettings(main,force);
}
function showModal(html){const m=$('#modal');m.innerHTML=html;m.hidden=false}
function closeModal(){const m=$('#modal');m.hidden=true;m.innerHTML='';X=null;P=null}
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
document.addEventListener('input',e=>{if(e.target.dataset.i==='note'&&X)X.note=e.target.value});
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
  Store.sub('config',a=>{
    const g=id=>a.find(x=>x.id===id);
    const mn=g('menu'),st=g('seats'),sd=g('sold');
    S.menu=mn&&Array.isArray(mn.items)&&mn.items.length?mn.items.map(m=>({...m,mods:m.mods||[]})):DEFAULT_MENU;
    S.seats=st&&Array.isArray(st.list)&&st.list.length?st.list:DEFAULT_SEATS;
    S.sold=sd&&Array.isArray(sd.ids)?sd.ids:[];
    if(!S.seats.includes(S.seat))S.seat=S.seats[0];
    render();
  });
});
};
