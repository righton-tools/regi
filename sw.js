// POSレジ共通: 電波がなくても画面を開けるようにする係。
// 自分のサイトのファイルは毎回新しいものを取りに行き、取れない時だけ控えを使う。外部の部品は控えを優先する。
const C='pos-v1-'+self.registration.scope;
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('pos-')&&k.endsWith(self.registration.scope)&&k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.hostname.endsWith('firebasedatabase.app')||u.hostname.endsWith('firebaseio.com'))return;
  if(u.origin===location.origin){
    e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(C).then(x=>x.put(r,c))}return res}).catch(()=>caches.match(r,{ignoreSearch:true})));return}
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok||res.type==='opaque'){const c=res.clone();caches.open(C).then(x=>x.put(r,c))}return res})));
});
