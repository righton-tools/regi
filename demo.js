// デモ（見本のお店）：登録もログインもなしで、本物と同じレジ画面を触れる。
// データはこの画面の中だけに置き、閉じると消える。売上の数字は見本として作っている。
(()=>{
'use strict';
const ROOT=document.getElementById('root');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const p2=n=>String(n).padStart(2,'0');
const dstr=d=>d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
/* 最後の案内文。お店の案内に合わせて、ここだけ直せばよい */
const CONTACT='自分のお店のメニューで試してみたい時は、このデモをお送りしたLINEに、ひとこと返信してください。';

/* ---------- 前に触った時の控えを消す（端末に残さない） ---------- */
const wipe=()=>{try{Object.keys(localStorage).filter(k=>k.startsWith('pos.demo-')).forEach(k=>localStorage.removeItem(k))}catch(e){}};
wipe();window.addEventListener('pagehide',wipe);

/* ---------- 見本のお店（業態ごと） ---------- */
const PAY=[{id:'cash',name:'現金',cash:true},{id:'card',name:'カード'},{id:'qr',name:'QR決済'}];
const col=(accent,soft,bar,dAccent,dSoft,dBar,ink)=>({accent,accentInk:ink||'#ffffff',accentSoft:soft,bar,dark:{accent:dAccent,accentInk:'#14100f',accentSoft:dSoft,bar:dBar}});
const seats=(...a)=>a.flatMap(([n,c])=>Array.from({length:c},(_,i)=>n+(i+1)));
/* メニューの書き方： [分類, 見出し, 選べるもの, [[品名,値段],…], お酒か] */
const TYPES=[
{id:'izakaya',label:'居酒屋・焼鳥',mark:'酒',name:'見本の居酒屋',sub:'IZAKAYA',colors:col('#b4472f','#f7e6e0','#231b19','#e58a6f','#3a2019','#151010'),
 seats:seats(['テーブル',4],['カウンター',4],['座敷',2]),note:'塩少なめ・わさび抜き など',tabs:[['food','フード'],['drink','ドリンク']],
 groups:{yaki:{label:'味',type:'req',opts:[['タレ',0],['塩',0]]},wari:{label:'飲み方',type:'one',opts:[['ロック',0],['水割り',0],['ソーダ割り',0],['お湯割り',0]]},mega:{label:'サイズ',type:'one',opts:[['メガ',250]]}},
 menu:[['food','すぐ出る一品',[],[['枝豆',380],['冷奴',350],['たこわさ',420],['ポテトサラダ',450],['キムチ',380]]],
  ['food','焼鳥（1本）',['yaki'],[['もも',180],['ねぎま',190],['皮',160],['つくね',220],['せせり',200],['砂ずり',170]]],
  ['food','揚げ物',[],[['唐揚げ',580],['ポテトフライ',450],['チキン南蛮',680],['軟骨の唐揚げ',520]]],
  ['food','刺身・焼き物',[],[['刺身盛り合わせ',1280],['ほっけ',780],['だし巻き玉子',520]]],
  ['food','〆',[],[['焼きおにぎり',300],['お茶漬け',450],['焼きそば',650]]],
  ['drink','ビール',['mega'],[['生ビール',550],['瓶ビール',650]],1],
  ['drink','サワー・ハイボール',['mega'],[['レモンサワー',450],['ハイボール',450],['ウーロンハイ',420]],1],
  ['drink','焼酎・日本酒',['wari'],[['芋焼酎',480],['麦焼酎',480],['梅酒',480],['日本酒（1合）',600]],1],
  ['drink','ソフトドリンク',[],[['ウーロン茶',300],['コーラ',300],['オレンジジュース',300],['ノンアルコールビール',450]]]],
 prof:{cnt:[26,40],hours:{17:2,18:6,19:9,20:9,21:7,22:4,23:1},pax:[2,5,3,3],mix:{food:2.2,drink:2.4},to:.02,off:0,wk:1.35,sex:[5,2,3],age:[0,3,4,4,3,1]}},
{id:'ramen',label:'ラーメン・中華',mark:'麺',name:'見本のラーメン店',sub:'RAMEN',colors:col('#c0281f','#fbe5e2','#1c1716','#f0796f','#3b1b18','#120e0e'),
 seats:seats(['カウンター',7],['テーブル',2],['テイクアウト',1]),note:'ねぎ抜き・麺かため など',tabs:[['men','麺'],['side','サイド・ご飯'],['drink','ドリンク']],
 groups:{kata:{label:'麺のかたさ',type:'one',opts:[['かため',0],['ふつう',0],['やわらかめ',0]]},ryo:{label:'麺の量',type:'one',opts:[['大盛り',150]]},top:{label:'トッピング',type:'multi',opts:[['味玉',130],['チャーシュー',250],['ねぎ',100],['のり',100],['メンマ',120],['もやし',100]]}},
 menu:[['men','ラーメン',['kata','ryo','top'],[['醤油ラーメン',850],['塩ラーメン',850],['味噌ラーメン',900],['豚骨ラーメン',800],['担々麺',950],['チャーシュー麺',1100],['つけ麺',950]]],
  ['men','追加',[],[['替玉',150]]],
  ['side','一品',[],[['餃子（5個）',400],['唐揚げ（3個）',450],['麻婆豆腐',780]]],
  ['side','ご飯もの',[],[['チャーハン',700],['半チャーハン',400],['天津飯',800],['ライス',150]]],
  ['side','セット（麺と一緒に）',[],[['半チャーハンセット',350],['餃子セット',300]]],
  ['drink','お酒',[],[['生ビール',550],['瓶ビール',650],['ハイボール',450]],1],
  ['drink','ソフトドリンク',[],[['ウーロン茶',250],['コーラ',250]]]],
 prof:{cnt:[70,105],hours:{11:6,12:10,13:8,14:3,17:2,18:5,19:7,20:6,21:3},pax:[6,3,1,1],mix:{men:1,side:.45,drink:.2},to:.04,off:1,wk:1.2,sex:[6,2,2],age:[1,4,4,3,2,1]}},
{id:'cafe',label:'カフェ・喫茶店',mark:'珈',name:'見本のカフェ',sub:'CAFE',colors:col('#7a5234','#f2e8df','#2b211b','#d2a37d','#352619','#17110d'),
 seats:seats(['テーブル',5],['カウンター',3],['テイクアウト',2]),note:'氷少なめ・シロップ抜き など',tabs:[['drink','ドリンク'],['food','フード'],['sweets','スイーツ']],
 groups:{temp:{label:'ホット／アイス',type:'req',opts:[['ホット',0],['アイス',0]]},size:{label:'サイズ',type:'one',opts:[['Lサイズ',100]]},milk:{label:'ミルクの変更',type:'one',opts:[['豆乳',50],['オーツミルク',80]]},set:{label:'セット',type:'one',opts:[['ドリンクセット',300]]}},
 menu:[['drink','コーヒー',['temp','size'],[['ブレンドコーヒー',480],['アメリカーノ',480]]],
  ['drink','ラテ',['temp','size','milk'],[['カフェラテ',550],['カプチーノ',550],['カフェモカ',600],['抹茶ラテ',600]]],
  ['drink','紅茶・ココア',['temp'],[['紅茶',480],['ココア',550]]],
  ['drink','冷たい飲み物',[],[['オレンジジュース',450],['クリームソーダ',650],['レモネード',520]]],
  ['food','モーニング',[],[['トーストセット',600],['たまごサンド',650]]],
  ['food','ランチ',['set'],[['ナポリタン',950],['オムライス',1000],['カレーライス',900],['ホットサンド',780],['サラダプレート',850]]],
  ['sweets','ケーキ',['set'],[['チーズケーキ',520],['ガトーショコラ',550],['プリン',450]]],
  ['sweets','デザート',[],[['パフェ',880],['ホットケーキ',780],['アイスクリーム',400]]]],
 prof:{cnt:[55,85],hours:{8:3,9:4,10:5,11:6,12:8,13:7,14:8,15:9,16:6,17:3},pax:[5,4,1,1],mix:{drink:1,food:.35,sweets:.4},to:.22,off:3,wk:1.3,sex:[2,6,2],age:[1,4,4,3,2,2]}},
{id:'teishoku',label:'定食・食堂',mark:'膳',name:'見本の食堂',sub:'SHOKUDO',colors:col('#2f6b3f','#e3f0e6','#1c241e','#7cc491','#1a3222','#0f1511'),
 seats:seats(['テーブル',5],['カウンター',5],['持ち帰り',1]),note:'ご飯少なめ・ねぎ抜き など',tabs:[['teishoku','定食'],['don','丼・麺'],['side','単品・ドリンク']],
 groups:{rice:{label:'ご飯',type:'one',opts:[['大盛り',100],['小盛り',0]]},miso:{label:'汁もの',type:'one',opts:[['豚汁に変更',150]]}},
 menu:[['teishoku','定食',['rice','miso'],[['日替わり定食',850],['唐揚げ定食',900],['生姜焼き定食',950],['とんかつ定食',1100],['焼き魚定食',950],['鯖の味噌煮定食',900],['ハンバーグ定食',1000],['チキン南蛮定食',950],['刺身定食',1300]]],
  ['don','丼',['rice'],[['カツ丼',900],['親子丼',800],['牛丼',750],['天丼',1000],['カレーライス',800]]],
  ['don','麺',[],[['かけうどん',500],['肉うどん',750]]],
  ['side','単品',[],[['冷奴',250],['納豆',150],['生卵',100],['ポテトサラダ',300],['味噌汁',150]]],
  ['side','お酒',[],[['瓶ビール',600]],1],
  ['side','ソフトドリンク',[],[['ウーロン茶',200],['コーラ',200]]]],
 prof:{cnt:[60,90],hours:{11:6,12:10,13:8,14:3,17:3,18:6,19:6,20:3},pax:[6,3,1,1],mix:{teishoku:.7,don:.3,side:.3},to:.08,off:0,wk:.9,sex:[6,2,2],age:[1,2,3,4,4,3]}},
{id:'yakiniku',label:'焼肉・ホルモン',mark:'肉',name:'見本の焼肉店',sub:'YAKINIKU',colors:col('#9c2a2a','#f7e3e3','#1d1818','#e67f7f','#3a1a1a','#110e0e'),
 seats:seats(['テーブル',6],['個室',2]),note:'厚切り・よく焼き など',tabs:[['niku','肉'],['side','サイド'],['drink','ドリンク']],
 groups:{aji:{label:'味',type:'req',opts:[['タレ',0],['塩',0]]},rice:{label:'ご飯',type:'one',opts:[['大盛り',100]]},mega:{label:'サイズ',type:'one',opts:[['メガ',250]]}},
 menu:[['niku','牛',['aji'],[['カルビ',980],['上カルビ',1480],['ロース',1080],['ハラミ',1180]]],
  ['niku','タン・盛り合わせ',[],[['上タン塩',1580],['おまかせ盛り合わせ',2980]]],
  ['niku','豚・鶏',['aji'],[['豚バラ',680],['豚トロ',720],['鶏もも',620]]],
  ['niku','ホルモン',['aji'],[['丸腸',780],['シマチョウ',780],['レバー',680],['ミノ',780]]],
  ['side','野菜・キムチ',[],[['キムチ',450],['ナムル盛り',550],['チョレギサラダ',680],['サンチュ',450]]],
  ['side','ご飯・麺・スープ',[],[['石焼ビビンバ',980],['冷麺',950],['クッパ',780],['わかめスープ',400]]],
  ['side','ライス',['rice'],[['ライス',250]]],
  ['drink','お酒',['mega'],[['生ビール',580],['ハイボール',480],['レモンサワー',480],['マッコリ',550],['焼酎',500]],1],
  ['drink','ソフトドリンク',[],[['ウーロン茶',300],['コーラ',300]]]],
 prof:{cnt:[18,30],hours:{17:2,18:6,19:9,20:8,21:5,22:2},pax:[1,5,3,4],mix:{niku:2.3,side:1.1,drink:1.8},to:.01,off:2,wk:1.5,sex:[4,2,4],age:[1,3,4,4,3,1]}},
{id:'soba',label:'そば・うどん',mark:'蕎',name:'見本のそば・うどん店',sub:'SOBA UDON',colors:col('#3d4f8a','#e5e9f5','#1b1e2b','#93a5e6','#1e2540','#0f111a'),
 seats:seats(['テーブル',4],['カウンター',5],['持ち帰り',1]),note:'ねぎ抜き・つゆ少なめ など',tabs:[['men','麺'],['don','丼・セット'],['side','天ぷら・ドリンク']],
 groups:{men:{label:'そば／うどん',type:'req',opts:[['そば',0],['うどん',0]]},ryo:{label:'麺の量',type:'one',opts:[['大盛り',150]]},top:{label:'トッピング',type:'multi',opts:[['えび天',250],['かき揚げ',200],['温玉',100],['とろろ',150],['肉',250]]}},
 menu:[['men','あたたかい麺',['men','ryo','top'],[['かけ',550],['きつね',700],['たぬき',650],['月見',680],['肉',850],['天ぷら',1100],['カレー',900],['鴨南蛮',1200]]],
  ['men','つめたい麺',['men','ryo','top'],[['ざる',650],['おろし',750],['とろろ',850],['天ざる',1250]]],
  ['don','丼',[],[['カツ丼',900],['天丼',1000],['親子丼',850]]],
  ['don','セット（麺と一緒に）',[],[['ミニ天丼セット',400],['ミニカツ丼セット',400],['いなり（2個）',250],['おにぎり',150]]],
  ['side','天ぷら・一品',[],[['天ぷら盛り合わせ',950],['えび天（1本）',250],['かき揚げ',200],['板わさ',450],['だし巻き玉子',600]]],
  ['side','お酒',[],[['瓶ビール',650],['日本酒（1合）',600],['そば焼酎',500]],1],
  ['side','ソフトドリンク',[],[['ウーロン茶',250]]]],
 prof:{cnt:[65,95],hours:{11:6,12:10,13:8,14:3,17:2,18:5,19:5,20:2},pax:[6,3,1,1],mix:{men:1,don:.3,side:.25},to:.05,off:4,wk:1.15,sex:[5,3,2],age:[0,1,3,4,4,5]}},
{id:'sushi',label:'寿司・海鮮',mark:'鮨',name:'見本の寿司店',sub:'SUSHI',colors:col('#1f5a7a','#e0eef5','#17222a','#79bfe0','#16303f','#0c1318'),
 seats:seats(['カウンター',6],['テーブル',3],['持ち帰り',1]),note:'シャリ少なめ・炙り など',tabs:[['nigiri','にぎり'],['mori','盛り・丼'],['side','一品・ドリンク']],
 groups:{wasabi:{label:'わさび',type:'one',opts:[['さび抜き',0]]},shari:{label:'シャリ',type:'one',opts:[['シャリ小',0]]}},
 menu:[['nigiri','にぎり（1貫）',['wasabi','shari'],[['まぐろ',250],['中とろ',450],['サーモン',220],['はまち',250],['鯛',280],['いか',180],['えび',220],['甘えび',280],['ほたて',300],['いくら',400],['うに',600],['穴子',350],['玉子',150]]],
  ['nigiri','巻物',['wasabi'],[['鉄火巻',500],['かっぱ巻',300],['ねぎとろ巻',600]]],
  ['mori','盛り合わせ',['wasabi'],[['にぎり盛り（8貫）',1800],['上にぎり（10貫）',2800],['刺身盛り合わせ',1980]]],
  ['mori','丼',[],[['海鮮丼',1600],['ちらし寿司',1500]]],
  ['side','一品',[],[['茶碗蒸し',400],['あら汁',350],['天ぷら盛り',1100],['枝豆',380]]],
  ['side','お酒',[],[['生ビール',600],['日本酒（1合）',700],['焼酎',550]],1],
  ['side','ソフトドリンク',[],[['ウーロン茶',300]]]],
 prof:{cnt:[22,36],hours:{11:3,12:6,13:5,17:2,18:6,19:8,20:7,21:3},pax:[2,5,2,3],mix:{nigiri:4.5,mori:.3,side:1.2},to:.12,off:3,wk:1.4,sex:[4,2,4],age:[0,1,3,4,4,4]}},
{id:'bar',label:'バー・スナック',mark:'Bar',name:'見本のバー',sub:'BAR',colors:col('#6a3f8f','#eee4f5','#1b1722','#bf96e3','#2b1c3a','#100d15'),
 seats:seats(['カウンター',8],['ボックス',2]),note:'薄め・氷なし など',tabs:[['drink','お酒'],['food','フード'],['etc','チャージ・その他']],
 groups:{wari:{label:'飲み方',type:'one',opts:[['ロック',0],['水割り',0],['ソーダ割り',0],['ストレート',0]]}},
 menu:[['drink','ウイスキー',['wari'],[['ハイボール',700],['国産ウイスキー',800],['バーボン',900],['スコッチ',1000],['シングルモルト',1500]],1],
  ['drink','カクテル',[],[['ジントニック',800],['モスコミュール',800],['カシスオレンジ',750],['モヒート',900],['マティーニ',1000]],1],
  ['drink','ビール・ワイン',[],[['生ビール',700],['グラスワイン',800],['ボトルワイン',4500]],1],
  ['drink','焼酎',['wari'],[['芋焼酎',700],['麦焼酎',700]],1],
  ['drink','ソフトドリンク',[],[['ウーロン茶',500],['ジンジャーエール',500]]],
  ['food','おつまみ',[],[['ミックスナッツ',500],['チーズ盛り合わせ',900],['生ハム',900],['チョコレート',500],['ピザ',1000],['ソーセージ',800]]],
  ['etc','チャージ',[],[['チャージ（1名）',500],['セット料金（60分）',3000],['カラオケ（1曲）',200]]],
  ['etc','ボトルキープ',[],[['焼酎ボトル',4000],['ウイスキーボトル',8000]],1]],
 prof:{cnt:[14,24],hours:{19:2,20:5,21:8,22:9,23:8,0:4},pax:[4,4,2,1],mix:{drink:2.8,food:.6,etc:1},to:0,off:0,wk:1.5,sex:[6,2,2],age:[0,2,3,4,4,3]}},
{id:'italian',label:'イタリアン・洋食',mark:'洋',name:'見本の洋食店',sub:'TRATTORIA',colors:col('#3c7a4b','#e4f1e7','#1e2520','#86cc97','#1c3524','#0f1511'),
 seats:seats(['テーブル',7],['カウンター',3],['テイクアウト',1]),note:'にんにく抜き・ソース別添え など',tabs:[['food','前菜・メイン'],['pasta','パスタ・ピザ'],['drink','ドリンク・デザート']],
 groups:{ryo:{label:'量',type:'one',opts:[['大盛り',200]]},set:{label:'セット',type:'one',opts:[['サラダセット',300],['ドリンクセット',250],['デザートセット',400]]},yaki:{label:'焼き加減',type:'one',opts:[['レア',0],['ミディアム',0],['ウェルダン',0]]}},
 menu:[['food','前菜',[],[['シーザーサラダ',780],['カプレーゼ',850],['生ハム盛り合わせ',1100],['アヒージョ',880],['バゲット',300],['フライドポテト',550]]],
  ['food','メイン',['set'],[['ハンバーグ',1300],['チキンのグリル',1400],['オムライス',1100],['ドリア',1000]]],
  ['food','ステーキ',['yaki','set'],[['牛ステーキ',2400]]],
  ['pasta','パスタ',['ryo','set'],[['ミートソース',1000],['カルボナーラ',1200],['ペペロンチーノ',950],['ナポリタン',950],['ボンゴレ',1250],['明太子クリーム',1150]]],
  ['pasta','ピザ',[],[['マルゲリータ',1300],['クアトロフォルマッジ',1500],['ビスマルク',1450]]],
  ['drink','お酒',[],[['グラスワイン（赤）',600],['グラスワイン（白）',600],['ボトルワイン',3500],['生ビール',600],['サングリア',650]],1],
  ['drink','ソフトドリンク',[],[['コーヒー',400],['紅茶',400],['オレンジジュース',400],['ジンジャーエール',400]]],
  ['drink','デザート',[],[['ティラミス',550],['パンナコッタ',500],['ジェラート',450]]]],
 prof:{cnt:[30,48],hours:{11:3,12:7,13:6,14:2,18:5,19:8,20:7,21:3},pax:[2,6,2,3],mix:{food:.9,pasta:.8,drink:1.1},to:.06,off:1,wk:1.4,sex:[2,5,3],age:[1,4,4,3,2,1]}},
{id:'crepe',label:'クレープ・スイーツ・テイクアウト',mark:'甘',name:'見本のクレープ店',sub:'CREPE & SWEETS',colors:col('#c4487a','#fbe6ee','#2a1b22','#f08db3','#3d1a29','#150d11'),
 seats:seats(['テイクアウト',5],['店内',2]),note:'クリーム少なめ・ソース多め など',tabs:[['sweet','甘いクレープ'],['meal','おかず・その他'],['drink','ドリンク']],
 groups:{top:{label:'トッピング',type:'multi',opts:[['生クリーム増量',100],['アイス',150],['チョコソース',50],['カスタード',80],['バナナ',100],['いちご',150]]},temp:{label:'ホット／アイス',type:'req',opts:[['ホット',0],['アイス',0]]}},
 menu:[['sweet','定番',['top'],[['チョコバナナ',550],['いちご生クリーム',650],['カスタード生クリーム',500],['シュガーバター',400],['キャラメルナッツ',580]]],
  ['sweet','人気',['top'],[['ブルーベリーチーズ',650],['抹茶あずき',620],['アイス入りチョコバナナ',700],['プリンアラモード',720]]],
  ['meal','おかずクレープ',[],[['ツナサラダ',550],['ハムチーズ',550],['照り焼きチキン',620],['ウインナー',520]]],
  ['meal','その他',[],[['ソフトクリーム',400],['ワッフル',450],['ポテト',350]]],
  ['drink','コーヒー・紅茶',['temp'],[['コーヒー',350],['カフェラテ',420],['紅茶',350]]],
  ['drink','冷たい飲み物',[],[['タピオカミルクティー',550],['いちごミルク',450],['コーラ',250],['オレンジジュース',250]]]],
 prof:{cnt:[60,95],hours:{11:2,12:4,13:6,14:8,15:10,16:9,17:7,18:5,19:3},pax:[5,4,1,1],mix:{sweet:.8,meal:.25,drink:.45},to:.85,off:2,wk:1.7,sex:[2,6,2],age:[5,5,3,2,1,0]}}
];

/* ---------- 画面の中だけで動くデータ置き場（閉じると消える） ---------- */
function memDB(){
  const T={},L=[];
  const prune=v=>{if(v===null||v===undefined)return undefined;if(Array.isArray(v)){const a=v.map(prune).filter(x=>x!==undefined);return a.length?a:undefined}
    if(typeof v==='object'){const o={};for(const k in v){const x=prune(v[k]);if(x!==undefined)o[k]=x}return Object.keys(o).length?o:undefined}return v};
  const get=p=>p.reduce((a,k)=>a==null?undefined:a[k],T);
  const snap=p=>{const v=get(p);return {val:()=>v===undefined?null:JSON.parse(JSON.stringify(v))}};
  const rel=(a,b)=>{const n=Math.min(a.length,b.length);for(let i=0;i<n;i++)if(a[i]!==b[i])return false;return true};
  const fire=p=>L.forEach(l=>{if(!rel(l[0],p)||l[2])return;l[2]=true;setTimeout(()=>{l[2]=false;try{l[1](snap(l[0]))}catch(e){console.error(e)}},0)});
  const put=(p,v)=>{let a=T;p.slice(0,-1).forEach(k=>{a=a[k]=a[k]||{}});v=prune(v);if(v===undefined)delete a[p[p.length-1]];else a[p[p.length-1]]=v;fire(p)};
  const ref=path=>{const p=path.split('/').filter(Boolean);return {child:c=>ref(path+'/'+c),
    on(_,cb){if(path==='.info/connected'){setTimeout(()=>cb({val:()=>true}),30);return}L.push([p,cb,false]);setTimeout(()=>cb(snap(p)),0)},
    once(){return Promise.resolve(snap(p))},
    set(v){put(p,v);return Promise.resolve()},update(v){put(p,{...(get(p)||{}),...v});return Promise.resolve()},remove(){put(p,null);return Promise.resolve()}}};
  return {ref,get:path=>get(path.split('/').filter(Boolean))};
}

/* ---------- 見本のお店の設定と、見本の売上を作る ---------- */
function build(t){
  let n=0;const items=[];
  const menu=t.menu.map(([tab,sec,mods,its,alc])=>({tab,sec,mods,items:its.map(([name,price])=>{const id=t.id.slice(0,2)+(++n),cost=Math.round(price*(alc||/ドリンク|飲み物|コーヒー|紅茶|ラテ/.test(sec)?.24:.32)/10)*10;
    items.push({id,tab,sec,name,price,mods:mods||[],cost,alc:!!alc});return [id,name,price]})}));
  const cfg={id:'demo-'+t.id,name:t.name,short:'デモ',logo:t.name.replace('見本の',''),sub:t.sub+'　見本',addr:'（見本のお店です）',tel:'',taxRate:10,colors:t.colors,
    icon:{text:t.mark,bg:t.colors.bar,fg:'#ffffff',font:'sans'},payments:PAY,seats:t.seats,noteHint:t.note,tabs:t.tabs,groups:t.groups,menu};
  return {cfg,items};
}
const rng=seed=>{let a=seed>>>0;return ()=>{a|=0;a=a+0x6D2B79F5|0;let x=Math.imul(a^a>>>15,1|a);x=x+Math.imul(x^x>>>7,61|x)^x;return ((x^x>>>14)>>>0)/4294967296}};
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const pick=(R,ws)=>{const s=ws.reduce((a,b)=>a+b,0);let x=R()*s;for(let i=0;i<ws.length;i++){x-=ws[i];if(x<0)return i}return ws.length-1};
const SEX=['男性','女性','男女'],AGE=['10代以下','20代','30代','40代','50代','60代以上'],MT=[10,11,14,19,24,27,31,32,28,23,18,12];
function makeSale(R,t,items,at,noTags){
  const P=t.prof,pax=pick(R,P.pax)+1,to=R()<P.to,lines=[],by={};
  for(const tab in P.mix){const pool=items.filter(i=>i.tab===tab);if(!pool.length)continue;
    const want=P.mix[tab]*pax*(to?.7:1),cnt=Math.floor(want)+(R()<want%1?1:0);
    for(let i=0;i<cnt;i++){const it=pool[pick(R,pool.map((_,j)=>1/(1+j*.35)))];by[it.id]=(by[it.id]||0)+1}}
  if(!Object.keys(by).length){const it=items[0];by[it.id]=1}
  let sub=0;for(const id in by){const it=items.find(i=>i.id===id),r=to&&!it.alc?8:10;lines.push({name:it.name,unit:it.price,qty:by[id],r,to,c:it.cost});sub+=it.price*by[id]}
  const tx={};lines.forEach(l=>{tx[l.r]=(tx[l.r]||0)+l.unit*l.qty});
  const taxes=Object.keys(tx).map(Number).sort((a,b)=>b-a).map(r=>({r,amt:tx[r],tax:Math.floor(tx[r]*r/(100+r))}));
  const m=['cash','card','qr'][pick(R,[55,30,15])],recv=m==='cash'?Math.ceil(sub/1000)*1000:sub;
  const s={at,seat:to?(t.seats.find(x=>/テイクアウト|持ち帰り/.test(x))||t.seats[0]):t.seats[Math.floor(R()*t.seats.length)],lines,subtotal:sub,discount:0,total:sub,taxes,tax:taxes.reduce((a,x)=>a+x.tax,0),taxRate:10,
    method:m,pays:[m==='cash'?{m,amt:sub,recv,chg:recv-sub}:{m,amt:sub}],received:recv,change:recv-sub,by:'レジ',void:false};
  if(!noTags&&R()<.8)s.tags={pax,sex:SEX[pax===1?pick(R,[P.sex[0],P.sex[1],0]):pick(R,P.sex)],age:AGE[pick(R,P.age)]};
  return s;
}
function summarize(sales){
  const s={total:0,count:0,pay:{},disc:0,items:[],hours:Array(24).fill(0),hc:Array(24).fill(0),tg:[],gp:0,gps:0,toA:0,tx:[]};const im={},tm={},xm={};
  const tg=(t,tn,o,a,n)=>{const k=t+'|'+o,x=tm[k]||(tm[k]={t,tn,o,c:0,a:0,n:0});x.c++;x.a+=a;x.n+=n};
  sales.forEach(x=>{const h=new Date(x.at).getHours();s.total+=x.total;s.count++;x.pays.forEach(p=>{s.pay[p.m]=(s.pay[p.m]||0)+p.amt});s.hours[h]+=x.total;s.hc[h]++;
    x.taxes.forEach(t=>{const e=xm[t.r]||(xm[t.r]={r:t.r,amt:0,tax:0});e.amt+=t.amt;e.tax+=t.tax});
    if(x.tags){tg('pax','人数','',x.total,x.tags.pax);tg('sex','性別',x.tags.sex,x.total,0);tg('age','年齢層',x.tags.age,x.total,0)}
    x.lines.forEach(l=>{const e=im[l.name]||(im[l.name]={n:l.name,q:0,a:0,g:0,gq:0});e.q+=l.qty;e.a+=l.unit*l.qty;if(l.to)s.toA+=l.unit*l.qty;
      const ex=l.unit*l.qty*100/(100+l.r),g=ex-l.c*l.qty;e.g+=g;e.gq+=l.qty;s.gp+=g;s.gps+=ex})});
  s.items=Object.values(im).map(e=>({...e,g:Math.round(e.g)}));s.tg=Object.values(tm);s.tx=Object.values(xm);s.gp=Math.round(s.gp);s.gps=Math.round(s.gps);return s;
}
function seed(db,t,items,sid){
  const root=db.ref('shops/'+sid),P=t.prof,now=new Date(),hrs=Object.keys(P.hours).map(Number),hw=hrs.map(h=>P.hours[h]);
  root.child('config/menu').set({items});
  const days={},wx={},cash={};
  for(let d=60;d>=1;d--){
    const day=new Date(now.getFullYear(),now.getMonth(),now.getDate()-d),key=dstr(day),dow=day.getDay();if(dow===P.off)continue;
    const R=rng(hash(t.id+key)),w=['晴れ','くもり','雨'][pick(R,[58,24,18])],base=MT[day.getMonth()],hi=Math.round((base+R()*6-3+(w==='雨'?-3:w==='晴れ'?1:-1))*10)/10;
    wx[key]={aw:w,hi,lo:Math.round((hi-6-R()*4)*10)/10,rain:w==='雨'?Math.round((3+R()*25)*10)/10:0,fin:true};
    const f=(dow===5||dow===6?P.wk:dow===0?(P.wk+1)/2:1)*(w==='雨'?(P.to>.5?.62:.78):w==='晴れ'?1.05:1)*(hi>=30&&P.to>.5?1.15:1);
    const cnt=Math.round((P.cnt[0]+R()*(P.cnt[1]-P.cnt[0]))*f),sales=[];
    for(let i=0;i<cnt;i++){const h=hrs[pick(R,hw)];sales.push(makeSale(R,t,items,new Date(day.getFullYear(),day.getMonth(),day.getDate(),h,Math.floor(R()*60)).getTime()))}
    days[key]=summarize(sales);
    const ex=30000+(days[key].pay.cash||0),df=R()<.75?0:[-100,-10,50,-500,100][Math.floor(R()*5)];cash[key]={float:30000,expected:ex,counted:ex+df,diff:df,memo:'',by:'レジ'};
  }
  root.child('days').set(days);root.child('wx').set(wx);root.child('cash').set(cash);
  /* 今日のぶん：少し前までの会計と、いま席に入っている注文 */
  const R=rng(hash(t.id+dstr(now))),today=dstr(now),t0=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(),sales={},n=7+Math.floor(R()*5);
  const ats=Array.from({length:n},()=>Math.max(t0+60000,now.getTime()-Math.floor((15+R()*330)*60000))).sort((a,b)=>a-b);
  ats.forEach((at,i)=>{sales['d'+i]={...makeSale(R,t,items,at),no:i+1,day:today}});
  root.child('sales').set(sales);root.child('cash/'+today).set({float:30000});
  const ord=(seat,min,status,by,src,its)=>({seat,lines:its.map((it,i)=>({k:'k'+seat+i,mid:it.id,name:it.name,unit:it.price,qty:1+(i===0?1:0),note:'',done:false,to:false,r:10,c:it.cost})),status,src,by,dev:'demo-other',at:now.getTime()-min*60000,day:today,paid:false});
  const pool=i=>items[Math.floor(R()*items.length*.6)+i]||items[i];
  root.child('orders').set({o1:ord(t.seats[1],13,'cooking','たなか','staff',[pool(0),pool(1),pool(2)]),o2:ord(t.seats[2]||t.seats[0],4,'cooking','レジ','register',[pool(3),pool(1)])});
}

/* ---------- 使い方ガイド ---------- */
const STEPS=t=>[
 {k:'phone',ti:'スタッフのスマホから注文が届く',do:'下のボタンを押すと、ホールのスタッフがスマホで打った注文が届きます。',why:'席で受けた注文は、音と一緒にレジと厨房の画面に出ます。注文を通しに戻る時間を、そのまま次のお客さんに回せます。スマホやタブレットは、いまお持ちのもので動きます。',act:'phone',actLabel:'スマホからの注文を届かせる',
  ok:(db,sid)=>Object.values(db.get('shops/'+sid+'/orders')||{}).some(o=>o.dev==='demo-phone')},
 {k:'feed',ti:'厨房の画面',do:'上の「オーダー」を押してください。品名を押すと線が引けます。出し終わったら「提供済みにする」を押します。',why:'出し忘れと出し間違いが、目で見て分かります。10分たった注文は時刻が赤くなるので、待たせているお客さんに先に気づけます。',sel:['[data-t="feed"]'],tab:'feed',
  ok:()=>(document.getElementById('main')||{dataset:{}}).dataset.view==='feed'},
 {k:'pay',ti:'会計する',do:'「注文・会計」に戻り、注文のある席を選んで「会計へ進む」。金額を押して「会計を確定」まで進めてみてください。',why:'お釣りは自動で出ます。割り勘も「この2品だけ別で」も、ボタンで分けるだけです。電卓がいらなくなり、会計待ちの列が短くなります。',sel:['[data-a="payok"]','[data-a="pay"]','[data-t="order"]'],tab:'order',
  ok:(db,sid,st)=>Object.values(db.get('shops/'+sid+'/sales')||{}).some(s=>s.at>st.t0)},
 {k:'tax',ti:'店内と持ち帰り',do:'伝票の上の「店内で食べる／持ち帰り」を押してみてください。持ち帰りの品には印が付きます。',why:'税率はボタンに合わせて自動で変わり、レシートの税額も自動で分かれます。2027年4月からは持ち帰りの税率が変わる予定です（法律が決まった場合）。日付を入れておけば、その日に自動で切り替わります。',sel:['.tomode .seg'],tab:'order',
  ok:()=>!!document.querySelector('.tomode [data-v="1"].on')},
 {k:'sales',ti:'売上を見る',do:'上の「売上」を押して、「月」に切り替えてみてください。「‹ 前」で先月も見られます。下までスクロールできます。',why:'閉店後にレシートを集めて電卓をたたく作業がなくなります。雨の日にどれだけ減るか、何曜日の何時が忙しいかが数字で出るので、仕込みの量とシフトを前もって決められます。',sel:['[data-a="per"][data-k="month"]','[data-t="sales"]'],tab:'sales',
  ok:()=>!!document.querySelector('.pernav [data-k="month"].on')},
 {k:'cash',ti:'レジ締め',do:'売上の「日」に戻すと、下に「レジのお金」と「日締め」があります。「日締め（レジ締め）をする」を押してみてください（押しても大丈夫です）。',why:'数えた現金を入れると、あるはずの金額との差がその場で出ます。合わない日は、その日のうちに分かります。値引きや取消は「誰が・いつ」が残るので、お店を任せる時の安心になります。',sel:['[data-a="closeday"]','[data-a="per"][data-k="day"]'],tab:'sales',
  ok:()=>!!document.querySelector('#clCount')},
 {k:'menu',ti:'メニューを自分で直す',do:'上の「設定」を押して、下のほうの「メニューの編集」を見てください。値段を変えて「メニューを保存」を押すと、すぐ反映されます。',why:'値上げ、売り切れ、期間限定の品。どれもその場で自分で直せます。原価を入れておくと、品ごとの粗利が出ます。「よく出るのに、あまり残らない品」が見えてきます。',sel:['[data-a="savemenu"]','[data-t="settings"]'],tab:'settings',
  ok:()=>(document.getElementById('main')||{dataset:{}}).dataset.view==='settings'},
 {k:'end',ti:'おわりに',do:'ここまでが主な使い方です。あとは好きなように触ってみてください。各画面の「？」を押すと、その場で説明が出ます。',why:CONTACT}
];
function guide(t,db,sid){
  const app=document.getElementById('app'),el=document.createElement('div');el.id='guide';app.insertBefore(el,document.getElementById('main'));
  const steps=STEPS(t),st={i:0,open:true,t0:Date.now(),done:{}};el.hidden=true;
  const draw=()=>{const s=steps[st.i],last=st.i===steps.length-1,dn=st.done[s.k];
    el.className=st.open?'open':'';
    el.innerHTML=st.open?`<div class="gbox"><div class="ghead"><span class="gnum">${st.i+1}<small>/${steps.length}</small></span><b>${esc(s.ti)}</b>${dn?'<span class="gdone">できました</span>':''}<button class="mini" data-g="fold">たたむ</button></div>
      <p class="gdo">${esc(s.do)}</p>${s.act?`<button class="btn pri gact" data-g="act">${esc(s.actLabel)}</button>`:''}
      <p class="gwhy"><b>こうなります</b>${esc(s.why)}</p>
      <div class="gnav">${st.i?'<button class="btn" data-g="prev">‹ 前へ</button>':'<button class="btn" data-g="home">お店を選び直す</button>'}${last?'<button class="btn" data-g="home">別のお店も見る</button>':`<button class="btn ${dn||!s.ok?'pri':''}" data-g="next">次へ ›</button>`}</div></div>`
      :`<button class="gbar" data-g="fold"><span class="gnum">${st.i+1}<small>/${steps.length}</small></span><b>使い方ガイド：${esc(s.ti)}</b><span>ひらく ▾</span></button>`};
  const go=i=>{st.i=Math.max(0,Math.min(steps.length-1,i));st.open=true;draw()};
  el.addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(!b)return;const g=b.dataset.g;
    if(g==='fold'){st.open=!st.open;draw()}else if(g==='next')go(st.i+1);else if(g==='prev')go(st.i-1);else if(g==='home')location.reload();
    else if(g==='act'){const its=(db.get('shops/'+sid+'/config/menu')||{}).items||[],a=its[0],b2=its[Math.min(6,its.length-1)],now=Date.now();
      db.ref('shops/'+sid+'/orders/ph'+now).set({seat:t.seats[3]||t.seats[0],lines:[a,b2].map((it,i)=>({k:'p'+now+i,mid:it.id,name:it.name,unit:it.price,qty:i?1:2,note:'',done:false,to:false,r:10,c:it.cost||0})),status:'new',src:'staff',by:'さとう',dev:'demo-phone',at:now,day:dstr(new Date()),paid:false})}});
  draw();
  setInterval(()=>{if(el.hidden)return;const s=steps[st.i];
    document.querySelectorAll('.gpulse').forEach(x=>x.classList.remove('gpulse'));
    if(st.open&&s.sel&&!st.done[s.k]&&!document.querySelector('.helpov')){for(const q of s.sel){const x=[...document.querySelectorAll(q)].find(n=>n.offsetParent&&!n.disabled);if(x){x.classList.add('gpulse');break}}}
    if(s.ok&&!st.done[s.k]){let ok=false;try{ok=s.ok(db,sid,st)}catch(e){}if(ok){st.done[s.k]=true;draw()}}
  },600);
  return {begin(open){el.hidden=false;st.open=open!==false;st.t0=Date.now();draw()}};
}


/* ---------- はじめの手ほどき：押す場所を、画面の上でそのまま示す ---------- */
function coach(t,db,sid,items,onEnd){
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const vis=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0};
  const q=sel=>[...document.querySelectorAll(sel)].find(vis)||null;
  const tab0=t.tabs[0][0],pool=items.filter(i=>i.tab===tab0);
  const it=pool.find(i=>i.mods.length&&!i.mods.some(g=>t.groups[g].type==='req'))||pool.find(i=>i.mods.length)||pool[0];
  let F={t0:Date.now()},timer=null,lastEl=null,lastTxt='';
  const mk=(c,h)=>{const d=document.createElement('div');d.className=c;if(h)d.innerHTML=h;document.body.appendChild(d);return d};
  const ring=mk('cring'),tip=mk('ctip'),cur=mk('ccur'),block=mk('cblock','<button class="btn" data-c="stop">お手本を止める</button>');
  [ring,tip,cur,block].forEach(x=>{x.hidden=true});
  document.addEventListener('click',e=>{const x=e.target;if(!x.closest)return;
    if(x.closest('.seat'))F.seat=1;if(x.closest('[data-a="qty"][data-d="1"]'))F.qty=1;if(x.closest('#modal .chip[data-a="mod"]')&&document.querySelector('#modal [data-a="xdel"]'))F.opt=1},true);
  document.addEventListener('input',e=>{if(e.target.id==='itemNote')F.opt=1},true);
  const sent=()=>Object.values(db.get('shops/'+sid+'/orders')||{}).some(o=>o.at>F.t0&&!String(o.dev).startsWith('demo-'));
  /* いまの画面を見て、「次に押す場所」を決める */
  function next(){
    if(sent())return null;
    const view=(document.getElementById('main')||{dataset:{}}).dataset.view,modal=q('#modal .sheet'),xok=q('#modal [data-a="xok"]'),editing=!!document.querySelector('#modal [data-a="xdel"]');
    if(modal&&xok){
      if(editing)F.edit=1;
      if(xok.disabled){const g=[...document.querySelectorAll('#modal .grp')].find(g=>g.querySelector('h4 em')&&!g.querySelector('.chip.on')),c=g&&[...g.querySelectorAll('.chip')].find(vis);
        if(c)return {n:editing?4:2,el:c,text:'「'+g.querySelector('h4').firstChild.textContent.trim()+'」を選びます',sub:'「必須」と付いているものは、1つ選びます。'}}
      if(editing&&!F.opt){const cs=[...document.querySelectorAll('#modal .chip[data-a="mod"]')].filter(x=>vis(x)&&!x.classList.contains('on')),c=cs.find(x=>!x.closest('.grp').querySelector('h4 em'))||cs[0];
        if(c)return {n:4,el:c,text:c.closest('.grp').querySelector('h4 em')?'ここで選び直せます。押してみましょう':'付けたいものを押します',sub:'もう一度押すと外れます。下のメモ欄には「'+t.note.split('・')[0]+'」なども書けます。'};
        F.opt=1}
      return {n:editing?4:2,el:xok,text:editing?'「変更を反映」を押します':'「伝票に追加」を押します',sub:editing?'伝票に戻ります。':'伝票に入ります。'};
    }
    if(modal)return {n:0,el:q('#modal .x')||q('#modal [data-a="close"]'),text:'この画面は、いったん閉じましょう',sub:''};
    if(view!=='order')return {n:0,el:q('[data-t="order"]'),text:'「注文・会計」を押して戻りましょう',sub:''};
    if(!F.seat)return {n:1,el:q('.seat:not(.busy)')||q('.seat'),text:'まず、席を押します',sub:'お客さんが座った席を選ぶだけです。'};
    if(!document.querySelector('#check [data-a="editline"]')){
      const b=q('.item[data-id="'+it.id+'"]');
      if(!b){const back=q('[data-a="hidecheck"]');return back?{n:2,el:back,text:'「← メニュー」を押して戻ります',sub:''}:{n:2,el:q('.cat[data-c="'+tab0+'"]'),text:'「'+t.tabs[0][1]+'」を押します',sub:''}}
      return {n:2,el:b,text:'品を押します',sub:'押すだけで、伝票に入ります。'};
    }
    const plus=q('#check [data-a="qty"][data-d="1"]');
    if(!plus)return {n:3,el:q('#checkBar'),text:'下の伝票を押して、中身を見ます',sub:''};
    if(!F.qty)return {n:3,el:plus,text:'「＋」で数を増やせます',sub:'2つ、3つの注文もすぐです。'};
    if(!F.edit)return {n:4,el:q('#check [data-a="editline"]'),text:'「変更・メモ」を押します',sub:'トッピングや細かい注文は、ここから入れます。'};
    return {n:5,el:q('#check [data-a="send"]'),text:'「注文を送信」を押します',sub:'これで厨房に届きます。'};
  }
  function place(c){
    const el=c.el,txt=c.n+c.text+c.sub;
    if(txt!==lastTxt){lastTxt=txt;tip.innerHTML=`${c.n?`<span class="cnum">${c.n}<small>/5</small></span>`:''}<b>${esc(c.text)}</b>${c.sub?`<p>${esc(c.sub)}</p>`:''}${F.auto?'':'<button class="cskip" data-c="skip">説明を飛ばす</button>'}`}
    if(el!==lastEl){lastEl=el;if(el){const r=el.getBoundingClientRect();if(r.top<70||r.bottom>innerHeight-90)try{el.scrollIntoView({block:'center',behavior:'auto'})}catch(e){}}}
    tip.hidden=false;
    if(!el){ring.hidden=true;tip.style.left=Math.max(12,(innerWidth-tip.offsetWidth)/2)+'px';tip.style.top='72px';tip.dataset.pos='';return}
    const r=el.getBoundingClientRect(),pad=5;ring.hidden=false;
    ring.style.left=(r.left-pad)+'px';ring.style.top=(r.top-pad)+'px';ring.style.width=(r.width+pad*2)+'px';ring.style.height=(r.height+pad*2)+'px';
    const tw=tip.offsetWidth,th=tip.offsetHeight,below=r.bottom+th+18<innerHeight,above=r.top-th-18>0;
    tip.style.left=Math.max(10,Math.min(innerWidth-tw-10,r.left+r.width/2-tw/2))+'px';
    tip.style.top=(below?r.bottom+14:above?r.top-th-14:Math.max(10,innerHeight-th-10))+'px';tip.dataset.pos=below?'below':above?'above':'';
    tip.style.setProperty('--ax',Math.max(18,Math.min(tw-18,r.left+r.width/2-parseFloat(tip.style.left)))+'px');
  }
  const hide=()=>{[ring,tip,cur,block].forEach(x=>{x.hidden=true});lastEl=null;lastTxt=''};
  function card(title,body,btns){
    const o=mk('ccard',`<div class="cbox"><h2>${esc(title)}</h2>${body.map(x=>`<p>${esc(x)}</p>`).join('')}<div class="cbtns">${btns.map(([k,n,pri])=>`<button class="btn ${pri?'pri':''}" data-c="${k}">${esc(n)}</button>`).join('')}</div></div>`);
    return new Promise(res=>o.addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b){o.remove();res(b.dataset.c)}}));
  }
  function finish(skipped){
    clearInterval(timer);timer=null;hide();
    if(skipped){onEnd(false);return}
    card('注文が厨房に届きました',['これで注文は終わりです。伝票を書いて厨房へ持っていく往復が、まるごとなくなります。','聞き間違いや書き間違いも起きにくくなり、席ごとの合計は自動で出ます。'],[['go','つづきを見る',1]]).then(()=>onEnd(true));
  }
  function run(){
    F={t0:Date.now()};hide();
    timer=setInterval(()=>{if(document.querySelector('.helpov')||document.querySelector('.ccard')){ring.hidden=true;tip.hidden=true;return}const c=next();if(!c){finish(false);return}place(c)},250);
  }
  tip.addEventListener('click',e=>{if(e.target.closest('[data-c="skip"]'))finish(true)});
  /* お手本：同じ手順を、画面が自分で動いて見せる */
  async function robot(){
    F={t0:Date.now(),auto:1};block.hidden=false;cur.hidden=false;cur.style.left=(innerWidth/2)+'px';cur.style.top=(innerHeight*.7)+'px';
    block.onclick=e=>{if(e.target.closest('[data-c="stop"]'))F.stop=1};
    await wait(500);
    for(let i=0;i<18&&!F.stop;i++){const c=next();if(!c)break;if(!c.el){await wait(400);continue}
      place(c);const r=c.el.getBoundingClientRect();cur.style.left=(r.left+r.width/2)+'px';cur.style.top=(r.top+r.height/2)+'px';
      await wait(1500);if(F.stop)break;cur.classList.add('tap');c.el.click();await wait(260);cur.classList.remove('tap');await wait(520)}
    const stopped=F.stop;hide();
    if(document.querySelector('#modal .sheet [data-a="close"]')&&stopped)document.querySelector('#modal .sheet [data-a="close"]').click();
    const a=await card(stopped?'お手本を止めました':'いまのが、注文の流れです',['席を押す → 品を押す → 送信。これだけです。','次は、自分の指でやってみましょう。押す場所は画面に出ます。'],[['try','やってみる',1],['free','説明なしで触る']]);
    if(a==='try')run();else onEnd(false);
  }
  card('「'+t.name+'」へようこそ',['本物と同じレジの画面です。好きなように押して大丈夫です。壊れることはありません。','売上の数字は見本です。画面を閉じると、入れた内容は全部消えます。'],[['watch','お手本を見る（約20秒）',1],['try','自分で触ってみる'],['free','説明なしで触る']])
    .then(a=>{if(a==='watch')robot();else if(a==='try')run();else onEnd(false)});
}

/* ---------- 最初の画面：お店を選ぶ ---------- */
function start(t){
  wipe();const {cfg,items}=build(t),sid=cfg.id,db=memDB();
  try{localStorage.setItem('pos.'+sid+'.role','"register"');localStorage.setItem('pos.'+sid+'.wxSkip',JSON.stringify(dstr(new Date())));if(window.DEMO_NOPRINT)localStorage.setItem('pos.'+sid+'.prn','"none"')}catch(e){}
  seed(db,t,items,sid);
  window.POSAuth={ROLE:{manager:'店長',staff:'スタッフ',master:'マスター'},listLogins:async()=>[],msg:()=>''};
  window.startPOS(cfg,sid,db,{shop:sid,role:'manager',login:'demo',uid:'demo',demo:true,auth:{signOut(){location.reload()}},kick(){}});
  const G=guide(t,db,sid);
  coach(t,db,sid,items,ok=>G.begin(ok));
}
function chooser(){
  document.title='POSレジ 体験デモ';
  ROOT.innerHTML=`<div class="dsel"><div class="dselin"><h1>あなたのお店に近いのは？</h1>
    <p>選ぶと、よくあるメニューが入った「見本のお店」が開きます。本物と同じレジの画面を、そのまま触れます。登録もログインもいりません。</p>
    <div class="dgrid">${TYPES.map(t=>`<button class="dcard" data-t="${t.id}" style="--c:${t.colors.accent};--s:${t.colors.accentSoft}"><i>${esc(t.mark)}</i><b>${esc(t.label)}</b><small>${esc(t.menu.slice(0,3).map(m=>m[3][0][0]).join('・'))} など</small></button>`).join('')}</div>
    <p class="dnote">ぴったりの業態がなくても大丈夫です。近いものを選んでください。メニューや席の名前は、お店ごとに自由に変えられます。<br>入れた内容は、この画面を閉じると消えます。</p></div></div>`;
  ROOT.querySelector('.dgrid').addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(b)start(TYPES.find(t=>t.id===b.dataset.t))});
}
const q=new URLSearchParams(location.search).get('t'),pre=TYPES.find(t=>t.id===q);
if(pre)start(pre);else chooser();
})();
