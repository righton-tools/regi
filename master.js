// マスター画面：マスターとしてログインした人だけが、全店の売上・注文を見られて、店の追加とログインの発行ができる
(()=>{
const ROOT=document.getElementById('root'),PA=window.POSAuth,esc=PA.esc,HP=k=>window.POSHelp?window.POSHelp.btn(k):'';
const yen=n=>'¥'+Math.round(n||0).toLocaleString('ja-JP');
const p2=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())};
const lock=(t,sub,btn)=>{ROOT.innerHTML='<div class="lock"><b></b><p></p>'+(btn?'<button class="btn" id="lockout">ログアウト</button>':'')+'</div>';ROOT.querySelector('b').textContent=t;ROOT.querySelector('p').textContent=sub||'';
  const b=ROOT.querySelector('#lockout');if(b)b.onclick=()=>auth.signOut()};
let auth=null,DB=null;
try{firebase.initializeApp(window.POS_FB);auth=firebase.auth();DB=firebase.database()}catch(e){}
if(!auth||!DB){lock('つながりませんでした','電波を確認して、もう一度開いてください。');return}
const MKEY=(new URLSearchParams(location.search).get('m')||'').replace(/[^A-Za-z0-9_-]/g,'');
const base=location.origin+location.pathname.replace(/[^/]*$/,'');
let shops={},built=false,uid=null,settingUp=false;const data={},logins={},subbed={};
const list=v=>Object.entries(v||{}).map(([id,x])=>({...x,id}));

/* ---- はじめての設定（マスターのIDとパスワードを決める） ---- */
function firstRun(){
  ROOT.innerHTML=`<div class="login"><div class="lhead"><b>はじめての設定</b></div>
    <form class="lform" id="fform"><div class="lhelp">${HP('first')}<span>使い方</span></div><p style="margin:0;font-size:13px;color:var(--muted)">マスター（全店を見られる人）のログインIDとパスワードを決めます。決められるのは最初の1回だけです。</p>
    <label>マスターのログインID（半角の英小文字・数字）<input class="inp" id="fid" autocapitalize="none" spellcheck="false" autocomplete="username" required></label>
    <label>パスワード（6文字以上）<input class="inp" id="fpw" type="password" autocomplete="new-password" required></label>
    <label>パスワード（もう一度）<input class="inp" id="fpw2" type="password" autocomplete="new-password" required></label>
    <p class="lerr" id="ferr"></p><button class="btn pri" id="fbtn">この内容で決める</button><button type="button" class="llink" id="fback">ログイン画面に戻る</button></form></div>`;
  ROOT.querySelector('#fback').onclick=()=>showLogin();
  ROOT.querySelector('#fform').addEventListener('submit',async e=>{e.preventDefault();
    const er=ROOT.querySelector('#ferr'),b=ROOT.querySelector('#fbtn'),id=PA.norm(ROOT.querySelector('#fid').value),pw=ROOT.querySelector('#fpw').value;
    if(!PA.validId(id)){er.textContent='IDは半角の英小文字・数字で3〜30文字にしてください';return}
    if(pw.length<6){er.textContent='パスワードは6文字以上にしてください';return}
    if(pw!==ROOT.querySelector('#fpw2').value){er.textContent='パスワードが2回で違っています';return}
    b.disabled=true;er.textContent='設定中…';settingUp=true;let user=null;
    try{user=(await auth.createUserWithEmailAndPassword(PA.email(id),pw)).user;
      await DB.ref('masters/'+user.uid).set({k:MKEY,login:id});
      settingUp=false;enter(user);
    }catch(err){settingUp=false;
      if(user){try{await user.delete()}catch(e){}er.textContent='設定できませんでした。マスターはすでに決まっているか、このページのURL（鍵）が違います。'}
      else er.textContent=PA.msg(err);
      b.disabled=false}});
}
function showLogin(){
  PA.loginScreen(ROOT,auth,{title:'POS マスター',noBrand:true,extra:MKEY?'<button type="button" class="llink" id="lfirst">はじめての設定はこちら</button>':''});
  const f=ROOT.querySelector('#lfirst');if(f)f.onclick=firstRun;
}

/* ---- 一覧画面 ---- */
function build(){
  built=true;
  ROOT.innerHTML=`<div class="mwrap"><header class="bar"><div class="logo"><b>POS</b><span>マスター</span></div><div class="tabs"></div><div class="meta">${HP('master')}<span class="clock num" id="mtotal"></span><button class="mini" id="mout" style="color:var(--ink)">ログアウト</button></div></header>
    <div class="mbody"><div class="shops" id="mshops"><p class="empty" id="mempty">まだ店舗がありません。下から店舗設定ファイルを選んで追加してください。</p></div>
    <div class="card"><h3 style="margin:0 0 4px">店舗の追加・設定の更新 ${HP('addshop')}</h3><p style="margin:0 0 10px;color:var(--muted);font-size:13px">店舗設定ファイル（shops フォルダの 店舗ID.json）を選ぶと、新しい店は登録され、登録済みの店は設定だけが新しくなります。売上や注文のデータは消えません。</p>
      <input type="file" id="mfile" accept=".json,application/json" class="inp" style="height:auto;padding:10px;max-width:100%"><p id="mmsg" class="lerr" style="margin-top:10px"></p></div>
    <div class="card"><h3 style="margin:0 0 10px">マスターのパスワードを変える ${HP('masterpass')}</h3>
      <div class="lgrid"><label>いまのパスワード<input class="inp" id="xpCur" type="password" autocomplete="current-password"></label><label>新しいパスワード（6文字以上）<input class="inp" id="xpNew" type="password" autocomplete="new-password"></label></div>
      <p class="lerr" id="xpMsg"></p><button class="btn dark" id="xpBtn">パスワードを変える</button></div></div></div>`;
  ROOT.querySelector('#mfile').addEventListener('change',addShop);
  ROOT.querySelector('#mout').onclick=()=>auth.signOut();
  ROOT.querySelector('#xpBtn').onclick=async e=>{const m=ROOT.querySelector('#xpMsg');m.textContent='変更中…';e.target.disabled=true;
    try{await PA.changeMyPassword(auth,ROOT.querySelector('#xpCur').value,ROOT.querySelector('#xpNew').value);m.textContent='パスワードを変えました。';ROOT.querySelector('#xpCur').value='';ROOT.querySelector('#xpNew').value=''}catch(err){m.textContent=PA.msg(err)}e.target.disabled=false};
}
function sumToday(id){
  const d=data[id]||{},t=today();let total=0,count=0;
  list(d.sales).forEach(s=>{if(s.day===t&&!s.void){total+=s.total||0;count++}});
  const c=(d.days||{})[t];if(c){total+=c.total||0;count+=c.count||0}
  const os=list(d.orders);
  return {total,count,open:os.filter(o=>!o.paid).length,fresh:os.filter(o=>o.status==='new').length};
}
function card(id){
  let el=document.getElementById('shop_'+id);if(el)return el;
  el=document.createElement('section');el.className='card shop';el.id='shop_'+id;
  const url=base+'?shop='+id;
  el.innerHTML=`<h3><span><span data-f="name"></span> ${HP('shopcard')}</span><small>${esc(id)}</small></h3><div data-f="stats"></div>
    <div class="row"><a class="btn pri" style="flex:1" href="${esc(url)}&r=register" target="_blank" rel="noopener">レジを開く</a><a class="btn" style="flex:1" href="${esc(url)}&r=staff" target="_blank" rel="noopener">スタッフ画面</a></div>
    <details><summary>ログインの設定（店長・スタッフ） ${HP('logins')}</summary><p data-f="logins" style="margin:6px 0 10px;font-size:13px"></p>
      <div class="lgrid"><label>種類<select class="inp" data-i="role"><option value="manager">店長用（お店の責任者）</option><option value="staff">スタッフ用（お店の端末）</option></select></label>
      <label>ログインID<input class="inp" data-i="id" autocapitalize="none" spellcheck="false" autocomplete="off"></label>
      <label>新しいパスワード（6文字以上）<input class="inp" data-i="pw" type="password" autocomplete="new-password"></label>
      <label>いまのパスワード（同じIDのまま変える時だけ）<input class="inp" data-i="cur" type="password" autocomplete="off"></label></div>
      <p class="lerr" data-f="lmsg"></p><button class="btn dark" data-b="login">このログインを作る・作り直す</button>
      <p style="margin:10px 0 0;font-size:12px;color:var(--muted)">作り直すと、同じ種類の古いログインは使えなくなります。お店の人が開くページ：<span class="num">${esc(base)}</span></p></details>
    <details><summary>日別の売上（日締め済み・直近31日） ${HP('days')}</summary><div data-f="days"></div></details>`;
  el.querySelector('[data-b="login"]').onclick=async e=>{const q=s=>el.querySelector(s),m=q('[data-f="lmsg"]');m.textContent='作成中…';e.target.disabled=true;
    try{const r=await PA.replaceLogin(DB,id,q('[data-i="role"]').value,q('[data-i="id"]').value,q('[data-i="pw"]').value,q('[data-i="cur"]').value);
      m.textContent='ログイン「'+r.login+'」を作りました。'+(r.removed?'古いログインは使えなくなりました。':'');q('[data-i="pw"]').value='';q('[data-i="cur"]').value='';loadLogins(id)}
    catch(err){m.textContent=PA.msg(err)}e.target.disabled=false};
  const em=document.getElementById('mempty');if(em)em.remove();
  document.getElementById('mshops').appendChild(el);return el;
}
function render(){
  if(!built)build();let all=0;
  Object.keys(shops).sort().forEach(id=>{
    const el=card(id),s=sumToday(id);all+=s.total;
    el.querySelector('[data-f="name"]').textContent=shops[id].name||id;
    el.querySelector('[data-f="stats"]').innerHTML=`<div class="big num">${yen(s.total)}</div><div style="color:var(--muted);font-size:12px">本日の売上（税込）</div>
      <dl><div><dt>会計数</dt><dd class="num">${s.count}件</dd></div><div><dt>未会計の注文</dt><dd class="num">${s.open}件</dd></div><div><dt>未確認の注文</dt><dd class="num">${s.fresh}件</dd></div></dl>`;
    const days=Object.entries((data[id]||{}).days||{}).sort((a,b)=>a[0]<b[0]?1:-1).slice(0,31);
    el.querySelector('[data-f="days"]').innerHTML=days.length?`<div class="tblwrap"><table><tr><th>日付</th><th class="r">売上</th><th class="r">会計数</th></tr>${days.map(([d,v])=>`<tr><td class="num">${esc(d)}</td><td class="r num">${yen(v.total)}</td><td class="r num">${v.count||0}</td></tr>`).join('')}</table></div>`:'<p class="empty" style="padding:12px">まだ日締めがありません</p>';
    const lg=logins[id];
    el.querySelector('[data-f="logins"]').textContent=!lg?'確認中…':'店長用ID：'+(lg.filter(x=>x.role==='manager').map(x=>x.login).join('、')||'まだありません')+'　／　スタッフ用ID：'+(lg.filter(x=>x.role==='staff').map(x=>x.login).join('、')||'まだありません');
  });
  document.getElementById('mtotal').textContent='全店 本日 '+yen(all);
}
async function loadLogins(id){try{logins[id]=await PA.listLogins(DB,id)}catch(e){logins[id]=[]}render()}
function sub(id){
  if(subbed[id])return;subbed[id]=true;data[id]={};
  ['sales','orders','days'].forEach(c=>DB.ref('shops/'+id+'/'+c).on('value',s=>{data[id][c]=s.val()||{};render()}));
  DB.ref('members/'+id).on('value',()=>loadLogins(id),()=>{});
}
async function addShop(e){
  const f=e.target.files[0],msg=document.getElementById('mmsg');if(!f)return;msg.textContent='読み込み中…';
  try{
    const cfg=JSON.parse(await f.text());
    if(!/^[a-z0-9-]{2,30}$/.test(cfg.id||''))throw new Error('id は半角の英小文字・数字・ハイフンで書いてください');
    if(!cfg.name||!Array.isArray(cfg.menu)||!Array.isArray(cfg.tabs)||!Array.isArray(cfg.seats)||!Array.isArray(cfg.payments))throw new Error('name・tabs・menu・seats・payments が必要です');
    const badKey=(o,p)=>{if(o&&typeof o==='object'&&!Array.isArray(o))for(const k of Object.keys(o)){if(k===''||/[.#$\/\[\]]/.test(k))return p+k;const r=badKey(o[k],p+k+' → ');if(r)return r}else if(Array.isArray(o))for(const v of o){const r=badKey(v,p);if(r)return r}return ''};
    const bk=badKey(cfg,'');if(bk)throw new Error('設定ファイルの項目名に使えない文字（. # $ / [ ]）があります：'+bk);
    const ex=shops[cfg.id];
    await DB.ref('shops/'+cfg.id+'/setup').set(cfg);
    await DB.ref('index/'+cfg.id).set({name:cfg.name});
    msg.textContent='「'+cfg.name+'」を'+(ex?'更新':'登録')+'しました。'+(ex?'':'続けて、その店のカードの「ログインの設定」で店長用ログインを作ってください。');
  }catch(err){msg.textContent='できませんでした：'+PA.msg(err)}
  e.target.value='';
}
async function enter(u){
  uid=u.uid;lock('読み込み中…','');
  let ok=false;try{ok=!!(await DB.ref('masters/'+uid).once('value')).val()}catch(e){}
  if(!ok){lock('このログインは管理者用ではありません','お店のログインは、レジのページから入ってください。',true);return}
  DB.ref('index').on('value',s=>{shops=s.val()||{};Object.keys(shops).forEach(sub);render()},()=>lock('読み込めませんでした','',true));
}
lock('読み込み中…','');
auth.onAuthStateChanged(u=>{
  if(settingUp)return;
  if(built&&(!u||u.uid!==uid)){location.reload();return}
  if(!u){showLogin();return}
  if(!built)enter(u);
});
setInterval(()=>{if(built)render()},60000);
})();
