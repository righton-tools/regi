// 起動係：ログインした人がどの店の誰かを確かめ、その店の設定を読み込んでからレジ本体を動かす
(()=>{
const ROOT=document.getElementById('root'),PA=window.POSAuth;
const lock=(t,sub,btn)=>{ROOT.innerHTML='<div class="lock"><b></b><p></p>'+(btn?'<button class="btn" id="lockout">ログアウト</button>':'')+'</div>';ROOT.querySelector('b').textContent=t;ROOT.querySelector('p').textContent=sub||'';
  const b=ROOT.querySelector('#lockout');if(b)b.onclick=()=>auth.signOut()};
let auth=null,DB=null;
try{firebase.initializeApp(window.POS_FB);auth=firebase.auth();DB=firebase.database()}catch(e){}
if(!auth||!DB){lock('つながりませんでした','電波を確認して、もう一度開いてください。');return}
const QS=new URLSearchParams(location.search);
const once=(path,ms)=>Promise.race([DB.ref(path).once('value').then(s=>({ok:true,val:s.val()})).catch(e=>({ok:false,err:e})),new Promise(r=>setTimeout(()=>r({ok:false,timeout:true}),ms||8000))]);
let started=false,curUid=null;
lock('読み込み中…','');
auth.onAuthStateChanged(async u=>{
  if(started){if(!u||u.uid!==curUid)location.reload();return}
  if(!u){PA.loginScreen(ROOT,auth,{title:'POSレジ'});return}
  curUid=u.uid;lock('読み込み中…','');
  const CK='pos.me.'+u.uid;let me=null;
  const want=(QS.get('shop')||'').replace(/[^a-z0-9-]/g,'');
  if(want){const m=await once('masters/'+u.uid);if(m.ok&&m.val)me={shop:want,role:'master',login:PA.idOf(u.email)}}
  if(!me){
    const r=await once('users/'+u.uid);
    if(r.ok&&r.val&&r.val.shop){me={shop:r.val.shop,role:r.val.role,login:r.val.login||PA.idOf(u.email)};try{localStorage.setItem(CK,JSON.stringify(me))}catch(e){}}
    else if(r.ok){const m=await once('masters/'+u.uid);if(m.ok&&m.val){location.replace('master.html');return}
      try{localStorage.removeItem(CK)}catch(e){}lock('このログインは使えなくなりました','お店の店長に、新しいIDとパスワードを確認してください。',true);return}
    else{try{me=JSON.parse(localStorage.getItem(CK)||'null')}catch(e){}
      if(!me){lock('つながりませんでした','電波を確認して、もう一度開いてください。',true);return}}
  }
  const SK='pos.'+me.shop+'.setup';let cached=null;try{cached=localStorage.getItem(SK)}catch(e){}
  const go=json=>{started=true;window.startPOS(JSON.parse(json),me.shop,DB,{...me,uid:u.uid,auth,kick:()=>auth.signOut()})};
  if(cached)go(cached);
  DB.ref('shops/'+me.shop+'/setup').on('value',s=>{
    const v=s.val();
    if(!v){if(!started)lock('このお店はまだ準備中です','管理者にお問い合わせください。',true);return}
    const json=JSON.stringify(v);
    if(!started){try{localStorage.setItem(SK,json)}catch(e){}cached=json;go(json);return}
    if(json!==cached){try{localStorage.setItem(SK,json)}catch(e){}cached=json;
      if(!document.querySelector('.upd')){const d=document.createElement('div');d.className='upd';d.innerHTML='<span>お店の設定が新しくなりました。</span><button>読み込み直す</button>';d.querySelector('button').onclick=()=>location.reload();document.body.appendChild(d)}}
  },()=>{try{localStorage.removeItem(SK);localStorage.removeItem(CK)}catch(e){}
    if(started){auth.signOut()}else lock('このログインは使えなくなりました','お店の店長に、新しいIDとパスワードを確認してください。',true)});
});
try{if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{})}catch(e){}
})();
