// POSレジ本体（全店共通）。店ごとの中身は起動時に渡される設定 CFG で決まる
window.startPOS=function(CFG,SHOP_ID,DB,ME){
'use strict';
const ROOT=document.getElementById('root');
ROOT.innerHTML='<div id="app">  <header class="bar">    <div class="logo"><b></b><span></span></div>    <nav class="tabs" id="tabs"></nav>    <div class="meta"><span id="barhelp"></span><span class="pill" id="sync"><i></i><span>接続中</span></span><span class="clock num" id="clock"></span></div>  </header>  <div id="wxask" hidden></div>  <main id="main"></main></div><div id="modal" hidden></div><div id="toasts"></div>';
document.title=CFG.name+' POSレジ';
if(CFG.logoImg){const L=document.querySelector('.logo');L.classList.add('haslogo');L.innerHTML='<img alt=""><span></span>';L.querySelector('img').src=CFG.logoImg;L.querySelector('img').alt=CFG.name}
else document.querySelector('.logo b').textContent=CFG.logo||CFG.name;
document.querySelector('.logo span').textContent=CFG.sub||'';
if(!(ME&&ME.demo))try{localStorage.setItem('pos.brand',JSON.stringify({img:CFG.logoBig||CFG.logoImg||'',bar:(CFG.colors||{}).bar||'',accent:(CFG.colors||{}).accent||'',ink:(CFG.colors||{}).accentInk||'',name:CFG.name}))}catch(e){}
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
const canSales=()=>S.role==='register'&&BOSS;
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
const METHODS=CFG.payments,METHOD={mixed:'併用',...Object.fromEntries(METHODS.map(m=>[m.id,m.name]))},isCash=id=>!!(METHODS.find(m=>m.id===id)||{}).cash;
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
/* ---------- 税率（店内＝標準、持ち帰り＝軽減。変わる日は予定表で持つ）・暗証番号・機械 ---------- */
const DEFAULT_TAX={std:CFG.taxRate==null?10:CFG.taxRate,
  red:(CFG.tax&&CFG.tax.red)||[{from:'2019-10-01',rate:CFG.takeoutTaxRate==null?8:CFG.takeoutTaxRate},{from:'2027-04-01',rate:1},{from:'2029-04-01',rate:8}],
  mode:(CFG.tax&&CFG.tax.mode)||'same',inv:CFG.invoiceNo||'',useTo:CFG.takeout!==false};
const redOn=day=>{let r=null;[...S.tax.red].sort((a,b)=>a.from<b.from?-1:1).forEach(x=>{if(r==null||x.from<=day)r=x.rate});return r==null?8:r};
const rateOf=(m,to,day)=>to&&!(m&&m.alc)?redOn(day||dayOf(Date.now())):S.tax.std;
const isToSeat=seat=>(CFG.takeoutWords||['テイクアウト','持ち帰り']).some(x=>String(seat).includes(x));
/* 価格の決め方：same=店内も持ち帰りも同じ税込価格／base=本体価格を同じにして、持ち帰りは税の差だけ安くする */
const priceFor=(p,rate)=>S.tax.mode==='base'&&rate!==S.tax.std?Math.round(p/(100+S.tax.std)*(100+rate)):p;
function taxBreak(lines,disc){
  const by={};let sub=0;lines.forEach(l=>{const r=l.r==null?S.tax.std:l.r;by[r]=(by[r]||0)+l.unit*l.qty;sub+=l.unit*l.qty});
  const rs=Object.keys(by).map(Number).sort((a,b)=>b-a);let left=disc;
  return rs.map((r,i)=>{const d=i===rs.length-1?left:Math.round(disc*by[r]/Math.max(1,sub));left-=d;const amt=Math.max(0,by[r]-d);return {r,amt,tax:Math.floor(amt*r/(100+r))}});
}
const ACTN={void:'会計の取消',disc:'値引き',cancel:'注文の取消',close:'日締め',cashio:'入金・出金',drawer:'ドロワーを開ける',toggle:'店内／持ち帰りの変更',set:'設定の変更',pinng:'暗証番号の間違い'};
const GUARDS=[['void','会計の取消'],['disc','値引き'],['cancel','送信した注文の取消'],['close','日締め'],['cashio','入金・出金'],['drawer','ドロワーを手で開ける']];
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
  orders:[],sales:[],days:[],wx:[],cash:[],cashio:[],toMode:{},tax:DEFAULT_TAX,guard:null,link:{sqApp:'',map:{}},fee:{},tags:DEFAULT_TAGS,per:{k:'day',off:0},menu:DEFAULT_MENU,seats:DEFAULT_SEATS,sold:[],
  drafts:ls.get('drafts',{}),customMenu:false
};
S.seat=S.seats[0];
const item=id=>S.menu.find(m=>m.id===id);
const draft=()=>S.drafts[S.seat]||(S.drafts[S.seat]=[]);
const saveDrafts=()=>ls.set('drafts',S.drafts);
const curTo=()=>{if(S.tax.useTo===false)return false;const v=S.toMode[S.seat];return v==null?isToSeat(S.seat):v};
const unitOf=l=>priceFor(l.base+l.mods.reduce((a,m)=>a+m.p,0),rateOf(item(l.mid),l.to));
const remOf=l=>Math.max(0,l.qty-(l.pq||0));
const openOrders=seat=>S.orders.filter(o=>o.seat===seat&&!o.paid).sort((a,b)=>a.at-b.at);
const sumLines=ls_=>ls_.reduce((a,l)=>a+l.unit*remOf(l),0);
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
  const reg=S.role==='register',tabs=[['order',reg?'注文・会計':'注文'],['feed','オーダー']].concat(canSales()?[['sales','売上']]:[],[['settings','設定']]);
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
    <div class="items">${s.it.map(m=>`<button class="item ${S.sold.includes(m.id)?'sold':''}" data-a="item" data-id="${m.id}"><b>${esc(m.name)}</b><span class="num">${yen(priceFor(m.price,rateOf(m,curTo())))}</span>${dq[m.id]?`<i class="q num">${dq[m.id]}</i>`:''}</button>`).join('')}</div>`).join('')
    ||'<p class="empty">この分類にメニューがありません</p>';
  renderCheck();
}
function renderCheck(){
  const os=openOrders(S.seat),d=draft(),sent=sumOrders(os),dsum=d.reduce((a,l)=>a+unitOf(l)*l.qty,0),reg=S.role==='register',to=curTo(),useTo=S.tax.useTo!==false;
  const tb=l=>l.to?' <i class="tob">持ち帰り</i>':'';
  let h=`<div class="chead"><button class="mini cclose" data-a="hidecheck">← メニュー</button><h2>${esc(S.seat)}</h2>${os.length?`<small class="num">${hm(os[0].at)}〜</small>`:''}</div>
    ${useTo?`<div class="tomode"><div class="seg"><button class="${to?'':'on'}" data-a="tomode" data-v="0">店内で食べる</button><button class="${to?'on':''}" data-a="tomode" data-v="1">持ち帰り</button></div>${HP('tomode')}</div>`:''}<div class="cbody">`;
  if(!os.length&&!d.length)h+=`<p class="empty">まだ注文がありません。<br>メニューをタップして追加してください。</p>`;
  os.forEach(o=>{
    h+=`<div class="round"><span class="num">${hm(o.at)}</span><span>${esc(o.by||'')}</span><span class="st ${o.status}">${ST[o.status]||''}</span></div>`;
    (o.lines||[]).forEach(l=>{const rem=remOf(l);h+=`<div class="ln ${rem?'':'paidln'}"><span class="nm">${esc(l.name)} ×${l.qty}${tb(l)}</span><span class="num">${yen(l.unit*rem)}</span>
      ${(l.mods&&l.mods.length)||l.note||l.pq?`<span class="sub">${esc([...(l.mods||[]),l.note,l.pq?(rem?'うち'+l.pq+'点は会計済み':'会計済み'):''].filter(Boolean).join(' ／ '))}</span>`:''}
      ${reg&&rem?`<span class="ops"><button class="mini danger" data-a="cancelline" data-id="${o.id}" data-k="${l.k}">1点取消</button>${useTo&&!l.pq?`<button class="mini" data-a="lineto" data-id="${o.id}" data-k="${l.k}">${l.to?'店内に変える':'持ち帰りに変える'}</button>`:''}</span>`:''}</div>`});
  });
  if(d.length){
    h+=`<div class="round"><span class="st cooking">未送信</span><span>まだ厨房に届いていません</span></div>`;
    d.forEach(l=>{h+=`<div class="ln"><span class="nm">${esc(l.name)}${tb(l)}</span><span class="num">${yen(unitOf(l)*l.qty)}</span>
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
  X={mid,k:k||null,qty:ln?ln.qty:1,to:ln?!!ln.to:curTo(),same:true,cur:0,units:[u],
    get sel(){return this.units[this.cur].sel},
    get note(){return this.units[this.cur].note},set note(v){this.units[this.cur].note=v}};
  renderItemSheet();
}
const unitMods=(m,u)=>{const r=[];m.mods.forEach(g=>GROUPS[g].opts.forEach(([n,p])=>{if((u.sel[g]||[]).includes(n))r.push({g,n,p})}));return r};
const unitOk=(m,u)=>m.mods.every(g=>GROUPS[g].type!=='req'||(u.sel[g]||[]).length);
function renderItemSheet(){
  const m=item(X.mid),sep=!X.same&&X.qty>1;
  const ok=X.units.every(u=>unitOk(m,u));
  const pr=u=>priceFor(m.price+unitMods(m,u).reduce((b,x)=>b+x.p,0),rateOf(m,X.to));
  const total=sep?X.units.reduce((a,u)=>a+pr(u),0):pr(X.units[0])*X.qty;
  const keep=$('#modal .sheet .body'),top=keep?keep.scrollTop:0;
  showModal(`<div class="sheet"><header><h2>${esc(m.name)}</h2>${HP('options')}<button class="x" data-a="close" aria-label="閉じる">×</button></header><div class="body">
    <div class="grp"><h4>数量</h4><span class="step"><button data-a="xqty" data-d="-1" aria-label="減らす">−</button><span class="num">${X.qty}</span><button data-a="xqty" data-d="1" aria-label="増やす">＋</button></span>
    ${X.qty>1?`<span class="seg" style="margin-left:10px;vertical-align:middle"><button class="${sep?'':'on'}" data-a="xsame" data-v="1">全部同じ内容</button><button class="${sep?'on':''}" data-a="xsame" data-v="0">1つずつ選ぶ</button></span>`:''}</div>
    ${S.tax.useTo!==false?`<div class="grp"><h4>店内／持ち帰り</h4><div class="seg"><button class="${X.to?'':'on'}" data-a="xto" data-v="0">店内で食べる</button><button class="${X.to?'on':''}" data-a="xto" data-v="1">持ち帰り</button></div></div>`:''}
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
  const lines=rows.map((r,i)=>({k:i===0&&X.k?X.k:uid(),mid:m.id,name:m.name,base:m.price,mods:r.mods,note:r.note,qty:r.qty,to:!!X.to}));
  const at=X.k?d.findIndex(l=>l.k===X.k):-1;
  if(at>=0)d.splice(at,1,...lines);else d.push(...lines);
  saveDrafts();closeModal();render();
}

/* ---------- 会計 ---------- */
let P=null,RCPT=null,PIN=null;
const salePays=s=>s.pays&&s.pays.length?s.pays:[{m:s.method,amt:s.total,recv:s.received,chg:s.change}];
const feeRate=m=>+((S.fee||{})[m])||0,payFee=p=>p.fee||0,feeOn=()=>METHODS.some(m=>feeRate(m.id)>0);
const payName=s=>{const ps=salePays(s);return ps.length>1?'併用':(METHOD[ps[0].m]||ps[0].m||'')};
const saleTaxes=s=>s.taxes&&s.taxes.length?s.taxes:[{r:s.taxRate==null?S.tax.std:s.taxRate,amt:s.total,tax:s.tax||0}];
const lkey=l=>[l.name,l.unit,(l.mods||[]).join(','),l.note||'',l.to?1:0,l.r==null?'':l.r,l.c||0].join('|');
function payGroups(os){
  const map=new Map();
  os.forEach(o=>(o.lines||[]).forEach(l=>{const rem=remOf(l);if(!rem)return;const key=lkey(l);let g=map.get(key);
    if(!g)map.set(key,g={key,name:l.name,unit:l.unit,mods:l.mods||[],note:l.note||'',to:!!l.to,r:l.r==null?S.tax.std:l.r,c:l.c||0,rem:0,srcs:[]});
    g.rem+=rem;g.srcs.push({oid:o.id,k:l.k,rem})}));
  return [...map.values()];
}
function openPay(){
  const os=openOrders(S.seat);if(!os.length)return;const groups=payGroups(os);if(!groups.length)return;
  const m0=METHODS[0].id;
  P={seat:S.seat,groups,mode:'all',sel:{},splitN:2,discMode:'yen',discVal:0,okDisc:false,pays:[],method:m0,amt:null,recv:0,field:isCash(m0)?'recv':'',busy:false,tags:{},notes:{}};
  renderPay();
}
function payCalc(){
  const lines=P.groups.map(g=>({...g,qty:P.mode==='items'?(P.sel[g.key]||0):g.rem})).filter(l=>l.qty>0);
  const sub=lines.reduce((a,l)=>a+l.unit*l.qty,0);
  const disc=Math.min(sub,P.discMode==='pct'?Math.floor(sub*Math.min(100,P.discVal)/100):P.discVal);
  const total=sub-disc,paid=P.pays.reduce((a,p)=>a+p.amt,0),remain=Math.max(0,total-paid);
  const per=Math.ceil(total/P.splitN);let amt;
  if(P.mode==='split')amt=P.pays.length>=P.splitN-1?remain:Math.min(per,remain);
  else amt=P.amt==null?remain:Math.min(P.amt,remain);
  return {lines,sub,disc,total,paid,remain,amt,per,last:remain-amt<=0};
}
const sqTender=m=>DEVS.sq&&S.link.sqApp?(S.link.map||{})[m]:null;
function renderPay(){
  const C=payCalc(),cash=isCash(P.method),chg=P.recv-C.amt,locked=P.pays.length>0,sq=sqTender(P.method);
  const ok=!P.busy&&C.lines.length>0&&(!cash||P.recv>=C.amt);
  const tf=tagFields(P.tags,P.notes),kb=$('#modal .sheet .body'),ktop=kb?kb.scrollTop:0;
  const step=(n,t)=>`<div class="pstep"><b>${n}</b>${t}</div>`;
  const lineRow=g=>{const q=P.mode==='items'?(P.sel[g.key]||0):g.rem;
    return `<div class="${P.mode==='items'&&!q?'off':''}"><span>${esc(g.name)}${P.mode==='items'?'':' ×'+g.rem}${g.to?' <i class="tob">持ち帰り</i>':''}${g.mods.length||g.note?`<br><small style="color:var(--muted)">${esc([...g.mods,g.note].filter(Boolean).join('・'))}</small>`:''}</span>
      ${P.mode==='items'?`<span class="step"><button data-a="psel" data-k="${esc(g.key)}" data-d="-1" ${locked?'disabled':''} aria-label="減らす">−</button><span class="num">${q}<small>/${g.rem}</small></span><button data-a="psel" data-k="${esc(g.key)}" data-d="1" ${locked?'disabled':''} aria-label="増やす">＋</button></span>`:''}
      <span class="num">${yen(g.unit*q)}</span></div>`};
  showModal(`<div class="sheet wide"><header><h2>会計　${esc(P.seat)}</h2>${HP('pay')}<button class="x" data-a="close" aria-label="閉じる">×</button></header><div class="body"><div class="pay">
    <div>${step(1,'会計のしかた')}
      <div class="seg pmode">${[['all','まとめて'],['split','割り勘'],['items','品ごとに分ける']].map(([v,n])=>`<button class="${P.mode===v?'on':''}" data-a="pmode" data-m="${v}" ${locked&&P.mode!==v?'disabled':''}>${n}</button>`).join('')}</div>
      ${P.mode==='split'?`<div class="psub"><span>人数</span><span class="step"><button data-a="psplit" data-d="-1" ${locked?'disabled':''} aria-label="減らす">−</button><span class="num">${P.splitN}</span><button data-a="psplit" data-d="1" ${locked?'disabled':''} aria-label="増やす">＋</button></span><span>1人あたり <b class="num">${yen(C.per)}</b></span></div>`:''}
      ${P.mode==='items'?`<div class="psub"><span>今回会計する品を ＋ で選びます</span><button class="mini" data-a="pselall" ${locked?'disabled':''}>全部選ぶ</button></div>`:''}
      <div class="plines ${P.mode==='items'?'pick':''}">${P.groups.map(lineRow).join('')}</div>
      <div class="fld"><span>小計</span><b class="num">${yen(C.sub)}</b></div>
      <div class="fld discrow ${P.field==='disc'?'on':''}"><button class="fbtn" data-a="field" data-f="disc" ${locked?'disabled':''}><span>値引き（タップして入力）</span><b class="num">−${yen(C.disc)}${P.discMode==='pct'&&P.discVal?`<small>（${P.discVal}％）</small>`:''}</b></button>
        <span class="seg dm"><button class="${P.discMode==='yen'?'on':''}" data-a="discmode" data-v="yen" ${locked?'disabled':''}>円</button><button class="${P.discMode==='pct'?'on':''}" data-a="discmode" data-v="pct" ${locked?'disabled':''}>％</button></span></div>
      <div class="fld big"><span>合計（税込）<br><small style="color:var(--muted)">${taxBreak(C.lines,C.disc).map(t=>`${t.r}%対象 ${yen(t.amt)}`).join('／')}</small></span><b class="num">${yen(C.total)}</b></div>
      ${locked?`<div class="paid">${P.pays.map((p,i)=>`<div><span>受け取り済み ${i+1}：${esc(METHOD[p.m]||p.m)}</span><span class="num">${yen(p.amt)}</span></div>`).join('')}<div class="rem"><span>残り</span><b class="num">${yen(C.remain)}</b></div>${P.pays.some(p=>p.ext)?'':'<button class="mini" data-a="payreset">受け取りをやり直す</button>'}</div>`:''}
      ${tf?`<div class="ptags"><h3>お客様の記録 <small>任意です。押さなくても会計できます</small> ${HP('tags')}</h3><div class="ptg">${tf}</div></div>`:''}</div>
    <div>${step(2,'支払い方法')}
      <div class="seg" style="width:100%">${METHODS.map(m=>`<button style="flex:1" class="${P.method===m.id?'on':''}" data-a="method" data-m="${m.id}">${esc(m.name)}</button>`).join('')}</div>
      <div class="pstep"><b>3</b>${cash?'お預かり':'支払いの確認'}${P.mode!=='split'&&P.amt==null&&P.field!=='amt'?'<button class="mini pamt" data-a="field" data-f="amt">一部だけ受け取る</button>':''}</div>
      ${P.mode!=='split'&&P.amt==null&&P.field!=='amt'?'':P.mode==='split'?`<div class="fld"><span>今回の金額（${Math.min(P.pays.length+1,P.splitN)}人目／${P.splitN}人）</span><b class="num">${yen(C.amt)}</b></div>`
        :`<button class="fld ${P.field==='amt'?'on':''}" data-a="field" data-f="amt"><span>今回の金額<small>　数字で入れます</small></span><b class="num">${yen(C.amt)}</b></button>`}
      ${cash?`<button class="fld ${P.field==='recv'?'on':''}" data-a="field" data-f="recv"><span>お預かり</span><b class="num">${yen(P.recv)}</b></button>
      <div class="fld ${chg>=0&&P.recv?'chg':''}"><span>お釣り</span><b class="num">${P.recv?(chg>=0?yen(chg):'不足 '+yen(-chg)):'—'}</b></div>
      <div class="quick">${[['ぴったり','exact'],['1,000','1000'],['5,000','5000'],['10,000','10000']].map(([n,v])=>`<button data-a="quick" data-v="${v}">${n}</button>`).join('')}</div>`
      :`<p class="hint" style="margin:12px 0">${sq?`「${C.last?'会計を確定':'この分を受け取る'}」を押すと、カード端末のアプリ（Square）が開きます。支払いが終わると、この画面に戻ります。`:`${esc(METHOD[P.method])}で ${yen(C.amt)} の支払いが終わったのを確かめてから、下のボタンを押してください。`}</p>`}
      <div class="pad">${['7','8','9','4','5','6','1','2','3','0','00','C'].map(k=>`<button data-a="key" data-k="${k}">${k==='C'?'クリア':k}</button>`).join('')}</div></div>
    </div></div><footer><button class="btn" data-a="close">戻る</button><button class="btn pri" data-a="payok" ${ok?'':'disabled'}>${P.busy?'処理中…':C.last?'会計を確定 '+yen(C.amt):'この分を受け取る '+yen(C.amt)+'（残り '+yen(C.remain-C.amt)+'）'}</button></footer></div>`);
  const nb=$('#modal .sheet .body');if(nb&&ktop)nb.scrollTop=ktop;
}
function receiptText(s){
  const txs=saleTaxes(s),hasRed=(s.lines||[]).some(l=>l.r!=null&&l.r<S.tax.std);
  const L=[SHOP.name,SHOP.addr,SHOP.tel&&'TEL '+SHOP.tel,S.tax.inv&&'登録番号 '+S.tax.inv,'--------------------------------',dayOf(s.at)+' '+hm(s.at)+'　No.'+s.no+'　'+s.seat,'--------------------------------'];
  (s.lines||[]).forEach(l=>{L.push(l.name+(l.r!=null&&l.r<S.tax.std?'※':'')+' ×'+l.qty+'　'+yen(l.unit*l.qty));const sub=[...(l.mods||[]),l.to?'持ち帰り':''].filter(Boolean);if(sub.length)L.push('　'+sub.join('・'))});
  L.push('--------------------------------');
  if(s.discount){L.push('小計　'+yen(s.subtotal));L.push('値引き　−'+yen(s.discount))}
  L.push('合計　'+yen(s.total));
  txs.forEach(t=>L.push('（'+t.r+'%対象 '+yen(t.amt)+'　内消費税 '+yen(t.tax)+'）'));
  if(hasRed)L.push('※は軽減税率の対象です');
  L.push('--------------------------------');
  salePays(s).forEach(p=>{L.push((METHOD[p.m]||p.m||'お支払い')+'　'+yen(p.amt));if(isCash(p.m)&&p.recv!=null){L.push('　お預かり '+yen(p.recv)+'　お釣り '+yen(p.chg||0))}});
  if(s.void)L.push('※この会計は取消済みです');
  return L.filter(x=>x!==''&&x!=null&&x!==false).join('\n');
}
function addPay(ext){
  const C=payCalc(),cash=isCash(P.method),p={m:P.method,amt:C.amt};
  if(cash){p.recv=P.recv;p.chg=P.recv-C.amt}
  if(ext)p.ext=ext;
  P.pays.push(p);P.amt=null;P.recv=0;P.field=isCash(P.method)?'recv':'';
  return C.last;
}
function payGo(){
  if(P.busy)return;const C=payCalc(),sq=sqTender(P.method);
  if(sq&&C.amt>0){sqLaunch(C.amt,sq);return}
  if(addPay())confirmPay();else renderPay();
}
async function confirmPay(){
  if(P.busy)return;P.busy=true;renderPay();
  const C=payCalc(),now=Date.now(),day=dayOf(now);
  const closed=S.days.find(d=>d.id===day);
  const no=S.sales.filter(s=>s.day===day).length+(closed?closed.count||0:0)+1;
  const id=uid();
  const lines=C.lines.map(l=>({name:l.name,unit:l.unit,qty:l.qty,mods:l.mods,note:l.note,r:l.r,to:l.to,c:l.c}));
  const parts=[];C.lines.forEach(l=>{let q=l.qty;l.srcs.forEach(s=>{if(q<=0)return;const t=Math.min(q,s.rem);parts.push({oid:s.oid,k:s.k,q:t});q-=t})});
  const taxes=taxBreak(lines,C.disc),pays=(P.pays.length?P.pays:[{m:P.method,amt:0}]).map(p=>{const f=Math.round((p.amt||0)*feeRate(p.m)/100);return f>0?{...p,fee:f}:p});
  const sale={no,at:now,day,seat:P.seat,lines,subtotal:C.sub,discount:C.disc,total:C.total,taxes,tax:taxes.reduce((a,t)=>a+t.tax,0),taxRate:Math.max(0,...taxes.map(t=>t.r)),
    method:pays.length===1?pays[0].m:'mixed',pays,received:pays.reduce((a,p)=>a+(p.recv==null?p.amt:p.recv),0),change:pays.reduce((a,p)=>a+(p.chg||0),0),
    orderIds:[...new Set(parts.map(p=>p.oid))],parts,by:who(),void:false,tags:P.tags,notes:cleanNotes(P.notes)};
  if(!await w(Store.set('sales',id,sale))){P.busy=false;renderPay();return}
  for(const oid of sale.orderIds){const o=S.orders.find(x=>x.id===oid);if(!o)continue;
    const ln=o.lines.map(x=>{const q=parts.filter(p=>p.oid===oid&&p.k===x.k).reduce((a,p)=>a+p.q,0);return q?{...x,pq:(x.pq||0)+q}:{...x}});
    await w(Store.update('orders',oid,{lines:ln,paid:ln.every(x=>(x.pq||0)>=x.qty),saleId:id}))}
  if(C.disc)audit('disc','No.'+no+' '+P.seat+(P.discMode==='pct'?'（'+P.discVal+'％）':''),C.disc);
  const rest=P.groups.some(g=>g.rem-((C.lines.find(l=>l.key===g.key)||{}).qty||0)>0);
  P=null;showDone({...sale,id},rest);
  const cash=pays.some(p=>isCash(p.m));
  if(DEVS.prn==='pass'&&(DEVS.auto||(DEVS.drawer&&cash))){ls.set('lastDone',{id,rest,at:Date.now()});setTimeout(()=>{GO.href=passUrl(DEVS.auto?receiptHtml(sale):'',DEVS.drawer&&cash)},500)}
}
function showDone(sale,rest){
  RCPT=sale;const cash=salePays(sale).some(p=>isCash(p.m));
  showModal(`<div class="sheet"><header><h2>会計が完了しました</h2></header><div class="body">
    <div class="done">${cash?`<span>お釣り</span><b class="num">${yen(sale.change)}</b>`:`<span>${esc(payName(sale))}</span><b class="num">${yen(sale.total)}</b>`}</div>
    ${rest?'<p class="hint" style="margin:0 0 10px">この席には、まだ会計していない注文が残っています。</p>':''}
    <pre class="rcpt">${esc(receiptText(sale))}</pre></div><footer>${DEVS.prn==='none'?'':'<button class="btn" data-a="print">レシートを印刷</button>'}${rest?'<button class="btn dark" data-a="payrest">残りを会計する</button>':''}<button class="btn pri" data-a="close">閉じる</button></footer></div>`);
}
/* ---------- 店長の暗証番号（値引き・取消などの前に聞く） ---------- */
async function sha(t){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function needPin(act,fn){
  const g=S.guard;if(!g||!g.hash||!(g.acts||{})[act]){fn();return}
  PIN={act,fn,val:'',err:''};renderPin();
}
function renderPin(){
  showModal(`<div class="sheet pinsheet"><header><h2>店長の暗証番号</h2>${HP('pin')}<button class="x" data-a="pinx" aria-label="閉じる">×</button></header><div class="body">
    <p class="hint" style="margin:0 0 10px">「${esc(ACTN[PIN.act]||'')}」には店長の暗証番号が必要です。</p>
    <div class="pindots">${PIN.val?'●'.repeat(PIN.val.length):'<span>数字を入れてください</span>'}</div><p class="lerr">${esc(PIN.err)}</p>
    <div class="pad">${['7','8','9','4','5','6','1','2','3','0','C','OK'].map(k=>`<button data-a="pink" data-k="${k}" ${k==='OK'?'class="okk"':''}>${k==='C'?'クリア':k}</button>`).join('')}</div></div>
    <footer><button class="btn" data-a="pinx">やめる</button></footer></div>`);
}
const audit=(act,txt,amt)=>{try{Store.set('audit',dayOf(Date.now())+'/'+uid(),{at:Date.now(),act,txt:String(txt||'').slice(0,120),amt:amt||0,by:who(),login:ME.login||'',dev:DEV})}catch(e){}};
/* ---------- 機械との連動（この端末の設定。使う時だけオンにする） ---------- */
const GO={set href(u){if(window.__go)window.__go(u);else location.href=u}};
const DEVS={prn:ls.get('prn','browser'),paper:ls.get('paper',576),auto:ls.get('autoPrint',false),drawer:ls.get('drawer',false),sq:ls.get('sq',false)};
const selfUrl=()=>location.origin+location.pathname;
const receiptHtml=s=>'<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0 8px;font-family:sans-serif}pre{font-family:monospace;font-size:24px;line-height:1.35;white-space:pre-wrap;word-break:break-all;margin:0}</style></head><body><pre>'+esc(receiptText(s))+'</pre></body></html>';
/* Star PassPRNT（スター精密の中継アプリ）：印刷とドロワー。公式の仕様どおりのURLで呼び出す */
const passUrl=(html,drawer)=>'starpassprnt://v1/print/nopreview?'+(html?'html='+encodeURIComponent(html)+'&size='+DEVS.paper+'&cut=partial&':'')+'drawer='+(drawer?'ahead':'off')+'&back='+encodeURIComponent(selfUrl()+location.search);
/* Square POSアプリ（カード・PayPayなどの端末）：金額を渡して支払い、結果を受け取る */
function sqLaunch(amount,tender){
  const state=uid(),cb=selfUrl(),app=S.link.sqApp;
  const snap={...P,busy:false};ls.set('pend',{state,at:Date.now(),P:snap});
  if(/Android/i.test(navigator.userAgent)){
    const T={CREDIT_CARD:'com.squareup.pos.TENDER_CARD',PAYPAY:'com.squareup.pos.TENDER_PAYPAY',OTHER:'com.squareup.pos.TENDER_OTHER'}[tender]||'com.squareup.pos.TENDER_CARD';
    GO.href='intent:#Intent;action=com.squareup.pos.action.CHARGE;package=com.squareup;S.com.squareup.pos.WEB_CALLBACK_URI='+cb+';S.com.squareup.pos.CLIENT_ID='+app+';S.com.squareup.pos.API_VERSION=v2.0;i.com.squareup.pos.TOTAL_AMOUNT='+amount+';S.com.squareup.pos.CURRENCY_CODE=JPY;S.com.squareup.pos.TENDER_TYPES='+T+';S.com.squareup.pos.REQUEST_METADATA='+state+';end';
  }else{
    GO.href='square-commerce-v1://payment/create?data='+encodeURIComponent(JSON.stringify({amount_money:{amount,currency_code:'JPY'},callback_url:cb,client_id:app,version:'1.3',notes:SHOP.name+' '+P.seat,state,options:{supported_tender_types:[tender],auto_return:true}}));
  }
  toast('カード端末のアプリを開いています…');
}
/* アプリから戻ってきた時の結果を読む（URLに付いてくる） */
const RET=(()=>{try{const q=new URLSearchParams(location.search),h=location.href;let r=null;
  if(q.get('data')){const d=JSON.parse(q.get('data'));r={sq:true,ok:d.status==='ok',txn:d.transaction_id||d.client_transaction_id||'',err:d.error_code||'',state:d.state||''}}
  else if(h.includes('com.squareup.pos.')){const g=n=>q.get('com.squareup.pos.'+n)||'';r={sq:true,ok:!g('ERROR_CODE')&&!!(g('SERVER_TRANSACTION_ID')||g('CLIENT_TRANSACTION_ID')),txn:g('SERVER_TRANSACTION_ID')||g('CLIENT_TRANSACTION_ID'),err:g('ERROR_CODE'),state:g('REQUEST_METADATA')}}
  else{const m=h.match(/passprnt_code=(\d+)/);if(m)r={pp:true,code:+m[1]}}
  if(r){['data','passprnt_code','passprnt_message'].forEach(k=>q.delete(k));[...q.keys()].forEach(k=>{if(k.startsWith('com.squareup.pos.')||k.includes('passprnt_'))q.delete(k)});
    history.replaceState(null,'',location.pathname+(q.toString()?'?'+q.toString():''))}
  return r}catch(e){return null}})();
const SQERR={payment_canceled:'支払いが取り消されました',TRANSACTION_CANCELED:'支払いが取り消されました',not_logged_in:'Squareのアプリにログインしてください',USER_NOT_LOGGED_IN:'Squareのアプリにログインしてください',no_network_connection:'通信できませんでした',NO_NETWORK:'通信できませんでした',client_not_authorized_for_user:'アプリIDの設定を確認してください',UNAUTHORIZED_CLIENT_ID:'アプリIDの設定を確認してください'};
let resumed=false;
function resumeRet(){
  if(resumed||!RET)return;resumed=true;
  if(RET.pp){if(RET.code!==0)toast('プリンターに送れませんでした（コード'+RET.code+'）。電源と接続を確認してください','err');
    const ld=ls.get('lastDone',null);ls.set('lastDone',null);
    if(ld&&Date.now()-ld.at<10*60000){const s=S.sales.find(x=>x.id===ld.id);if(s)showDone(s,ld.rest)}return}
  const pend=ls.get('pend',null);ls.set('pend',null);
  if(!pend||(RET.state&&pend.state!==RET.state)||Date.now()-pend.at>30*60000){toast('カード端末から戻りましたが、会計の続きが見つかりませんでした。伝票を確認してください','err');return}
  P=pend.P;S.seat=P.seat;
  if(RET.ok){const last=addPay('sq:'+RET.txn);toast('カード端末の支払いを受け取りました');if(last)confirmPay();else renderPay()}
  else{toast('カード端末の支払いは完了していません：'+(SQERR[RET.err]||RET.err||'理由不明'),'err');renderPay()}
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
  hours:Array.from({length:24},(_,h)=>(d.hours||[])[h]||0),hc:Array.from({length:24},(_,h)=>(d.hc||[])[h]||0),tg:(d.tg||[]).map(e=>({...e,o:e.o||''})),
  gp:d.gp||0,gps:d.gps||0,toA:d.toA||0,fee:d.fee||0,fp:d.fp||{},tx:(d.tx||[]).map(t=>({r:t.r,amt:t.amt||0,tax:t.tax||0}))});
const addTx=(map,t)=>{const x=map[t.r]||(map[t.r]={r:t.r,amt:0,tax:0});x.amt+=t.amt;x.tax+=t.tax};
function summarize(sales){
  const s={total:0,count:0,pay:{},disc:0,items:[],hours:Array(24).fill(0),hc:Array(24).fill(0),tg:[],gp:0,gps:0,toA:0,fee:0,fp:{},tx:[]};const im={},tm={},xm={};
  sales.forEach(x=>{if(x.void)return;const h=new Date(x.at).getHours();
    s.total+=x.total;s.count++;salePays(x).forEach(p=>{s.pay[p.m]=(s.pay[p.m]||0)+p.amt;const f=payFee(p);if(f){s.fee+=f;s.fp[p.m]=(s.fp[p.m]||0)+f}});s.disc+=x.discount||0;s.hours[h]+=x.total;s.hc[h]++;
    saleTaxes(x).forEach(t=>addTx(xm,t));
    const tv=x.tags||{};for(const id in tv){const t=S.tags.find(z=>z.id===id),tn=t?t.name:id,v=tv[id];
      if(typeof v==='number')addTg(tm,{t:id,tn,o:'',c:1,a:x.total,n:v});
      else [].concat(v).forEach(o=>addTg(tm,{t:id,tn,o:String(o),c:1,a:x.total,n:0}))}
    (x.lines||[]).forEach(l=>{const e=im[l.name]||(im[l.name]={n:l.name,q:0,a:0,g:0,gq:0});e.q+=l.qty;e.a+=l.unit*l.qty;if(l.to)s.toA+=l.unit*l.qty;
      if(l.c>0){const r=l.r==null?S.tax.std:l.r,ex=l.unit*l.qty*100/(100+r),g=ex-l.c*l.qty;e.g+=g;e.gq+=l.qty;s.gp+=g;s.gps+=ex}})});
  s.items=Object.values(im);s.tg=Object.values(tm);s.tx=Object.values(xm);s.gp=Math.round(s.gp);s.gps=Math.round(s.gps);return s;
}
function mergeSum(a,b){
  b=norm(b);if(!a)return b;a=norm(a);
  const im={},tm={},xm={},pay={...a.pay},fp={...a.fp};for(const k in b.pay)pay[k]=(pay[k]||0)+b.pay[k];for(const k in b.fp)fp[k]=(fp[k]||0)+b.fp[k];
  [...a.items,...b.items].forEach(i=>{const e=im[i.n]||(im[i.n]={n:i.n,q:0,a:0,g:0,gq:0});e.q+=i.q;e.a+=i.a;e.g+=i.g||0;e.gq+=i.gq||0});
  [...a.tg,...b.tg].forEach(e=>addTg(tm,e));[...a.tx,...b.tx].forEach(t=>addTx(xm,t));
  return {total:a.total+b.total,count:a.count+b.count,pay,disc:a.disc+b.disc,items:Object.values(im),
    hours:a.hours.map((v,h)=>v+b.hours[h]),hc:a.hc.map((v,h)=>v+b.hc[h]),tg:Object.values(tm),gp:a.gp+b.gp,gps:a.gps+b.gps,toA:a.toA+b.toA,fee:a.fee+b.fee,fp,tx:Object.values(xm)};
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
  const hasG=t.gps>0;
  const rankCard=card('よく出た商品',rank.length?`<div class="tblwrap"><table><tr><th>商品</th><th class="r">数量</th><th class="r">金額</th>${hasG?'<th class="r">粗利</th>':''}</tr>${rank.map(i=>`<tr><td style="white-space:normal">${esc(i.n)}</td><td class="r num">${i.q}</td><td class="r num">${yen(i.a)}</td>${hasG?`<td class="r num">${i.gq?yen(i.g):'—'}</td>`:''}</tr>`).join('')}</table></div>`:'<p class="empty">まだ会計がありません</p>');
  const txs=[...t.tx].sort((a,b)=>b.r-a.r),ce=isToday?cashExpect(today):null,crec=k==='day'?S.cash.find(x=>x.id===R.from):null;
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
      ${hasG?`<div class="kpi"><span>粗利（原価を入れた品）</span><b class="num">${yen(t.gp)}</b></div><div class="kpi"><span>粗利率</span><b class="num">${Math.round(t.gp/Math.max(1,t.gps)*100)}%</b></div>`:''}
      ${t.toA?`<div class="kpi"><span>うち持ち帰り</span><b class="num">${yen(t.toA)}</b></div>`:''}
      ${k!=='day'?`<div class="kpi"><span>営業日数</span><b class="num">${dkeys.length}日</b></div><div class="kpi"><span>1日あたり</span><b class="num">${yen(dkeys.length?t.total/dkeys.length:0)}</b></div>`:''}
      ${METHODS.map(m=>`<div class="kpi"><span>${esc(m.name)}</span><b class="num">${yen((t.pay||{})[m.id])}</b>${(t.fp||{})[m.id]?`<small class="fee num">手数料 −${yen(t.fp[m.id])}</small>`:''}</div>`).join('')}
      ${t.fee||feeOn()?`<div class="kpi"><span>決済手数料（計算）${HP('fee')}</span><b class="num">−${yen(t.fee)}</b></div><div class="kpi"><span>手数料を引いた売上</span><b class="num">${yen(t.total-t.fee)}</b></div>`:''}
      ${isToday?`<div class="kpi"><span>未会計の注文</span><b class="num">${open}件</b></div>`:''}</div>
    <div class="cols" style="margin-top:16px">${trend}${rankCard}</div>
    ${cuts}
    ${tagCards?`<h2 class="h2">お客様の記録 ${HP('tags')}</h2><div class="cols">${tagCards}</div>`:''}
    ${txs.length>1||(txs[0]&&txs[0].r!==S.tax.std)?`<h2 class="h2">税率ごとの売上 ${HP('tax')}</h2><div class="card"><div class="tblwrap"><table><tr><th>税率</th><th class="r">売上（税込）</th><th class="r">うち消費税</th></tr>${txs.map(x=>`<tr><td class="num">${x.r}%</td><td class="r num">${yen(x.amt)}</td><td class="r num">${yen(x.tax)}</td></tr>`).join('')}</table></div></div>`:''}
    ${isToday?`<h2 class="h2">レジのお金 ${HP('cash')}</h2><div class="card">
      <div class="row"><label class="tck">釣り銭の準備金<input class="inp num" id="cashFloat" type="number" inputmode="numeric" value="${ce.float||''}" placeholder="0" style="width:120px">円</label><button class="btn" data-a="savefloat">保存</button></div>
      <div class="cashrows"><div><span>釣り銭の準備金</span><b class="num">${yen(ce.float)}</b></div><div><span>現金の売上</span><b class="num">${yen(ce.sales)}</b></div>
        ${ce.ios.map(x=>`<div><span>${x.amt<0?'出金':'入金'}　${esc(x.memo||'')}<small class="num">　${hm(x.at)} ${esc(x.by||'')}</small></span><b class="num">${x.amt<0?'−':'+'}${yen(Math.abs(x.amt))}</b></div>`).join('')}
        <div class="tot"><span>レジにあるはずの現金</span><b class="num">${yen(ce.expect)}</b></div></div>
      <div class="row" style="margin-top:10px"><button class="btn" data-a="cashio" data-s="in">入金</button><button class="btn" data-a="cashio" data-s="out">出金</button>${DEVS.prn==='pass'?'<button class="btn" data-a="drawer">ドロワーを開ける</button>':''}</div></div>`
    :crec&&crec.counted!=null?`<h2 class="h2">レジ締めの記録</h2><div class="card"><div class="cashrows"><div><span>あるはずの現金</span><b class="num">${yen(crec.expected)}</b></div><div><span>数えた現金</span><b class="num">${yen(crec.counted)}</b></div><div class="tot"><span>差${crec.memo?'　'+esc(crec.memo):''}</span><b class="num">${crec.diff>0?'+':crec.diff<0?'−':''}${yen(Math.abs(crec.diff||0))}</b></div></div></div>`:''}
    ${BOSS&&k==='day'?`<div class="row" style="margin-top:12px"><button class="btn" data-a="auditlog" data-day="${R.from}">操作の記録を見る（取消・値引きなど）</button>${HP('audit')}</div>`:''}
    ${isToday?`<h2 class="h2">本日の会計履歴（日締め前）</h2>
    <div class="card">${live.length?`<div class="tblwrap"><table><tr><th>No.</th><th>時刻</th><th>席</th><th>支払</th><th class="r">金額</th><th></th></tr>${live.map(s=>`<tr class="${s.void?'void':''}"><td class="num">${s.no}</td><td class="num">${hm(s.at)}</td><td>${esc(s.seat)}</td><td>${esc(payName(s))}</td><td class="r num">${yen(s.total)}</td>
      <td class="r" style="text-decoration:none;opacity:1"><button class="mini" data-a="rcpt" data-id="${s.id}">明細</button> ${s.void?'':`<button class="mini" data-a="tagedit" data-id="${s.id}">記録${Object.keys(s.tags||{}).length||Object.keys(s.notes||{}).length?'✓':''}</button> <button class="mini danger" data-a="voidsale" data-id="${s.id}">取消</button>`}</td></tr>`).join('')}</table></div>`:'<p class="empty">日締め前の会計はありません</p>'}</div>
    <h2 class="h2">日締め ${HP('closeday')}</h2>
    <div class="card"><p style="margin:0 0 10px;color:var(--muted);font-size:13px">営業終了後に押してください。レジの現金を数えて差を確かめ、会計履歴を日別の集計にまとめて、済んだ伝票を片付けます（未会計の伝票は残ります）。</p>
      <button class="btn dark" data-a="closeday" ${S.sales.length?'':'disabled'}>日締め（レジ締め）をする</button></div>`:''}
    ${k!=='day'?`<h2 class="h2">日ごとの一覧</h2>
    <div class="card">${dkeys.length?`<div class="tblwrap"><table><tr><th>日付</th><th>天気</th><th>気温</th><th class="r">売上</th><th class="r">会計数</th><th class="r">客数</th>${METHODS.map(m=>`<th class="r">${esc(m.name)}</th>`).join('')}<th class="r">値引き</th>${t.fee?'<th class="r">手数料</th><th class="r">手数料引き後</th>':''}</tr>${[...dkeys].reverse().map(d=>{const x=dm[d],wx=wxOf(d),px=paxOf(x);return `<tr><td class="num">${dlabel(d)}</td><td>${BOSS?`<button class="mini" data-a="wxpick" data-day="${d}">${esc(wxName(wx)||'入れる')}</button>`:esc(wxName(wx)||'—')}</td><td class="num">${esc(wxTemp(wx)||'—')}</td><td class="r num">${yen(x.total)}</td><td class="r num">${x.count}</td><td class="r num">${px?px.n:'—'}</td>${METHODS.map(m=>`<td class="r num">${yen((x.pay||{})[m.id])}</td>`).join('')}<td class="r num">${yen(x.disc)}</td>${t.fee?`<td class="r num">−${yen(x.fee)}</td><td class="r num">${yen(x.total-x.fee)}</td>`:''}</tr>`}).join('')}</table></div>`:'<p class="empty">この期間の売上はまだありません</p>'}</div>`:'<p class="hint" style="margin-top:16px">上の「週」「月」「年」を押すと、期間ごとの集計と日ごとの一覧が出ます。</p>'}
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
/* ---------- レジのお金（釣り銭の準備金・入出金・レジ締め） ---------- */
let CL=null,IO=null;
function cashExpect(day){
  const dm=daySums(day,day)[day]||summarize([]),c=S.cash.find(x=>x.id===day)||{};
  const sales=METHODS.filter(m=>m.cash).reduce((a,m)=>a+((dm.pay||{})[m.id]||0),0);
  const ios=S.cashio.filter(x=>x.day===day).sort((a,b)=>a.at-b.at),io=ios.reduce((a,x)=>a+x.amt,0),fl=c.float||0;
  return {float:fl,sales,io,ios,expect:fl+sales+io,rec:c};
}
function renderClose(){
  const ex=cashExpect(dayOf(Date.now())),open=S.orders.filter(o=>!o.paid).length,n=CL.counted===''?null:Math.round(+CL.counted||0);
  showModal(`<div class="sheet"><header><h2>日締め（レジ締め）</h2>${HP('closeday')}<button class="x" data-a="close" aria-label="閉じる">×</button></header><div class="body">
    <div class="fld"><span>釣り銭の準備金</span><b class="num">${yen(ex.float)}</b></div>
    <div class="fld"><span>現金の売上</span><b class="num">${yen(ex.sales)}</b></div>
    ${ex.io?`<div class="fld"><span>入金・出金</span><b class="num">${ex.io>0?'+':'−'}${yen(Math.abs(ex.io))}</b></div>`:''}
    <div class="fld big"><span>レジにあるはずの現金</span><b class="num">${yen(ex.expect)}</b></div>
    <div class="lgrid" style="margin-top:12px"><label>実際に数えた現金（円）<input class="inp num" id="clCount" type="number" inputmode="numeric" data-i="clcount" value="${esc(CL.counted)}" placeholder="数えない時は空のまま"></label>
      <label>メモ（差が出た理由など）<input class="inp" id="clMemo" data-i="clmemo" value="${esc(CL.memo)}" maxlength="60"></label></div>
    <div class="fld ${n==null?'':n-ex.expect===0?'chg':'warn'}" id="clDiff"><span>差（数えた現金 − あるはずの現金）</span><b class="num">${n==null?'—':(n-ex.expect>0?'+':n-ex.expect<0?'−':'')+yen(Math.abs(n-ex.expect))}</b></div>
    <p class="hint" style="margin:12px 0 0">会計履歴を日別の集計にまとめ、済んだ伝票を片付けます。${open?'未会計の注文が'+open+'件残っています（そのまま残ります）。':''}</p></div>
    <footer><button class="btn" data-a="close">やめる</button><button class="btn pri" data-a="closego">日締めをする</button></footer></div>`);
}
async function loadDayColl(coll,days){
  if(Store.mode==='fb'){const out=[];
    await Promise.all(days.map(async d=>{const s=await Store.root.child(coll+'/'+d).once('value'),v=s.val()||{};for(const id in v)out.push({...v[id],day:d,id})}));return out}
  const m=Store._load(coll);return Object.keys(m).filter(key=>days.includes(key.split('/')[0])).map(key=>({...m[key],day:key.split('/')[0],id:key.split('/')[1]}));
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
function csvDays(){
  const R=periodRange(),dm=daySums(R.from,R.to),dkeys=Object.keys(dm).sort();if(!dkeys.length){toast('この期間の売上はまだありません');return}
  const cols=[];dkeys.forEach(d=>dm[d].tg.forEach(e=>{const key=e.t+'|'+e.o;if(!cols.find(c=>c.key===key))cols.push({key,name:e.tn+(e.o?'：'+e.o:'')})}));
  const rs=[...new Set(dkeys.flatMap(d=>dm[d].tx.map(t=>t.r)))].sort((a,b)=>b-a);
  const rows=[['日付','曜日','天気','開店時の天気','最高気温','最低気温','雨量mm','売上','会計数','会計単価',...METHODS.map(m=>m.name),'値引き','うち持ち帰り','決済手数料','手数料を引いた売上',...rs.flatMap(r=>[r+'%対象の売上',r+'%の消費税']),'粗利（原価を入れた品）','釣り銭準備金','数えた現金','現金の差',...cols.map(c=>c.name),...Array.from({length:24},(_,h)=>h+'時')]];
  dkeys.forEach(d=>{const x=dm[d],wx=wxOf(d)||{};rows.push([d,DOW[dparse(d).getDay()],wxName(wx),wx.ow||'',wx.hi==null?'':wx.hi,wx.lo==null?'':wx.lo,wx.rain==null?'':wx.rain,x.total,x.count,x.count?Math.round(x.total/x.count):0,
    ...METHODS.map(m=>(x.pay||{})[m.id]||0),x.disc,x.toA,x.fee,x.total-x.fee,...rs.flatMap(r=>{const t=x.tx.find(z=>z.r===r);return [t?t.amt:0,t?t.tax:0]}),x.gps?x.gp:'',...(c=>[c.float==null?'':c.float,c.counted==null?'':c.counted,c.diff==null?'':c.diff])(S.cash.find(z=>z.id===d)||{}),...cols.map(c=>{const e=x.tg.find(z=>z.t+'|'+z.o===c.key);return e?(e.o===''?e.n:e.c):0}),...x.hours])});
  dl(SHOP_ID+'_days_'+R.from+'_'+R.to+'.csv',rows);
}
async function csvSales(){
  const R=periodRange(),days=S.days.filter(d=>d.id>=R.from&&d.id<=R.to).map(d=>d.id);
  toast('明細を集めています…');let list;
  try{list=await loadDayColl('log',days)}catch(e){toast('明細を読み込めませんでした。通信を確認してください','err');return}
  S.sales.forEach(s=>{if(s.day>=R.from&&s.day<=R.to)list.push(s)});
  if(!list.length){toast('この期間の明細はありません（明細が残るのは、この機能が入った後の日締めからです）');return}
  list.sort((a,b)=>a.at-b.at);
  const tids=[],nids=[];list.forEach(s=>{for(const id in s.tags||{})if(!tids.includes(id))tids.push(id);for(const id in s.notes||{})if(!nids.includes(id))nids.push(id)});
  const nm=id=>(S.tags.find(t=>t.id===id)||{}).name||id;
  const rows=[['日付','時刻','曜日','天気','No.','席','合計','値引き','支払','決済手数料','担当','取消',...tids.map(nm),...nids.map(nm),'品数','商品']];
  list.forEach(s=>rows.push([s.day,hm(s.at),DOW[dparse(s.day).getDay()],wxName(wxOf(s.day)),s.no,s.seat,s.total,s.discount||0,salePays(s).map(p=>(METHOD[p.m]||p.m)+(salePays(s).length>1?' '+p.amt:'')).join(' + '),s.void?0:salePays(s).reduce((a,p)=>a+payFee(p),0),s.by||'',s.void?'取消':'',
    ...tids.map(id=>{const v=(s.tags||{})[id];return v==null?'':[].concat(v).join('・')}),...nids.map(id=>(s.notes||{})[id]||''),
    (s.lines||[]).reduce((a,l)=>a+l.qty,0),(s.lines||[]).map(l=>l.name+((l.mods||[]).length?'('+l.mods.join('・')+')':'')+(l.to?'[持ち帰り]':'')+'×'+l.qty).join(' / ')]));
  dl(SHOP_ID+'_sales_'+R.from+'_'+R.to+'.csv',rows);
}

/* ---------- 設定 ---------- */
function renderSettings(main,force){
  if(main.dataset.view==='settings'&&!force)return;
  main.dataset.view='settings';
  const secList=[];S.menu.forEach(m=>{if(!secList.find(x=>x.tab===m.tab&&x.sec===m.sec))secList.push({tab:m.tab,sec:m.sec})});
  const reg=S.role==='register';
  main.innerHTML=`<div class="view"><div class="set">
    <div class="card"><h3>この端末の役割 ${HP('role')}</h3><p>レジに置くタブレットは「メインレジ」、注文を取りに行くスマホは「スタッフ端末」にします。「売上」は、メインレジ＋店長のIDの時だけ出ます。</p>
      <div class="seg"><button class="${reg?'on':''}" data-a="role" data-r="register">メインレジ</button><button class="${reg?'':'on'}" data-a="role" data-r="staff">スタッフ端末</button></div></div>
    <div class="card"><h3>担当者名 ${HP('staffname')}</h3><p>注文に「誰が取ったか」が残ります。</p><div class="row"><input class="inp" id="staffName" value="${esc(S.staff)}" placeholder="例：たなか" maxlength="12"><button class="btn" data-a="savestaff">保存</button></div></div>
    <div class="card"><h3>新しい注文の通知音 ${HP('sound')}</h3><p>メインレジで、スタッフ端末から注文が届いた時に鳴ります。</p>
      <div class="row"><div class="seg"><button class="${S.sound?'on':''}" data-a="sound" data-v="1">鳴らす</button><button class="${S.sound?'':'on'}" data-a="sound" data-v="0">鳴らさない</button></div><button class="btn" data-a="testbeep">音を試す</button></div></div>
    <div class="card"><h3>連動の状態 ${HP('sync')}</h3><p>${ME.demo?'本番では、同じお店にログインしている全部の端末で、注文・会計・売切がすぐに共有されます（このデモは、この画面の中だけで動いています）。':Store.mode==='fb'?(Store.online?'連動中です。同じお店にログインしている全端末で、注文・会計・売切がすぐに共有されます。':'いまは電波待ちです。入力した内容はこの画面を開いたままにしておけば、電波が戻った時に自動で送られます。'):Store.mode==='db'?'連動中です。同じページを開いている全端末で、注文・会計・売切がすぐに共有されます。':Store.failed?'連動の準備に失敗しました。電波を確認して画面を開き直してください。いまの入力はこの端末の中だけに保存されます。':Store.mode==='local'?'店舗キーなしで開いているため、この端末の中だけに保存するお試しモードです（他の端末とは連動しません）。':'接続を確認しています…'}</p>
      ${Store.mode==='fb'&&!ME.demo?`<h3 style="margin-top:14px">端末を追加する</h3><p>追加したいスマホやタブレットのカメラでこのQRを読み、スタッフ用のIDとパスワードでログインします。</p>
      <div class="row" style="align-items:flex-start"><div class="qr">${qrSvg(joinUrl())}</div><div style="flex:1;min-width:200px"><input class="inp" id="joinUrl" readonly value="${esc(joinUrl())}" style="width:100%"><div class="row" style="margin-top:8px"><button class="btn" data-a="copyjoin">URLをコピー</button></div></div></div>`:''}</div>
    ${ME.demo?'':`<div class="card"><h3>ログイン ${HP('mylogin')}</h3><p>いまのログイン：<b>${esc(ME.login)}</b>（${esc(PA.ROLE[ME.role]||'')}）</p><div class="row"><button class="btn" data-a="logout">ログアウト</button></div></div>`}
    ${BOSS&&!ME.demo?`<div class="card"><h3>スタッフ用ログイン ${HP('stafflogin')}</h3><p>お店の端末で使うIDとパスワードです。作り直すと、古いIDとパスワードは使えなくなります（アルバイトが辞めた時などに）。</p>
      <p id="staffNow" style="color:var(--ink)">確認中…</p>
      <div class="lgrid"><label>ログインID<input class="inp" id="slId" autocapitalize="none" spellcheck="false" autocomplete="off" placeholder="例：${esc(SHOP_ID)}-staff"></label>
      <label>新しいパスワード（6文字以上）<input class="inp" id="slPw" type="password" autocomplete="new-password"></label>
      <label>いまのパスワード（同じIDのまま変える時だけ）<input class="inp" id="slCur" type="password" autocomplete="off"></label></div>
      <p class="lerr" id="slMsg"></p><div class="row"><button class="btn dark" data-a="savestafflogin">スタッフ用ログインを作り直す</button></div></div>`:''}
    ${ME.role==='manager'&&!ME.demo?`<div class="card"><h3>店長のパスワードを変える ${HP('managerpass')}</h3><p>店長のIDそのものを変えたい時は、管理者（マスター）に依頼してください。</p>
      <div class="lgrid"><label>いまのパスワード<input class="inp" id="mpCur" type="password" autocomplete="current-password"></label>
      <label>新しいパスワード（6文字以上）<input class="inp" id="mpNew" type="password" autocomplete="new-password"></label></div>
      <p class="lerr" id="mpMsg"></p><div class="row"><button class="btn dark" data-a="changemypass">パスワードを変える</button></div></div>`:''}
    <div class="card"><h3>機械との連動（この端末） ${HP('devices')}</h3><p>レシートのプリンターやドロワーを使う時だけ設定します。使わない時は、そのままで大丈夫です。</p>
      <h4 class="sh">レシートの出し方</h4><div class="seg wrap">${[['browser','ブラウザの印刷'],['pass','Starのプリンター'],['none','印刷しない']].map(([v,n])=>`<button class="${DEVS.prn===v?'on':''}" data-a="devset" data-k="prn" data-v="${v}">${n}</button>`).join('')}</div>
      ${DEVS.prn==='pass'?`<p style="margin-top:8px">スター精密のプリンターと、無料アプリ「Star PassPRNT」をこの端末に入れておきます。ドロワーはプリンターにつなぎます。</p>
      <h4 class="sh">紙の幅</h4><div class="seg">${[[576,'80mm'],[384,'58mm']].map(([v,n])=>`<button class="${+DEVS.paper===v?'on':''}" data-a="devset" data-k="paper" data-v="${v}">${n}</button>`).join('')}</div>
      <h4 class="sh">会計が終わったら自動で印刷</h4><div class="seg">${[[1,'する'],[0,'しない']].map(([v,n])=>`<button class="${!!DEVS.auto===!!v?'on':''}" data-a="devset" data-k="autoPrint" data-v="${v}">${n}</button>`).join('')}</div>
      <h4 class="sh">現金の会計でドロワーを開ける</h4><div class="seg">${[[1,'開ける'],[0,'開けない']].map(([v,n])=>`<button class="${!!DEVS.drawer===!!v?'on':''}" data-a="devset" data-k="drawer" data-v="${v}">${n}</button>`).join('')}</div>
      <div class="row" style="margin-top:12px"><button class="btn" data-a="testprint">テスト印刷</button><button class="btn" data-a="drawer">ドロワーを開ける</button></div>`:''}
      ${S.link.sqApp?`<h4 class="sh">カード端末（Square）との連動</h4><div class="seg">${[[1,'この端末で使う'],[0,'使わない']].map(([v,n])=>`<button class="${!!DEVS.sq===!!v?'on':''}" data-a="devset" data-k="sq" data-v="${v}">${n}</button>`).join('')}</div><p style="margin-top:8px">「使う」にすると、連動する支払い方法で会計した時にSquareのアプリが開きます。この端末にSquareのアプリが入っている必要があります。</p>`:''}
      <p style="margin-top:10px">はじめて使う時は、お客さんの会計の前に、必ず実際の機械で試してください。</p></div>
    ${BOSS?`<div class="card"><h3>決済手数料 ${HP('fee')}</h3><p>カードやQR決済の会社に払う手数料の率を入れると、売上の画面に「手数料」と「手数料を引いた売上」が出ます。空のままなら計算しません。</p>
      ${METHODS.filter(m=>!m.cash).map(m=>`<div class="row" style="margin-top:6px"><span style="min-width:90px">${esc(m.name)}</span><input class="inp" id="fee_${m.id}" inputmode="decimal" style="max-width:110px" value="${feeRate(m.id)||''}" placeholder="例 3.24"><span>％</span></div>`).join('')}
      <div class="row" style="margin-top:12px"><button class="btn pri" data-a="savefee">手数料の率を保存</button></div></div>`:''}
    ${BOSS?`<div class="card"><h3>税と価格 ${HP('tax')}</h3>
      <p>いまの税率：店内 <b>${S.tax.std}％</b>／持ち帰り <b>${redOn(dayOf(Date.now()))}％</b>${(()=>{const n=[...S.tax.red].sort((a,b)=>a.from<b.from?-1:1).find(x=>x.from>dayOf(Date.now()));return n?`　→　${esc(n.from)} から 持ち帰り <b>${n.rate}％</b>`:''})()}</p>
      <h4 class="sh">持ち帰りの切り替えボタン</h4><div class="seg">${[[1,'出す'],[0,'出さない（店内だけの店）']].map(([v,n])=>`<button class="${(S.tax.useTo!==false)===!!v?'on':''}" data-a="txuse" data-v="${v}">${n}</button>`).join('')}</div>
      <h4 class="sh">価格の決め方</h4><div class="seg wrap"><button class="${S.tax.mode!=='base'?'on':''}" data-a="txmode" data-v="same">店内も持ち帰りも同じ値段</button><button class="${S.tax.mode==='base'?'on':''}" data-a="txmode" data-v="base">持ち帰りは税の分だけ安くする</button></div>
      <p style="margin-top:8px">例：店内1,000円の品 → 持ち帰りは ${S.tax.mode==='base'?yen(Math.round(1000/(100+S.tax.std)*(100+redOn(dayOf(Date.now())))))+'（税の差だけ安い）':'1,000円（同じ）'}。どちらでも、レシートの税額は正しい税率で計算します。</p>
      <h4 class="sh">標準の税率（店内）と、持ち帰りの税率の予定</h4>
      <div class="row"><label class="tck">店内<input class="inp num" id="txStd" type="number" inputmode="numeric" value="${S.tax.std}" style="width:80px">％</label></div>
      ${[...S.tax.red,{from:'',rate:''}].map((x,i)=>`<div class="row" style="margin-top:6px"><input class="inp" type="date" id="txF_${i}" value="${esc(x.from)}" aria-label="いつから"><span>から 持ち帰り</span><input class="inp num" id="txR_${i}" type="number" inputmode="numeric" value="${x.rate}" style="width:80px" aria-label="税率"><span>％</span></div>`).join('')}
      <p style="margin-top:8px">日付を空にすると、その行は消えます。一番下の空の行で予定を足せます。法律が変わったら、ここを直すだけで切り替わります。</p>
      <h4 class="sh">インボイスの登録番号（レシートに出ます）</h4><input class="inp" id="txInv" value="${esc(S.tax.inv||'')}" placeholder="T1234567890123" maxlength="14" style="max-width:240px">
      <div class="row" style="margin-top:12px"><button class="btn dark" data-a="savetax">税と価格を保存</button></div></div>
    <div class="card"><h3>店長の暗証番号 ${HP('pin')}</h3><p>値引きや取消の前に、数字の暗証番号を聞くようにできます。スタッフには教えず、店長だけが知っておきます。${S.guard&&S.guard.hash?'<b>いまは設定されています。</b>':'いまは設定されていません（誰でも操作できます）。'}</p>
      <div class="lgrid"><label>新しい暗証番号（数字4〜8けた）<input class="inp" id="pinNew" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></label></div>
      <h4 class="sh">暗証番号を聞く操作</h4>${GUARDS.map(([k,n])=>`<label class="tck"><input type="checkbox" id="pg_${k}" ${S.guard&&S.guard.acts?(S.guard.acts[k]?'checked':''):(['void','disc','cancel','cashio','drawer'].includes(k)?'checked':'')}>${n}</label>`).join('')}
      <p class="lerr" id="pinMsg"></p><div class="row"><button class="btn dark" data-a="savepin">保存</button>${S.guard&&S.guard.hash?'<button class="btn" data-a="clearpin">暗証番号をなくす</button>':''}</div></div>
    <div class="card"><h3>カード端末との連動（Square） ${HP('sqlink')}</h3><p>Squareのカード端末を使っている店だけ設定します。会計の金額がSquareのアプリに自動で渡り、打ち間違いがなくなります。使わない時は空のままで大丈夫です。</p>
      <div class="lgrid"><label>SquareのアプリID<input class="inp" id="sqApp" value="${esc(S.link.sqApp||'')}" placeholder="sq0idp-..." autocapitalize="none" spellcheck="false"></label></div>
      <h4 class="sh">連動する支払い方法</h4>${METHODS.filter(m=>!m.cash).map(m=>`<div class="row" style="margin-top:6px"><span style="min-width:90px">${esc(m.name)}</span><select class="inp" id="sqM_${m.id}">${[['','連動しない'],['CREDIT_CARD','カード'],['PAYPAY','PayPay'],['OTHER','その他']].map(([v,n])=>`<option value="${v}" ${(S.link.map||{})[m.id]===v?'selected':''}>${n}</option>`).join('')}</select></div>`).join('')}
      <p style="margin-top:8px">Squareの開発者ページで、戻り先（Web Callback URL）にこのアドレスを登録します：<br><b style="word-break:break-all">${esc(selfUrl())}</b></p>
      <div class="row" style="margin-top:12px"><button class="btn dark" data-a="savelink">連動の設定を保存</button></div></div>`:''}
    ${BOSS?`<div class="card"><h3>会計のときの記録項目 ${HP('tagset')}</h3><p>会計の画面に出す「お客様の記録」です。使うものにチェックを入れます。押さなくても会計はできます。選択肢は「、」で区切って書きます。名前を空にすると、その項目は消えます。</p>
      ${S.tags.map(t=>`<div class="trow"><label class="tck"><input type="checkbox" id="tgon_${t.id}" ${t.on?'checked':''}>使う</label><input class="inp" id="tgn_${t.id}" value="${esc(t.name)}" maxlength="12" aria-label="項目の名前"><span class="tty">${TAGTYPE[t.type]||''}</span>${t.type==='one'||t.type==='multi'?`<input class="inp" id="tgo_${t.id}" value="${esc(t.opts.join('、'))}" aria-label="選択肢">`:'<span></span>'}</div>`).join('')}
      <h2 class="h2" style="margin:18px 0 6px">新しい項目を追加</h2>
      <div class="row"><input class="inp" id="tgNewName" placeholder="項目の名前（例：席の希望）" maxlength="12"><select class="inp" id="tgNewType">${Object.entries(TAGTYPE).map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select><input class="inp" id="tgNewOpts" placeholder="選択肢（例：カウンター、テーブル）" style="flex:1;min-width:180px"></div>
      <div class="row" style="margin-top:12px"><button class="btn dark" data-a="savetags">記録項目を保存</button><button class="btn" data-a="resettags">初期の項目に戻す</button></div></div>`:''}
    ${reg&&BOSS?`<div class="card"><h3>席の設定 ${HP('seats')}</h3><p>1行に1つ、席やテーブルの名前を書きます。</p>
      <textarea class="inp" id="seatText" rows="6">${esc(S.seats.join('\n'))}</textarea><div class="row" style="margin-top:8px"><button class="btn dark" data-a="saveseats">席を保存</button></div></div>
    <div class="card"><h3>メニューの編集 ${HP('menuedit')}</h3><p>名前・価格（店内の税込）・原価を直して「メニューを保存」を押すと全端末に反映されます。原価を入れると粗利が出ます。お酒は「酒」にチェックを入れてください（持ち帰りでも標準の税率になります）。名前を空にするとその品は消えます。</p>
      ${secList.map(sc=>`<h2 class="h2" style="margin:14px 0 6px">${esc(TABS.find(t=>t[0]===sc.tab)[1])}／${esc(sc.sec)}</h2>${S.menu.filter(m=>m.tab===sc.tab&&m.sec===sc.sec).map(m=>`<div class="mrow"><input class="inp" id="mn_${m.id}" value="${esc(m.name)}" aria-label="品名"><input class="inp num" id="mp_${m.id}" type="number" inputmode="numeric" value="${m.price}" aria-label="価格"><input class="inp num" id="mc_${m.id}" type="number" inputmode="numeric" value="${m.cost||''}" placeholder="原価" aria-label="原価"><label class="tck"><input type="checkbox" id="ma_${m.id}" ${m.alc?'checked':''}>酒</label></div>`).join('')}`).join('')}
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
  if(!canSales()&&S.tab==='sales')S.tab='order';
  if(S.tab==='order')renderOrder(main);
  else if(S.tab==='feed')renderFeed(main);
  else if(S.tab==='sales')renderSales(main);
  else renderSettings(main,force);
}
function showModal(html){const m=$('#modal');m.innerHTML=html;m.hidden=false}
function closeModal(){const m=$('#modal');m.hidden=true;m.innerHTML='';X=null;P=null;E=null;PIN=null;CL=null}
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
    const to=curTo(),dr=draft(),l=dr.find(l=>l.mid===m.id&&!l.mods.length&&!l.note&&!!l.to===to);
    if(l)l.qty++;else dr.push({k:uid(),mid:m.id,name:m.name,base:m.price,mods:[],note:'',qty:1,to});
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
    const o={seat,lines:d.map(l=>{const m=item(l.mid);return {k:l.k,mid:l.mid,name:l.name,unit:unitOf(l),qty:l.qty,mods:l.mods.map(x=>x.n),note:l.note,done:false,to:!!l.to,r:rateOf(m,l.to),c:(m&&m.cost)||0}}),
      status:S.role==='register'?'cooking':'new',src:S.role,by:who(),dev:DEV,at:now,day:dayOf(now),paid:false};
    S.drafts[seat]=[];saveDrafts();render();
    if(await w(Store.set('orders',uid(),o),seat+'の注文を送信しました'))A.hidecheck&&$('#orderRoot')&&$('#orderRoot').classList.remove('showcheck');
    else{S.drafts[seat]=d;saveDrafts();render()}
  },
  cancelline(d){
    const o=S.orders.find(o=>o.id===d.id);if(!o)return;const l=o.lines.find(l=>l.k===d.k);if(!l||!remOf(l))return;
    confirmBox('注文の取消','「'+l.name+'」を1点取り消します。よろしいですか？','取り消す',()=>needPin('cancel',()=>{
      const lines=o.lines.map(x=>({...x})).map(x=>x.k===d.k?{...x,qty:x.qty-1}:x).filter(x=>x.qty>0);
      audit('cancel',o.seat+' '+l.name,l.unit);
      w(lines.length?Store.update('orders',o.id,{lines,paid:lines.every(x=>(x.pq||0)>=x.qty)}):Store.del('orders',o.id),'取り消しました')}));
  },
  tomode(d){const v=d.v==='1';S.toMode[S.seat]=v;draft().forEach(l=>{l.to=v});saveDrafts();render()},
  xto(d){X.to=d.v==='1';renderItemSheet()},
  lineto(d){const o=S.orders.find(o=>o.id===d.id);if(!o)return;const l=o.lines.find(l=>l.k===d.k);if(!l||l.pq)return;
    const to=!l.to,nr=rateOf(item(l.mid),to),or=l.r==null?S.tax.std:l.r,unit=S.tax.mode==='base'&&nr!==or?Math.round(l.unit/(100+or)*(100+nr)):l.unit;
    w(Store.update('orders',o.id,{lines:o.lines.map(x=>x.k===d.k?{...x,to,r:nr,unit}:{...x})}),'「'+l.name+'」を'+(to?'持ち帰り':'店内')+'に変えました');
    audit('toggle',o.seat+' '+l.name+' → '+(to?'持ち帰り':'店内'))},
  pay(){openPay()},
  field(d){if(d.f==='disc'&&!P.okDisc){needPin('disc',()=>{P.okDisc=true;P.field='disc';renderPay()});return}
    if(d.f==='amt'&&P.amt==null)P.amt=0;
    P.field=d.f;renderPay()},
  method(d){P.method=d.m;P.recv=0;P.field=isCash(d.m)?'recv':'';renderPay()},
  key(d){const f=P.field;if(!f)return;const C=payCalc();
    let v=f==='disc'?P.discVal:f==='amt'?(P.amt||0):P.recv;
    if(d.k==='C')v=0;else v=Math.min(9999999,Number(String(v||'')+d.k));
    if(f==='disc'){P.discVal=P.discMode==='pct'?Math.min(100,v):Math.min(v,C.sub)}
    else if(f==='amt')P.amt=Math.min(v,C.remain);
    else P.recv=v;
    renderPay()},
  quick(d){const C=payCalc();P.field='recv';P.recv=d.v==='exact'?C.amt:+d.v;renderPay()},
  discmode(d){if(P.pays.length)return;const go=()=>{P.okDisc=true;P.discMode=d.v;P.discVal=0;P.field='disc';renderPay()};if(P.okDisc)go();else needPin('disc',go)},
  pmode(d){if(P.pays.length)return;P.mode=d.m;P.sel={};P.amt=null;P.recv=0;P.field=isCash(P.method)?'recv':'';renderPay()},
  psplit(d){if(P.pays.length)return;P.splitN=Math.max(2,Math.min(30,P.splitN+ +d.d));P.recv=0;renderPay()},
  psel(d){if(P.pays.length)return;const g=P.groups.find(g=>g.key===d.k);if(!g)return;P.sel[g.key]=Math.max(0,Math.min(g.rem,(P.sel[g.key]||0)+ +d.d));P.amt=null;P.recv=0;renderPay()},
  pselall(){if(P.pays.length)return;P.groups.forEach(g=>{P.sel[g.key]=g.rem});P.amt=null;P.recv=0;renderPay()},
  payreset(){P.pays=[];P.amt=null;P.recv=0;renderPay()},
  payok(){payGo()},
  payrest(){const seat=RCPT&&RCPT.seat;closeModal();if(seat){S.seat=seat;render();openPay()}},
  pink(d){if(!PIN)return;
    if(d.k==='C'){PIN.val='';PIN.err='';renderPin();return}
    if(d.k!=='OK'){if(PIN.val.length<8)PIN.val+=d.k;PIN.err='';renderPin();return}
    const p=PIN;sha(SHOP_ID+':'+p.val).then(h=>{if(PIN!==p)return;
      if(h===S.guard.hash){PIN=null;if(!P)closeModal();p.fn()}
      else{audit('pinng',ACTN[p.act]||p.act);p.val='';p.err='暗証番号が違います';renderPin()}})},
  pinx(){PIN=null;if(P)renderPay();else closeModal()},
  st(d){w(Store.update('orders',d.id,{status:d.s}))},
  ldone(d){const o=S.orders.find(o=>o.id===d.id);if(!o)return;w(Store.update('orders',o.id,{lines:o.lines.map(l=>l.k===d.k?{...l,done:!l.done}:{...l})}))},
  rcpt(d){const s=S.sales.find(s=>s.id===d.id);if(!s)return;RCPT=s;
    showModal(`<div class="sheet"><header><h2>会計明細 No.${s.no}</h2><button class="x" data-a="close" aria-label="閉じる">×</button></header><div class="body"><pre class="rcpt">${esc(receiptText(s))}</pre></div><footer>${DEVS.prn==='none'?'':'<button class="btn" data-a="print">印刷</button>'}<button class="btn pri" data-a="close">閉じる</button></footer></div>`)},
  voidsale(d){const s=S.sales.find(s=>s.id===d.id);if(!s)return;
    confirmBox('会計の取消','No.'+s.no+'（'+s.seat+'・'+yen(s.total)+'）の会計を取り消し、伝票を未会計に戻します。','会計を取り消す',()=>needPin('void',async()=>{
      if(!await w(Store.update('sales',s.id,{void:true})))return;
      if(s.parts&&s.parts.length){for(const oid of [...new Set(s.parts.map(p=>p.oid))]){const o=S.orders.find(o=>o.id===oid);if(!o)continue;
        const ln=o.lines.map(x=>{const q=s.parts.filter(p=>p.oid===oid&&p.k===x.k).reduce((a,p)=>a+p.q,0);return q?{...x,pq:Math.max(0,(x.pq||0)-q)}:{...x}});
        await w(Store.update('orders',oid,{lines:ln,paid:false,saleId:null}))}}
      else for(const oid of s.orderIds||[])if(S.orders.find(o=>o.id===oid))await w(Store.update('orders',oid,{paid:false,saleId:null}));
      audit('void','No.'+s.no+' '+s.seat,s.total);toast('会計を取り消しました')}))},
  closeday(){needPin('close',()=>{CL={counted:'',memo:''};renderClose()})},
  closego(){const c=CL;if(!c)return;const ex=cashExpect(dayOf(Date.now())),n=c.counted===''?null:Math.round(+c.counted||0);closeModal();
    (async()=>{const day=dayOf(Date.now()),cur=S.cash.find(x=>x.id===day),v={expected:ex.expect,memo:String(c.memo||'').slice(0,60),at:Date.now(),by:who()};
      if(n!=null){v.counted=n;v.diff=n-ex.expect}
      await w(cur?Store.update('cash',day,v):Store.set('cash',day,v));
      audit('close',n==null?'現金は数えていません':'数えた現金 '+yen(n)+'／差 '+(n-ex.expect>=0?'+':'')+(n-ex.expect)+'円',n==null?0:n-ex.expect);
      closeDay()})()},
  savefloat(){const v=Math.max(0,Math.round(+$('#cashFloat').value||0)),day=dayOf(Date.now()),cur=S.cash.find(x=>x.id===day);
    w(cur?Store.update('cash',day,{float:v}):Store.set('cash',day,{float:v}),'釣り銭の準備金を保存しました')},
  cashio(d){needPin('cashio',()=>{IO={sign:d.s==='out'?-1:1};
    showModal(`<div class="sheet"><header><h2>${IO.sign<0?'出金（レジからお金を出す）':'入金（レジにお金を入れる）'}</h2>${HP('cash')}<button class="x" data-a="close" aria-label="閉じる">×</button></header><div class="body">
      <div class="lgrid"><label>金額（円）<input class="inp num" id="ioAmt" type="number" inputmode="numeric" min="0"></label><label>理由（例：買い出し、両替）<input class="inp" id="ioMemo" maxlength="30"></label></div></div>
      <footer><button class="btn" data-a="close">やめる</button><button class="btn pri" data-a="cashiook">記録する</button></footer></div>`)})},
  cashiook(){const a=Math.round(+$('#ioAmt').value||0),memo=$('#ioMemo').value.trim().slice(0,30),sign=IO?IO.sign:1;if(a<=0){toast('金額を入れてください','err');return}
    closeModal();w(Store.set('cashio',uid(),{day:dayOf(Date.now()),at:Date.now(),amt:sign*a,memo,by:who()}),(sign<0?'出金':'入金')+'を記録しました');audit('cashio',(sign<0?'出金 ':'入金 ')+memo,sign*a);
    if(DEVS.prn==='pass'&&DEVS.drawer)setTimeout(()=>{GO.href=passUrl('',true)},500)},
  drawer(){needPin('drawer',()=>{audit('drawer','手で開けた');if(DEVS.prn==='pass')GO.href=passUrl('',true);else toast('ドロワーを開けるには、設定の「機械との連動」でStarのプリンターを選んでください','err')})},
  auditlog(d){loadDayColl('audit',[d.day]).then(list=>{list.sort((a,b)=>a.at-b.at);
    showModal(`<div class="sheet wide"><header><h2>操作の記録　${esc(d.day)}</h2>${HP('audit')}<button class="x" data-a="close" aria-label="閉じる">×</button></header><div class="body">
      ${list.length?`<div class="tblwrap"><table><tr><th>時刻</th><th>操作</th><th>内容</th><th class="r">金額</th><th>担当</th><th>ログイン</th></tr>${list.map(a=>`<tr><td class="num">${hm(a.at)}</td><td>${esc(ACTN[a.act]||a.act)}</td><td style="white-space:normal">${esc(a.txt||'')}</td><td class="r num">${a.amt?yen(a.amt):''}</td><td>${esc(a.by||'')}</td><td>${esc(a.login||'')}</td></tr>`).join('')}</table></div>`:'<p class="empty">この日の記録はありません</p>'}</div>
      <footer><button class="btn pri" data-a="close">閉じる</button></footer></div>`)}).catch(()=>toast('記録を読み込めませんでした','err'))},
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
  devset(d){const k=d.k,v=k==='prn'?d.v:k==='paper'?+d.v:d.v==='1';ls.set(k,v);DEVS[k==='autoPrint'?'auto':k]=v;render(true);showStaffNow()},
  testprint(){GO.href=passUrl('<!doctype html><html><head><meta charset="utf-8"></head><body><pre style="font-size:24px">'+esc(SHOP.name)+'\nテスト印刷\n'+dayOf(Date.now())+' '+hm(Date.now())+'\nこの紙が出れば、プリンターはつながっています。</pre></body></html>',false)},
  txuse(d){S.tax={...S.tax,useTo:d.v==='1'};A.savetax(true)},
  txmode(d){S.tax={...S.tax,mode:d.v};A.savetax(true)},
  savetax(quiet){
    const red=[];for(let i=0;;i++){const f=$('#txF_'+i);if(!f)break;const r=$('#txR_'+i).value;if(f.value&&r!=='')red.push({from:f.value,rate:Math.max(0,Math.min(99,Math.round(+r)))})}
    if(!red.length){toast('持ち帰りの税率を1行以上入れてください','err');return}
    red.sort((a,b)=>a.from<b.from?-1:1);
    const inv=$('#txInv').value.trim().toUpperCase();if(inv&&!/^T\d{13}$/.test(inv)){toast('登録番号は「T」と数字13けたです','err');return}
    const v={std:Math.max(0,Math.min(99,Math.round(+$('#txStd').value||0))),red,mode:S.tax.mode==='base'?'base':'same',inv,useTo:S.tax.useTo!==false};
    audit('set','税と価格');w(Store.set('config','tax',v),quiet===true?'':'税と価格を保存しました').then(()=>render(true))},
  async savepin(){const m=$('#pinMsg'),v=$('#pinNew').value.trim(),acts={};GUARDS.forEach(([k])=>{acts[k]=$('#pg_'+k).checked});
    if(!v&&!(S.guard&&S.guard.hash)){m.textContent='新しい暗証番号を入れてください';return}
    if(v&&!/^\d{4,8}$/.test(v)){m.textContent='数字4〜8けたで入れてください';return}
    const hash=v?await sha(SHOP_ID+':'+v):S.guard.hash;audit('set','店長の暗証番号');
    w(Store.set('config','guard',{hash,acts}),'暗証番号の設定を保存しました').then(()=>render(true))},
  clearpin(){confirmBox('暗証番号をなくす','暗証番号をなくすと、値引きや取消が誰でもできるようになります。','なくす',()=>{audit('set','店長の暗証番号をなくした');w(Store.del('config','guard'),'暗証番号をなくしました').then(()=>render(true))})},
  savefee(){const rates={};for(const m of METHODS.filter(m=>!m.cash)){const t=$('#fee_'+m.id).value.normalize('NFKC').replace(/[%\s]/g,'');if(!t)continue;const v=Number(t);if(!(v>0&&v<=20)){toast(m.name+'の率は 0〜20 の数字で入れてください（例 3.24）','err');return}rates[m.id]=v}
    audit('set','決済手数料の率');w(Object.keys(rates).length?Store.set('config','fee',{rates}):Store.del('config','fee'),'手数料の率を保存しました').then(()=>render(true))},
  savelink(){const app=$('#sqApp').value.trim(),map={};METHODS.filter(m=>!m.cash).forEach(m=>{const v=$('#sqM_'+m.id).value;if(v)map[m.id]=v});
    if(app&&!/^sq0id[a-z]-[\w-]{10,}$/.test(app)&&!/^sandbox-sq0id[a-z]-[\w-]{10,}$/.test(app)){toast('アプリIDの形が違うようです（sq0idp- で始まります）','err');return}
    audit('set','カード端末との連動');w(app?Store.set('config','link',{sqApp:app,map}):Store.del('config','link'),'連動の設定を保存しました').then(()=>render(true))},
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
  print(){if(DEVS.prn==='pass'&&RCPT){GO.href=passUrl(receiptHtml(RCPT),false);return}try{window.print()}catch(e){}},
  role(d){S.role=d.r;ls.set('role',d.r);S.soldMode=false;render(true);showStaffNow()},
  savestaff(){S.staff=$('#staffName').value.trim();ls.set('staff',S.staff);toast('担当者名を保存しました')},
  sound(d){S.sound=d.v==='1';ls.set('sound',S.sound);render(true);showStaffNow()},
  testbeep(){const s=S.sound;S.sound=true;beep();S.sound=s},
  saveseats(){const list=[...new Set($('#seatText').value.split('\n').map(x=>x.trim().slice(0,16)).filter(Boolean))];
    if(!list.length){toast('席を1つ以上入力してください','err');return}w(Store.set('config','seats',{list}),'席を保存しました')},
  savemenu(){
    const items=[];
    S.menu.forEach(m=>{const n=$('#mn_'+m.id),p=$('#mp_'+m.id);if(!n)return items.push(m);const name=n.value.trim();if(!name)return;const c=$('#mc_'+m.id),a=$('#ma_'+m.id);items.push({...m,name,price:Math.max(0,Math.round(+p.value||0)),cost:Math.max(0,Math.round(+(c&&c.value)||0)),alc:!!(a&&a.checked)})});
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
document.addEventListener('input',e=>{if(e.target.dataset.i==='note'&&X)X.note=e.target.value;if(e.target.dataset.i==='clcount'&&CL){CL.counted=e.target.value;const ex=cashExpect(dayOf(Date.now())),n=CL.counted===''?null:Math.round(+CL.counted||0),el=$('#clDiff');if(el){el.className='fld '+(n==null?'':n-ex.expect===0?'chg':'warn');el.querySelector('b').textContent=n==null?'—':(n-ex.expect>0?'+':n-ex.expect<0?'−':'')+yen(Math.abs(n-ex.expect))}}
  if(e.target.dataset.i==='clmemo'&&CL)CL.memo=e.target.value;
  if(e.target.dataset.i==='tgtext'){const o=TG();if(o)o.notes[e.target.dataset.t]=e.target.value}});
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
  const ready={};const got=k=>{ready[k]=1;if(ready.o&&ready.s)resumeRet()};
  Store.sub('orders',a=>{detectNew(a);S.orders=a;render();got('o')});
  Store.sub('sales',a=>{S.sales=a;render();got('s')});
  Store.sub('cash',a=>{S.cash=a;render()});
  Store.sub('cashio',a=>{S.cashio=a;render()});
  Store.sub('days',a=>{S.days=a;render()});
  Store.sub('wx',a=>{S.wx=a;S.wxReady=true;render()});
  setTimeout(autoWx,8000);setInterval(autoWx,30*60000);
  setTimeout(()=>{if(!BOSS)return;const t=dayOf(Date.now()),n=[...S.tax.red].sort((a,b)=>a.from<b.from?-1:1).find(x=>x.from>t);if(n&&(dparse(n.from)-dparse(t))/86400000<=45)toast(n.from+' から、持ち帰りの税率が '+n.rate+'％ に変わる予定です。設定の「税と価格」で確認してください','new')},6000);
  Store.sub('config',a=>{
    const g=id=>a.find(x=>x.id===id);
    const mn=g('menu'),st=g('seats'),sd=g('sold'),tg=g('tags'),tx=g('tax'),gd=g('guard'),lk=g('link'),fe=g('fee');
    S.fee=fe&&fe.rates?fe.rates:{};
    S.tax=tx&&Array.isArray(tx.red)&&tx.red.length?{std:tx.std==null?DEFAULT_TAX.std:tx.std,red:tx.red,mode:tx.mode==='base'?'base':'same',inv:tx.inv||'',useTo:tx.useTo!==false}:DEFAULT_TAX;
    S.guard=gd&&gd.hash?{hash:gd.hash,acts:gd.acts||{}}:null;
    S.link=lk&&lk.sqApp?{sqApp:lk.sqApp,map:lk.map||{}}:{sqApp:'',map:{}};
    S.tags=tg&&Array.isArray(tg.list)&&tg.list.length?tg.list.map(t=>({...t,opts:t.opts||[],on:!!t.on})):DEFAULT_TAGS;
    S.menu=mn&&Array.isArray(mn.items)&&mn.items.length?mn.items.map(m=>({...m,mods:m.mods||[]})):DEFAULT_MENU;
    S.seats=st&&Array.isArray(st.list)&&st.list.length?st.list:DEFAULT_SEATS;
    S.sold=sd&&Array.isArray(sd.ids)?sd.ids:[];
    if(!S.seats.includes(S.seat))S.seat=S.seats[0];
    render();
  });
});
};
