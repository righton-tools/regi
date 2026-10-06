// ログインまわりの共通部品（レジ本体・マスター画面の両方で使う）
window.POSAuth=(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=id=>String(id||'').trim().toLowerCase();
const email=id=>norm(id)+'@'+window.POS_LOGIN_DOMAIN;
const idOf=mail=>String(mail||'').split('@')[0];
const validId=id=>/^[a-z0-9][a-z0-9._-]{2,29}$/.test(norm(id));
const ROLE={master:'マスター',manager:'店長',staff:'スタッフ'};
function msg(e){
  const c=(e&&e.code)||'';
  if(/invalid-credential|wrong-password|user-not-found|invalid-login|invalid-email/.test(c))return 'IDかパスワードが違います';
  if(/email-already-in-use/.test(c))return 'そのIDはすでに使われています。別のIDにしてください';
  if(/weak-password/.test(c))return 'パスワードは6文字以上にしてください';
  if(/too-many-requests/.test(c))return '間違いが続いたため一時的に止められています。少し待ってからお試しください';
  if(/network-request-failed/.test(c))return '電波を確認して、もう一度お試しください';
  if(/requires-recent-login/.test(c))return 'いちどログアウトして、ログインし直してからお試しください';
  if(/permission|PERMISSION/.test(c+((e&&e.message)||'')))return 'この操作をする権限がありません';
  return (e&&e.message)||'できませんでした';
}
// いまのログインを保ったまま、別のログインを作る・消すための一時的な窓口
async function second(fn){
  const app=firebase.initializeApp(window.POS_FB,'sec'+Date.now());
  try{const a=app.auth();try{await a.setPersistence(firebase.auth.Auth.Persistence.NONE)}catch(e){}return await fn(a)}
  finally{try{await app.auth().signOut()}catch(e){}try{await app.delete()}catch(e){}}
}
const createLogin=(id,pass)=>second(async a=>(await a.createUserWithEmailAndPassword(email(id),pass)).user.uid);
const deleteLogin=(id,pass)=>second(async a=>{const c=await a.signInWithEmailAndPassword(email(id),pass);await c.user.delete()});
// その店の、ある役割（店長／スタッフ）のログイン一覧
async function listLogins(DB,shop){
  const mem=(await DB.ref('members/'+shop).once('value')).val()||{};const out=[];
  for(const uid of Object.keys(mem)){let login='';try{const u=(await DB.ref('users/'+uid).once('value')).val();login=(u&&u.login)||''}catch(e){}out.push({uid,role:mem[uid],login})}
  return out;
}
// ログインを作り直す：新しいID・パスワードを作り、同じ役割の古いログインは使えなくする
async function replaceLogin(DB,shop,role,newId,newPass,curPass){
  newId=norm(newId);
  if(!validId(newId))throw new Error('IDは半角の英小文字・数字で3〜30文字にしてください（. _ - も使えます）');
  if(String(newPass||'').length<6)throw new Error('パスワードは6文字以上にしてください');
  const olds=(await listLogins(DB,shop)).filter(x=>x.role===role);
  const same=olds.find(x=>x.login===newId);
  if(same){
    if(!curPass)throw new Error('同じIDのままパスワードだけ変える時は「いまのパスワード」も入れてください。忘れた時は、新しいIDで作り直してください');
    await deleteLogin(newId,curPass);
  }
  const uid=await createLogin(newId,newPass);
  await DB.ref('users/'+uid).set({shop,role,login:newId});
  await DB.ref('members/'+shop+'/'+uid).set(role);
  for(const o of olds){await DB.ref('members/'+shop+'/'+o.uid).remove();try{await DB.ref('users/'+o.uid).remove()}catch(e){}}
  return {uid,login:newId,removed:olds.length};
}
async function changeMyPassword(auth,cur,next){
  if(String(next||'').length<6)throw new Error('パスワードは6文字以上にしてください');
  const u=auth.currentUser;
  await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email,cur));
  await u.updatePassword(next);
}
// ログイン画面
function loginScreen(root,auth,opt){
  opt=opt||{};let brand=null;try{brand=JSON.parse(localStorage.getItem('pos.brand')||'null')}catch(e){}
  if(opt.noBrand)brand=null;
  root.innerHTML=`<div class="login"${brand&&brand.bar?` style="--lg:${esc(brand.bar)}${brand.accent?';--shu:'+esc(brand.accent):''}${brand.ink?';--shu-ink:'+esc(brand.ink):''}"`:''}><div class="lhead">${brand&&brand.img?`<img src="${esc(brand.img)}" alt="${esc(brand.name||'')}">`:`<b>${esc(opt.title||'POSレジ')}</b>`}</div>
    <form class="lform" id="lform"><div class="lhelp">${window.POSHelp?window.POSHelp.btn('login'):''}<span>使い方</span></div><label>ログインID<input class="inp" id="lid" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
    <label>パスワード<input class="inp" id="lpw" type="password" autocomplete="current-password" required></label>
    <p class="lerr" id="lerr"></p><button class="btn pri" id="lbtn">ログイン</button>${opt.extra||''}</form></div>`;
  const f=root.querySelector('#lform');
  f.addEventListener('submit',async e=>{e.preventDefault();const b=root.querySelector('#lbtn'),er=root.querySelector('#lerr');b.disabled=true;er.textContent='';
    try{await auth.signInWithEmailAndPassword(email(root.querySelector('#lid').value),root.querySelector('#lpw').value)}catch(err){er.textContent=msg(err);b.disabled=false}});
}
return {esc,norm,email,idOf,validId,msg,ROLE,createLogin,deleteLogin,listLogins,replaceLogin,changeMyPassword,loginScreen};
})();
