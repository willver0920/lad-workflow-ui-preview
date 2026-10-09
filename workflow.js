'use strict';
// UI discussion model. All transitions stay in memory; there are no external writes.
const companyNames={hawkone:'ホークワン',ohd:'OHD'};
const typeNames={energy:'一次エネルギー計算',bels:'建売BELS'};
const steps=[
 ['received','フォーム受付','自動','overview'],
 ['sheet','スプレッドシートへ転記','自動','overview'],
 ['drive','Driveへ資料保存','自動','overview'],
 ['intakeChat','受付・保存完了をChat通知','自動','progress'],
 ['jpcApproval','JPC依頼内容・添付の承認','担当者','jpc'],
 ['jpcSent','JPCへ登録・送信','自動','jpc'],
 ['delivery','納品ZIPの取得・解凍・Drive保存','自動','delivery'],
 ['calculation','一次計算・完成PDFとXLSの保存','自動','calculation'],
 ['resultChat','計算結果の準備完了をChat通知','自動','progress'],
 ['resultReview','計算結果の確認・修正','担当者','calculation'],
 ['dispatchReview','Cmosy送付内容の確認','担当者','dispatch'],
 ['dispatchSent','Cmosyへ完成PDF・XLSを送信','自動','dispatch'],
 ['archive','物件フォルダ全体を外皮計算済へ移動','自動','dispatch'],
 ['finalChat','Cmosy送信済み・移動完了をChat通知','自動','progress']
];
const projects={
 hawkone:[
  {id:'h1',code:'HK-260108-01',name:'杉並区青葉一丁目 1号棟',branch:'東京第一支店',designer:'山田 太郎',date:'2026/10/08',types:['energy','bels'],stage:4,bels:'書類作成済み',area:'98.42',floors:'2',pref:'東京都'},
  {id:'h2',code:'HK-260107-03',name:'川崎市東町二丁目 3号棟',branch:'神奈川支店',designer:'鈴木 花子',date:'2026/10/07',types:['energy'],stage:6,area:'105.21',floors:'3',pref:'神奈川県'},
  {id:'h3',code:'HK-260107-02',name:'練馬区桜台四丁目 2号棟',branch:'東京第二支店',designer:'佐藤 一郎',date:'2026/10/07',types:['bels'],stage:0,bels:'審査中',area:'92.16',floors:'2',pref:'東京都'},
  {id:'h4',code:'HK-260106-01',name:'船橋市若葉台 1号棟',branch:'千葉支店',designer:'田中 美咲',date:'2026/10/06',types:['energy'],stage:9,area:'101.38',floors:'2',pref:'千葉県'},
  {id:'h5',code:'HK-260105-02',name:'さいたま市緑町 2号棟',branch:'埼玉支店',designer:'高橋 健',date:'2026/10/05',types:['energy','bels'],stage:14,bels:'交付済み',area:'110.52',floors:'2',pref:'埼玉県'},
  {id:'h6',code:'HK-260104-01',name:'世田谷区南台 1号棟',branch:'東京第一支店',designer:'山田 太郎',date:'2026/10/04',types:['energy','bels'],stage:13,bels:'書類作成済み',area:'89.76',floors:'2',pref:'東京都',error:'Cmosyへの送付は完了しています。Google Chatへの完了通知を再実行してください。'}
 ],
 ohd:[
  {id:'o1',code:'OHD-260108-01',name:'横浜市旭町 1号棟',branch:'横浜支店',designer:'伊藤 由紀',date:'2026/10/08',types:['energy'],stage:4,area:'97.32',floors:'3',pref:'神奈川県'},
  {id:'o2',code:'OHD-260107-02',name:'板橋区西台 2号棟',branch:'東京支店',designer:'渡辺 大輔',date:'2026/10/07',types:['energy','bels'],stage:3,bels:'書類作成済み',area:'90.58',floors:'3',pref:'東京都'},
  {id:'o3',code:'OHD-260106-01',name:'川口市青木 1号棟',branch:'埼玉支店',designer:'中村 明',date:'2026/10/06',types:['bels'],stage:0,bels:'審査中',area:'104.16',floors:'2',pref:'埼玉県'},
  {id:'o4',code:'OHD-260105-03',name:'横浜市桜木台 3号棟',branch:'横浜支店',designer:'伊藤 由紀',date:'2026/10/05',types:['energy'],stage:2,area:'99.84',floors:'2',pref:'神奈川県'}
 ]
};
for(const [c,list] of Object.entries(projects))for(const p of list){
 p.company=c;p.email='design@example.com';p.notes='添付図面の内容で計算をお願いします。';
 p.reading={pref:p.pref,floors:p.floors,area:p.area};p.solar='なし';p.revision=1;p.dirty=false;
 p.calc={property:p.name,responsible:'加藤 直樹',main:'30.23',other:'29.81',total:p.area,region:'6',grade:'5',envelope:'297.68',ua:'0.56',etaC:'1.4',etaH:'1.1',heater:'ガス給湯器',solar:p.id==='h4'?'あり':'なし',power:'2.00',direction:'南',tilt:'20',surfaces:'1'};
 for(let i=2;i<=4;i++)Object.assign(p.calc,{['power'+i]:'1.00',['direction'+i]:'東',['tilt'+i]:'20'});
 p.jpc={property:p.name,code:p.code,contact:'LAD',deadline:'JPC登録当日',time:'当日中',notification:'ho-lad@lad-walkthelife.com',remarks:'ホークワン',files:['意匠図一式.pdf','意匠CADデータ.cdexm']};
 p.events=[];p.extraFiles=[];p.sendTemplate='standard';p.sendMessage='';
 p.deliveryFiles=['外皮計算書.pdf','居室区画図.pdf','1階平面図.pdf','太陽光割付図.pdf'];
}
let company='hawkone',query='',type='all',phase='all',filter='all';
const app=document.querySelector('#app'),dialog=document.querySelector('#preview');
const selectedProjects=new Set();
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const flow=p=>p.company==='ohd'?steps.slice(0,4):steps;
const folder=p=>p.company==='ohd'?`${p.name}_${p.date.replaceAll('/','-')}`:`${p.code}-${p.name}`;
const archiveFolder='_□外皮計算済';
const currentFolder=p=>p.company==='hawkone'&&p.stage>=13?`${archiveFolder} / ${folder(p)}`:folder(p);
const resultFolder=p=>`${currentFolder(p)} / 外皮計算・1次エネルギー計算`;
const resultFile=p=>`${p.calc.property}_一次エネルギー計算.pdf`;
const cmosyDestination='ml-ho-syoene-request@openhouse-group.com';
const cmosyTemplateName='外皮計算・一次エネルギー計算の納品';
// Completed calculation outputs only. Delivery originals and template XML are separate.
const dispatchFiles=p=>p.sentFiles||[resultFile(p),p.calc.property+'_一次エネルギー計算.xls'];
const href=(p,workflow='energy',section='overview')=>`#property/${p.company}/${p.id}/${workflow}/${section}`;
const badge=(label,status='progress')=>`<span class="status ${status}">${e(label)}</span>`;
function state(p){
 if(!p.types.includes('energy'))return {label:'未受付',tone:'neutral',group:'none'};
 if(p.error)return {label:'Cmosy送信済み・Chat通知エラー',tone:'error',group:'review'};
 if(p.dirty)return {label:'修正あり・再計算待ち',tone:'review',group:'review'};
 if(p.stage>=flow(p).length)return {label:p.company==='ohd'?'転記・保存・通知完了':'Cmosy送信済み',tone:'done',group:'done'};
 const labels={0:'フォーム受付待ち',1:'スプシ転記中',2:'Drive保存中',3:'受付Chat通知待ち',4:'JPC承認待ち',5:'JPC送信中',6:'JPC納品待ち',7:'計算・保存中',8:'計算完了Chat通知待ち',9:'計算結果の確認待ち',10:'Cmosy送付確認待ち',11:'Cmosy送付中',12:'Cmosy送信済み・フォルダ移動待ち',13:'Cmosy送信済み・Chat通知待ち'};
 return {label:labels[p.stage],tone:[4,9,10].includes(p.stage)?'review':'progress',group:[4,9,10].includes(p.stage)?'review':'ongoing'};
}
const status=p=>{const s=state(p);return badge(s.label,s.tone)};
function progressGroups(p){
 const groups=[];
 if(type!=='bels'&&p.types.includes('energy'))groups.push(state(p).group);
 if(type!=='energy'&&p.types.includes('bels'))groups.push(p.bels==='交付済み'?'done':p.bels==='審査中'?'ongoing':'review');
 return groups;
}
function header(){return `<header><nav aria-label="業務メニュー"><div class="menu-wrap"><button class="navbutton company" id="company-button" aria-expanded="false" aria-controls="company-menu"><span class="mark">${company==='ohd'?'O':'H'}</span>${companyNames[company]}<span class="arrow">⌄</span></button><div class="menu" id="company-menu" hidden><small>管理する会社を切り替え</small>${Object.entries(companyNames).map(([key,name])=>`<a href="#list/${key}" class="${company===key?'chosen':''}">${name}</a>`).join('')}</div></div><a class="navbutton nav-item active" href="#list/${company}">物件一覧</a><div class="menu-wrap"><button class="navbutton nav-item" id="forms-button" aria-expanded="false" aria-controls="forms-menu">受付フォーム <span class="arrow">⌄</span></button><div class="menu" id="forms-menu" hidden><small>取引先向け受付フォーム</small><a href="https://${company==='ohd'?'ohd':'hawkone'}-demo.onrender.com/request" target="_blank" rel="noopener">建売BELS申請 ↗</a><a href="./form-${company}.html" target="_blank" rel="noopener">外皮・一次エネルギー計算依頼 ↗</a></div></div><div class="nav-right"><span style="font-size:14px;color:white;font-weight:600">管理画面</span></div></nav></header>`}
const footer=()=>'<footer class="footer"><span>株式会社LAD</span><span>物件管理</span></footer>';
function bindHeader(){for(const kind of ['company','forms'])$('#'+kind+'-button').onclick=()=>{const m=$('#'+kind+'-menu'),open=m.hidden;closeMenus();m.hidden=!open;$('#'+kind+'-button').setAttribute('aria-expanded',String(open))}}
function closeMenus(){$$('.menu').forEach(m=>m.hidden=true);$$('[aria-controls$="-menu"]').forEach(b=>b.setAttribute('aria-expanded','false'))}
document.addEventListener('click',event=>{if(!event.target.closest('.menu-wrap'))closeMenus()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenus()});
function modal(title,body){$('#preview-title').textContent=title;$('#preview-body').innerHTML=body;dialog.showModal()}
$('#close-preview').onclick=()=>dialog.close();
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;setTimeout(()=>$('#toast').hidden=true,3200)}
const facts=items=>`<dl class="bels-facts">${items.map(([k,v])=>`<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join('')}</dl>`;
const card=(title,body,extra='')=>`<section class="card bels-card ${extra}"><h2 class="bels-card-title">${title}</h2><div class="bels-card-body">${body}</div></section>`;
const demoNote='<p class="quiet action-note">操作確認用です。外部への送信や保存は行わず、この画面内の進捗だけ更新します。</p>';
function documents(names){return names.map(name=>`<div class="document"><span class="doc-icon">${e(name.split('.').pop().toUpperCase())}</span><div><strong>${e(name)}</strong><span class="sub">対象物件の資料</span></div><button class="button" data-doc="${e(name)}">確認</button></div>`).join('')}
function progress(p,compact=false){return `<ol class="workflow-checklist">${flow(p).map(([key,label,owner,section],i)=>`<li class="${i<p.stage?'complete':i===p.stage?'current':''} ${p.error&&i===p.stage?'failed':''}"><a href="${href(p,'energy',section)}"><span class="step-dot">${i<p.stage?'✓':i+1}</span><span class="step-label">${label}<small>${i<p.stage?'完了':i===p.stage?(p.error?'通知失敗':owner==='担当者'?'確認待ち':'処理待ち'):'未着手'}</small></span><span class="owner ${owner==='担当者'?'human':''}">${owner}</span></a></li>`).join('')}</ol>${compact?'':`<p class="quiet">担当者の承認が必要な工程では、自動処理をいったん止めます。</p>`}`}
function renderList(){
 document.title=`${companyNames[company]} 物件一覧 | 管理画面`;
 const list=projects[company].filter(p=>type==='all'||p.types.includes(type)),counts={all:list.length,review:list.filter(p=>progressGroups(p).includes('review')).length,ongoing:list.filter(p=>progressGroups(p).includes('ongoing')).length,done:list.filter(p=>progressGroups(p).includes('done')).length};
 app.innerHTML=header()+`<main class="container"><div class="breadcrumb">${companyNames[company]} / 物件管理</div><div class="heading"><div><h1>物件一覧<span class="count">全 ${list.length} 件</span></h1><p>一次エネルギー計算と建売BELSの進捗を、物件ごとに確認できます。</p></div><span class="quiet">受付日の新しい順</span></div><section class="card"><div class="filters"><label class="search"><span>⌕</span><input aria-label="物件名・工番・担当者で検索" placeholder="物件名・工番・担当者で検索" value="${e(query)}"></label><select id="type-filter" aria-label="依頼種別"><option value="all">すべての依頼種別</option><option value="energy">一次エネルギー計算</option><option value="bels">建売BELS</option></select><select id="phase-filter" aria-label="一次エネルギー計算の工程"><option value="all">すべての工程</option><option value="intake">受付・転記・保存・通知</option>${company==='hawkone'?'<option value="jpc">JPC承認・納品待ち</option><option value="calculation">計算・結果確認</option><option value="dispatch">Cmosy送付・完了通知</option>':''}</select><button class="button" id="clear-filter">条件をクリア</button></div><div class="filter-tabs" aria-label="業務の進捗で絞り込み">${[['all','すべて'],['review','確認・対応待ち'],['ongoing','自動処理・納品待ち'],['done','完了']].map(([key,label])=>`<button data-filter="${key}" class="${filter===key?'active':''}" aria-pressed="${filter===key}">${label}<b>${counts[key]}</b></button>`).join('')}</div><div class="table-scroll"><table class="original-project-table"><thead><tr><th><input type="checkbox" id="select-all" aria-label="表示中の物件をすべて選択"></th><th>#</th><th>物件名</th><th>設計担当者</th><th>棟番号・工番</th><th>一次エネルギー計算</th><th>建売BELS</th><th>受付日</th><th></th></tr></thead><tbody id="rows"></tbody></table></div><div class="table-bottom"><span id="result-count" role="status"></span><span class="page-number">1</span></div></section></main>`+footer();
 bindHeader();$('#type-filter').value=type;$('#phase-filter').value=phase;$('#phase-filter').disabled=type==='bels';
 $('.search input').oninput=ev=>{query=ev.target.value;renderRows()};$('#type-filter').onchange=ev=>{type=ev.target.value;phase='all';renderList()};$('#phase-filter').onchange=ev=>{phase=ev.target.value;renderRows()};
 $('#clear-filter').onclick=()=>{query='';type=phase=filter='all';renderList()};$$('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderList()});renderRows();
}
function renderRows(){
 const q=query.normalize('NFKC').toLowerCase();
 const rows=projects[company].filter(p=>(type==='all'||p.types.includes(type))&&(filter==='all'||progressGroups(p).includes(filter))&&(phase==='all'||p.types.includes('energy')&&(phase==='intake'?p.stage<4||company==='ohd':phase==='jpc'?p.stage>=4&&p.stage<7:phase==='calculation'?p.stage>=7&&p.stage<10:p.stage>=10))&&`${p.name} ${p.code} ${p.designer}`.normalize('NFKC').toLowerCase().includes(q));
 $('#rows').innerHTML=rows.map(p=>`<tr><td><input type="checkbox" data-select="${p.id}" ${selectedProjects.has(p.id)?'checked':''} aria-label="${e(p.name)}を選択"></td><td>${(company==='hawkone'?100:200)+Number(p.id.slice(1))}</td><td><a class="property" href="${href(p,p.types.includes('energy')?'energy':'bels')}">${e(p.name)}</a></td><td>${e(p.designer)}</td><td>${e(p.code)}</td><td><a href="${href(p)}">${status(p)}</a></td><td><a href="${href(p,'bels')}">${badge(p.bels||'未受付',p.bels==='交付済み'?'done':p.bels?'wait':'neutral')}</a></td><td>${p.date}</td><td><a class="compact-detail" href="${href(p,type==='bels'?'bels':p.types[0])}" aria-label="${e(p.name)}の詳細">詳細</a></td></tr>`).join('')||'<tr><td colspan="9" class="empty">条件に一致する物件はありません。</td></tr>';
 $('#result-count').textContent=`${rows.length} 件を表示`;
 function update(){const n=rows.filter(p=>selectedProjects.has(p.id)).length;$('#select-all').checked=rows.length>0&&n===rows.length;$('#select-all').indeterminate=n>0&&n<rows.length;$('#select-all').disabled=!rows.length}
 $('#select-all').onchange=ev=>{rows.forEach(p=>ev.target.checked?selectedProjects.add(p.id):selectedProjects.delete(p.id));renderRows()};$$('[data-select]').forEach(b=>b.onchange=()=>{b.checked?selectedProjects.add(b.dataset.select):selectedProjects.delete(b.dataset.select);update()});update();
}
function nextAction(p){
 if(p.stage>=flow(p).length)return {section:'progress',label:'完了履歴を確認'};
 const step=flow(p)[p.stage];return {section:p.dirty?'calculation':step[3],label:p.dirty?'修正内容を再計算':({jpc:'JPCの依頼内容を確認',delivery:'納品取得状況を確認',calculation:'計算結果を確認・修正',dispatch:'Cmosy送付内容を確認',progress:'通知状況を確認',overview:'転記・保存状況を確認'})[step[3]]};
}
function overview(p){
 const attachments=['意匠図一式.pdf','意匠CADデータ.cdexm',...(p.company==='ohd'?['仕様書.pdf','構造図.pdf']:[])];
 return `<div class="bels-columns"><div>${card('依頼概要',facts([['物件名',p.name],['設計担当者',p.designer],['支店名',p.branch],['工番・棟番号',p.code],['受付日',p.date],['納品メールアドレス',p.email],['依頼内容',p.notes]]))}${card('転記・保存・通知',`<div class="receipt-stages">${flow(p).slice(0,4).map((s,i)=>`<div class="${i<p.stage?'complete':''}"><span>${i<p.stage?'✓':'○'}</span>${s[1]}<small>${i<p.stage?'完了':'待機中'}</small></div>`).join('')}</div>`+facts([['転記先',companyNames[p.company]+' 管理台帳'],['資料保存フォルダ',currentFolder(p)],...(p.company==='hawkone'?[['計算資料・結果',resultFolder(p)]]:[])])+`<div class="bels-actions gap-top"><button class="button" id="sheet-review">転記内容を確認</button><a class="button" href="${href(p,'energy','progress')}">Chat通知を確認</a></div>`)}${card('受付資料',documents(attachments))}</div><div>${card('進捗チェックリスト',progress(p,true))}</div></div>`;
}
function pdfPanel(p){return card('受付フォームのPDF読取情報',`<p class="muted">読取対象：意匠図一式.pdf。入力された物件名は受付フォームの内容を優先します。</p><div class="table-scroll gap-top"><table class="reading-table"><thead><tr><th>項目</th><th>確認値</th><th>読取元・根拠</th></tr></thead><tbody><tr><td>物件名</td><td>${e(p.name)}</td><td>受付フォーム</td></tr><tr><td>都道府県</td><td>${e(p.reading.pref)}</td><td>意匠図一式.pdf / 工事概要・住所</td></tr><tr><td>階数</td><td>${e(p.reading.floors)}階</td><td>意匠図一式.pdf / 申請建物・各階平面図</td></tr><tr><td>延床面積</td><td>${e(p.reading.area)} m²</td><td>意匠図一式.pdf / 面積表</td></tr></tbody></table></div><div class="bels-actions gap-top"><button class="button" data-doc="意匠図一式.pdf">根拠の図面を確認</button><button class="button" id="reading-edit">読取値を修正</button></div>`)}
function chatCard(p,key,title,index,text,section){const done=p.stage>index,failed=!!p.error&&p.stage===index;return `<div class="chat-message"><div class="chat-title">${title}${badge(failed?'通知失敗':done?'通知済み':'未通知',failed?'error':done?'done':'neutral')}</div><p>${e(text)}</p><a href="${href(p,'energy',section)}">${e(p.name)}の管理画面を開く →</a>${failed?'<div class="gap-top"><button class="button primary" id="retry-chat">Chat通知のみ再実行</button><p class="quiet">Cmosyへのファイル再送付は行いません。</p></div>':''}</div>`}
function progressPanel(p){return `<div class="bels-columns"><div>${card('進捗チェックリスト',progress(p))}</div><div>${card('Google Chat通知',chatCard(p,'intake','受付・保存完了',3,`${p.name}の受付、スプレッドシート転記、Drive保存が完了しました。${p.company==='hawkone'?'JPC依頼内容と添付資料を確認してください。':''}`,p.company==='hawkone'?'jpc':'overview')+(p.company==='hawkone'?chatCard(p,'result','計算結果の準備完了',8,`${p.name}の完成PDF・XLSを取得し、${resultFolder(p)}に保存しました。計算結果を確認してください。`,'calculation')+chatCard(p,'final','Cmosy送信済み・移動完了',13,`${p.name}の計算フォルダ内の全ファイルをCmosyへアップロード・送信し、物件フォルダ全体を外皮計算済フォルダへ移動しました。送付内容と保存結果を確認できます。`,'dispatch'):''))}${p.events.length?card('この画面での操作履歴',`<ul class="event-list">${p.events.slice().reverse().map(x=>`<li>${e(x)}</li>`).join('')}</ul>`):''}</div></div>`}
function jpcPanel(p){
 const sent=p.stage>=6;
 return `<div class="bels-columns"><div>${card('JPCへ入力する依頼内容',facts([['物件名',p.jpc.property],['物件コード・工番',p.jpc.code],['担当者名',p.jpc.contact],['希望納期',p.jpc.deadline+' '+p.jpc.time],['納品通知先',p.jpc.notification],['備考',p.jpc.remarks]])+`<p class="quiet gap-top">納期の日付は、承認後にJPCへ登録する当日を設定します。</p><button class="button gap-top" id="jpc-edit" ${sent?'disabled':''}>依頼内容を修正</button>`)}${card('JPCへ添付するファイル',`<p class="muted">Driveの「${e(folder(p))}」に保存された資料を添付します。</p>`+documents(p.jpc.files))}</div><div>${card('JPC依頼状況',facts([['ステータス',sent?'JPCへ送信済み':p.stage>=4?'担当者の承認待ち':'受付・転記・保存の完了待ち'],['登録番号',sent?'JPC-DEMO-'+p.id.toUpperCase():'未登録'],['重複送信',sent?'送信済みのため再送信不可':'登録結果を確認して記録']])+`<div class="approval-box"><h3>内容と添付を確認してから依頼</h3><p>承認すると、JPCへのログイン、フォーム入力、添付、依頼送信を順番に実行します。</p><div class="check-line"><label><input type="checkbox" id="jpc-confirm" ${sent?'disabled':''}> 物件名・納期・依頼内容・添付資料を確認しました</label></div><button class="button primary" id="jpc-approve" disabled>${sent?'JPC送信済み':'承認してJPCへ送信'}</button>${demoNote}</div>`)}${card('送信後の流れ','<p>納品通知メールを検知 → 対象物件を照合 → JPCで検索 → 計算資料をダウンロード → 対応する物件フォルダへ保存します。</p><p class="quiet gap-top">同名物件が複数ある場合や照合できない場合は、確認待ちで止めます。</p>')}</div></div>`;
}
function deliveryPanel(p){
 const available=p.stage>=7;
 return '<div class="bels-columns"><div>'+card('納品メールの照合・JPC検索',facts([['監視先','ho-lad@lad-walkthelife.com'],['通知件名','＜JPC WebOrder＞納品のお知らせ'],['対象物件',p.name],['照合条件','本文の物件名・物件コードと受付情報を照合'],['検索受付月',p.date.slice(0,7)],['取得するファイル',p.name+'.zip'],['状態',available?'解凍・Drive保存済み':p.stage>=6?'JPCの納品通知待ち':'JPC送信完了後に開始']]))+
 card('Drive内の保存構成',driveTree(p)+'<p class="quiet gap-top">納品ZIPはサーバー側で解凍し、中身をこの物件フォルダへ保存します。完成PDF・XLSは専用フォルダに分けます。</p>')+
 card('解凍した納品資料',available?documents(p.deliveryFiles):'<p class="muted">対象物件の納品を待っています。</p>')+'</div><div>'+
 card('納品から確認通知まで','<ol class="process-sequence"><li><strong>納品メールを検知・照合</strong><span>対象物件と受付月を使ってJPCで検索</span></li><li><strong>ZIPをダウンロード・解凍</strong><span>サーバー内で処理し、解凍した中身をDriveへ保存</span></li><li><strong>納品PDFを読み取り</strong><span>①〜⑫と太陽光情報を取得。建築士登録欄から入力責任者の氏名を抽出</span></li><li><strong>ひな形を読込・計算サイトへ入力</strong><span>給湯器別XMLを読み込み、外皮性能・太陽光まで反映</span></li><li><strong>完成したPDF・XLSをDriveへ保存</strong><span>「外皮計算・1次エネルギー計算」へ保存</span></li><li><strong>Google Chatへ確認通知</strong><span>保存成功後に、この物件の計算確認画面を案内</span></li></ol>')+
 (p.stage===6?card('納品後の画面を確認','<button class="button primary" id="simulate-delivery">納品取得後の計算確認へ進む</button>'+demoNote):'')+'</div></div>';
}
function driveTree(p){return '<div class="folder-tree storage-tree"><strong>Drive / '+e(currentFolder(p))+'</strong><div class="tree-branch"><span>解凍したJPC納品資料</span><small>外皮計算書.pdf・居室区画図.pdf など</small></div><div class="tree-branch result-branch"><strong>外皮計算・1次エネルギー計算</strong><span>'+e(resultFile(p))+'</span><span>'+e(p.calc.property)+'_一次エネルギー計算.xls</span><small>完成した2ファイルをCmosyへ送付</small></div></div>'}
function extractionTable(p){
 const c=p.calc;
 const rows=[['①','給湯器ひな形',c.heater==='ガス給湯器'?'11_ガス給湯器.xml':'13_エコキュート標準型.xml','1階平面図・特記事項の「ガス事業法162条」の有無'],['②','物件名',c.property,'外皮性能計算表の物件名。受付物件と照合'],['③','入力責任者',c.responsible,'PDF下部の建築士登録欄から氏名のみ。代表取締役欄は対象外'],['④','主たる居室',c.main+' m²','居室区画面積表 A／SA'],['⑤','その他の居室',c.other+' m²','居室区画面積表 B／SB'],['⑥','床面積合計',c.total+' m²','居室区画面積表 S。非居室SCを含む'],['⑦','地域区分',c.region+'地域','外皮性能計算表'],['⑧','断熱等性能等級',c.grade,'4以下：誘導仕様基準／5以上：外皮面積を用いて評価'],['⑨','外皮面積',Number(c.grade)>=5?c.envelope+' m²':'入力対象外','⑧が5以上の場合に入力'],['⑩','UA',Number(c.grade)>=5?c.ua:'入力対象外','外皮性能計算表の設計値'],['⑪','ηAC',Number(c.grade)>=5?c.etaC:'入力対象外','冷房期の設計値'],['⑫','ηAH',Number(c.grade)>=5?c.etaH:'入力対象外','暖房期の値']];
 return '<details class="reading-details"><summary>①〜⑫の保存値と読取元を確認</summary><p class="quiet gap-top">読取元：JPCから取得し、解凍した納品資料内のPDF。</p><div class="table-scroll"><table class="reading-table"><thead><tr><th>番号</th><th>項目</th><th>反映値</th><th>読取元・設定条件</th></tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+e(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></details>';
}
const calcGroups=[
 ['基本情報',[['property','② 物件名','text'],['responsible','③ 入力責任者','text'],['main','④ 主たる居室（m²）','number'],['other','⑤ その他の居室（m²）','number'],['total','⑥ 床面積合計（m²）','number'],['region','⑦ 地域区分','region']]],
 ['外皮性能',[['grade','⑧ 断熱等性能等級','grade'],['envelope','⑨ 外皮面積（m²）','number'],['ua','⑩ 外皮平均熱貫流率 UA','number'],['etaC','⑪ 冷房期 ηAC','number'],['etaH','⑫ 暖房期 ηAH','number']]],
 ['設備・太陽光',[['heater','① 給湯器ひな形','heater'],['solar','太陽光発電','solar'],['surfaces','設置面数','surfaces'],['power','システム容量（kW）','number'],['direction','設置方位角（区分）','direction'],['tilt','パネル傾斜角（度）','tilt']]]
];
function additionalSolar(p,locked){return [2,3,4].map(i=>`<div class="solar-face form-grid" data-face="${i}"><h3 class="full">設置面 ${i}</h3>${calcField('power'+i,'システム容量（kW）・面'+i,'number',p.calc['power'+i],locked)}${calcField('direction'+i,'設置方位角・面'+i,'direction',p.calc['direction'+i],locked)}${calcField('tilt'+i,'設置傾斜角（度）・面'+i,'tilt',p.calc['tilt'+i],locked)}</div>`).join('')}
const choices={region:['1','2','3','4','5','6','7','8'],grade:['4','5','6','7'],heater:['ガス給湯器','エコキュート標準型'],solar:['なし','あり','要確認'],surfaces:['1','2','3','4'],direction:['北','北東','東','南東','南','南西','西','北西'],tilt:['0','10','20','30','40','50','60','70','80','90']};
function calcField(key,label,kind,value,disabled){const attr=`name="${key}" ${disabled?'disabled':''} required`;return `<label class="${['envelope','ua','etaC','etaH'].includes(key)?'envelope-field':['surfaces','power','direction','tilt'].includes(key)?'solar-field':''}"><span>${label}</span>${choices[kind]?`<select ${attr}>${choices[kind].map(v=>`<option ${value===v?'selected':''}>${v}</option>`).join('')}</select>`:`<input ${attr} value="${e(value)}" type="${kind}" ${kind==='number'?'min="0" step="0.01"':''}>`}</label>`}
function calculationPanel(p){
 if(p.stage<8)return card('一次エネルギー計算',`<p>JPCの納品資料を取得し、完成PDF・XLSの保存が完了すると確認できます。</p><a class="button gap-top" href="${href(p,'energy','delivery')}">納品資料・取得状況へ</a>`);
 const locked=p.stage>=12;
 return `${extractionTable(p)}${card('計算結果の確認・修正',`<div class="result-summary"><div>${badge(p.dirty?'修正あり・再計算が必要':locked?'送付済み':p.stage>=10?'確認済み':'担当者の確認待ち',p.dirty?'review':p.stage>=10?'done':'review')}<p class="muted gap-top">修正・資料追加 → 計算サイトへ再入力 → 再計算 → PDF・XLSの再取得 → 同じDrive保存先へ差し替えます。</p></div><span class="quiet">保存した計算：第 ${p.revision} 回</span></div><form id="calc-form">${calcGroups.map(([title,fields])=>`<fieldset><legend>${title}</legend><div class="form-grid">${fields.map(([key,label,kind])=>calcField(key,label,kind,p.calc[key],locked)).join('')}</div>${title==='設備・太陽光'?additionalSolar(p,locked):''}${title==='基本情報'?'<p class="quiet gap-top">③はPDF下部の建築士登録欄の氏名のみ。受付の設計担当者名や事務所の代表取締役名とは分けて確認します。</p>':title==='外皮性能'?'<p class="quiet gap-top" id="envelope-method"></p>':title==='設備・太陽光'?'<p class="quiet gap-top">「ガス事業法162条」の記載あり：11_ガス給湯器.xml／記載なし：13_エコキュート標準型.xml。⑧または⑫の設定後、太陽光の有無を確認して計算サイトの「太陽光」タブへ進みます。方位角は傾斜角と同じ行の記載を優先し、設置面ごとに対応づけます。3.5寸 → 19.29度 → 20度。</p>':''}</fieldset>`).join('')}<label class="upload"><strong>修正・追加資料</strong><input id="calc-attachment" type="file" accept=".pdf,.zip" ${locked?'disabled':''}><small>図面・計算資料（50MBまで）</small><span id="attachment-name">${e(p.extraFiles.join('、'))}</span></label><div class="action-strip"><span id="calc-state" role="status">${p.dirty?'未反映の修正があります。再計算・保存してください。':locked?'送付済みのため編集できません。':'保存した計算結果を確認してください。'}</span><button class="button" id="recalculate" type="submit" ${locked?'disabled':''}>再計算してDriveへ保存</button><button class="button primary" id="approve-result" type="button" ${p.dirty||locked?'disabled':''}>計算結果を確認済みにする</button></div>${demoNote}</form>`)}${card('保存済み計算資料',documents([resultFile(p),p.calc.property+'_一次エネルギー計算.xls'])+`<p class="quiet gap-top">保存先：${e(resultFolder(p))}</p>`)}${p.stage>=10&&!locked?`<div class="form-actions"><a class="button primary" href="${href(p,'energy','dispatch')}">Cmosy送付内容の確認へ →</a></div>`:''}`;
}
function defaultMessage(p){return `お世話になっております。\n【${p.name}】の外皮計算・一次エネルギー計算を納品させて頂きます。\n御確認宜しくお願い致します。`}
function archivePanel(p){
 const archived=p.stage>=13,notified=p.stage>=14;
 return card('送信後のフォルダ移動・完了通知',facts([['Cmosy',p.stage>=12?'Cmosy送信済み':'送信待ち'],['移動する対象',folder(p)+'（物件フォルダ全体）'],['移動先','Driveの _□外皮計算済 / '+folder(p)],['フォルダ移動',archived?'物件フォルダ移動済み':p.stage>=12?'フォルダ移動待ち':'Cmosy送信完了後に開始'],['Google Chat',notified?'送信・移動完了を通知済み':p.error?'通知失敗・再実行待ち':'移動完了後に通知']])+`<p class="quiet gap-top">物件フォルダを、中の図面・CAD・計算資料ごと移動します。元のフォルダ名は変えません。</p>${p.stage===12?`<button class="button gap-top" id="archive-preview">物件フォルダの移動完了へ進む</button>${demoNote}`:''}${p.stage===13&&!p.error?`<button class="button primary gap-top" id="final-chat-preview">Google Chatの完了通知へ進む</button>${demoNote}`:''}${driveTree(p)}`);
}
function dispatchPanel(p){
 const ready=p.stage>=10&&!p.dirty,sent=p.stage>=12;
 return `<div class="bels-columns"><div>${card('Cmosyへ送付する内容',`<p class="muted">物件名・届先・伝言メッセージと、計算フォルダ内の全ファイルを確認します。</p><form id="dispatch-form" class="gap-top"><div class="form-grid"><label class="full">届先（Destination）<input value="${e(cmosyDestination)}" readonly></label><label class="full">対象物件<input name="property" value="${e(p.name)}" readonly></label><label class="full">送付テンプレート<select id="send-template" ${!ready||sent?'disabled':''}><option value="standard" selected>外皮計算・一次エネルギー計算の納品</option></select><small class="quiet">ご指定の定型文に物件名を差し込みます。</small></label><label class="full">伝言メッセージ（Receiver to Sender）<textarea id="send-message" rows="7" ${!ready||sent?'disabled':''}>${e(p.sendMessage||defaultMessage(p,p.sendTemplate))}</textarea></label></div><h3 class="gap-top">アップロードする全ファイル（${dispatchFiles(p).length}件）</h3>${ready?documents(dispatchFiles(p)):'<p class="muted gap-top">計算結果の確認が完了すると表示されます。</p>'}<p class="quiet gap-top">取得元：${e(resultFolder(p))}<br>計算完了後に保存したPDF・XLSを送付します。納品ZIP・元の納品資料・ひな形XMLは含めません。</p></form>`)}${sent?card('送付記録',facts([['送付先','Cmosy'],['届先',cmosyDestination],['物件名',p.name],['アップロードファイル',dispatchFiles(p).join('、')],['送付状態','Cmosy送信済み'],['Google Chat',p.stage>=14?'完了通知済み':p.error?'通知失敗・再実行待ち':'通知待ち']])):''}</div><div>${archivePanel(p)}${card('送付前の確認',`${!ready?'<div class="note">先に計算結果を確認し、修正がある場合は再計算・保存してください。</div>':''}<ol class="plain-steps"><li>物件名・届先と全ファイルの一覧を確認</li><li>テンプレートと送付文を確認</li><li>確認画面で「Cmosyへ送信」を押す</li><li>自動ログイン・伝言入力・全ファイルのアップロード・送信</li><li>外皮計算済フォルダへ移動</li><li>送付・移動完了をGoogle Chatへ通知</li></ol><button class="button primary" id="dispatch-preview" ${!ready||sent?'disabled':''}>${sent?'Cmosy送信済み':'送付内容の最終確認へ'}</button>${demoNote}`)}${card('Google Chatへの完了報告',`<p>Cmosy側の送付完了と「外皮計算済」フォルダへの移動完了を確認してから、物件名・アップロードした全ファイル・移動結果・管理画面へのリンクを通知します。</p><p class="quiet gap-top">Cmosy送信・フォルダ移動・Chat通知を別々に記録します。移動に失敗した場合は完了通知へ進まず、通知だけが失敗した場合は通知のみを再実行できます。</p><a class="button gap-top" href="${href(p,'energy','progress')}">通知状況を確認</a>`)}</div></div>`;
}
function belsPanel(p){return `<div class="bels-columns"><div>${card('建売BELSの依頼概要',facts([['物件名',p.name],['設計担当者',p.designer],['棟番号',p.code],['審査機関',p.bels?'UDI':'未受付'],['ZEH',p.bels?'ZEH':'—'],['交付希望日',p.bels?'2026/11/05':'—']]))}</div><div>${card('建売BELSの進捗',`${badge(p.bels||'未受付',p.bels==='交付済み'?'done':'wait')}<p class="muted gap-top">一次エネルギー計算とは別の進捗として管理します。書類作成・申請・審査などは既存の建売BELS機能を使用します。</p><a class="button gap-top" href="https://${p.company==='ohd'?'ohd':'hawkone'}-demo.onrender.com/${p.company==='hawkone'?'projects/1':''}" target="_blank" rel="noopener">既存の建売BELS画面を参考に開く ↗</a><p class="quiet gap-top">既存画面への参照リンクです。このサンプル物件とは紐づいていません。</p>`)}</div></div>`}
function phaseMap(p){
 const groups=p.company==='ohd'?[[0,4,'受付・保存','overview']]:[[0,4,'受付・保存','overview'],[4,6,'JPC依頼','jpc'],[6,9,'納品・計算','delivery'],[9,12,'確認・Cmosy','calculation'],[12,14,'移動・完了','dispatch']];
 return '<nav class="phase-map" aria-label="業務全体の流れ">'+groups.map(([start,end,label,section],i)=>'<a href="'+href(p,'energy',section)+'" class="'+(p.stage>=end?'done':p.stage>=start?'current':'')+'"><b>'+(p.stage>=end?'✓':i+1)+'</b><span>'+label+'</span></a>').join('')+'</nav>';
}
function renderDetail(p,workflow,section){
 document.title=p.name+' | 管理画面';
 const tabs=[['overview','依頼概要'],['pdf','PDF読取情報'],['progress','進捗・Chat通知'],...(company==='hawkone'?[['jpc','JPC依頼'],['delivery','納品資料'],['calculation','計算結果・修正'],['dispatch','Cmosy送付']]:[])];
 if(!tabs.some(t=>t[0]===section))section='overview';
 const next=nextAction(p);
 const sections={overview,pdf:pdfPanel,progress:progressPanel,jpc:jpcPanel,delivery:deliveryPanel,calculation:calculationPanel,dispatch:dispatchPanel};
 app.innerHTML=header()+`<main class="container bels-aligned"><div class="breadcrumb"><a href="#list/${company}">物件一覧</a> / ${e(p.name)}</div><div class="bels-property-heading"><div><h1>${e(p.name)}</h1></div><span class="quiet">${e(p.code)} · ${p.date} 受付</span></div><div class="workflow-switch" role="tablist" aria-label="業務の切替">${Object.entries(typeNames).map(([key,label])=>`<a role="tab" aria-selected="${workflow===key}" class="workflow-tab ${workflow===key?'active':''}" href="${href(p,key)}"><strong>${label}</strong>${key==='energy'?status(p):badge(p.bels||'未受付',p.bels==='交付済み'?'done':p.bels?'wait':'neutral')}</a>`).join('')}</div>${workflow==='energy'&&p.types.includes('energy')?`${phaseMap(p)}<div class="next-action ${p.error?'error':''}"><div><span class="quiet">現在の段階</span><strong>${e(state(p).label)}</strong>${p.error?`<p>${e(p.error)}</p>`:''}${company==='ohd'?'<p>OHDは受付・転記・Drive保存・Chat通知までの進捗を管理します。</p>':''}</div><a class="button primary" href="${href(p,'energy',next.section)}">${next.label} →</a></div><div class="detail-nav" role="tablist" aria-label="物件の確認項目">${tabs.map(([key,label])=>`<a role="tab" aria-selected="${section===key}" class="${section===key?'active':''}" href="${href(p,'energy',key)}">${label}</a>`).join('')}</div><div role="tabpanel">${sections[section](p)}</div>`:workflow==='bels'?belsPanel(p):card('一次エネルギー計算','<p>この物件の一次エネルギー計算はまだ受け付けていません。</p>')}<div class="form-actions"><a class="button" href="#list/${company}">物件一覧へ</a></div></main>`+footer();
 bindHeader();bindDetail(p,section);
}
function record(p,text){p.events.push(new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})+' '+text)}
function redraw(p,section){dialog.close();if(location.hash===href(p,'energy',section))renderDetail(p,'energy',section);else location.hash=href(p,'energy',section)}
function field(name,label,value,type='text'){return `<label><span>${e(label)}</span><input name="${name}" type="${type}" value="${e(value)}" required ${type==='number'?'min="0.01" step="0.01"':''}></label>`}
function bindDetail(p,section){
 $$('[data-doc]').forEach(b=>b.onclick=()=>modal('資料の確認',`<p><strong>${e(b.dataset.doc)}</strong></p><p class="muted gap-top">対象物件：${e(p.name)}</p><div class="note gap-top">このUIデモには実際の資料を含めていません。実装時は、保存済みの資料と読取根拠をここで表示します。</div>`));
 $('#sheet-review')?.addEventListener('click',()=>modal('スプレッドシートへの転記内容',facts([['物件名',p.name],['設計担当者',p.designer],['支店名',p.branch],['メールアドレス',p.email],['工番・棟番号',p.code],['都道府県',p.reading.pref],['階数',p.reading.floors],['延床面積',p.reading.area],['依頼日',p.date]])));
 $('#reading-edit')?.addEventListener('click',()=>{modal('PDF読取値の修正',`<form id="reading-form"><div class="form-grid">${field('pref','都道府県',p.reading.pref)}${field('floors','階数',p.reading.floors,'number')}${field('area','延床面積（m²）',p.reading.area,'number')}</div><p class="quiet gap-top">受付時の読取値を修正します。保存先への再反映は実装時に行います。</p><div class="form-actions"><button class="button primary">修正を保存</button></div>${demoNote}</form>`);$('#reading-form').onsubmit=ev=>{ev.preventDefault();p.reading=Object.fromEntries(new FormData(ev.target));record(p,'受付PDFの読取値を修正');redraw(p,'pdf')}});
 $('#jpc-edit')?.addEventListener('click',()=>{modal('JPC依頼内容の修正',`<form id="jpc-edit-form"><div class="form-grid">${field('property','物件名',p.jpc.property)}${field('code','物件コード・工番',p.jpc.code)}${field('contact','担当者名',p.jpc.contact)}${field('notification','納品通知先',p.jpc.notification,'email')}<label class="full">備考<textarea name="remarks" rows="3">${e(p.jpc.remarks)}</textarea></label></div><div class="form-actions"><button class="button primary">修正を保存</button></div>${demoNote}</form>`);$('#jpc-edit-form').onsubmit=ev=>{ev.preventDefault();Object.assign(p.jpc,Object.fromEntries(new FormData(ev.target)));record(p,'JPC依頼内容を修正');redraw(p,'jpc')}});
 $('#jpc-confirm')?.addEventListener('change',ev=>$('#jpc-approve').disabled=!ev.target.checked||p.stage!==4);
 $('#jpc-approve')?.addEventListener('click',()=>{if(p.stage!==4)return;modal('JPC依頼の最終確認',facts([['物件名',p.jpc.property],['工番',p.jpc.code],['納期','JPC登録当日 当日中'],['添付',p.jpc.files.join('、')]])+`<div class="form-actions"><button class="button primary" id="jpc-final">この内容でJPCへ送信</button></div>${demoNote}`);$('#jpc-final').onclick=()=>{if(p.stage!==4)return;p.stage=6;record(p,'担当者承認 → JPC登録・添付・送信完了（表示例）');redraw(p,'jpc');toast('JPC送信済みの表示に更新しました')}});
 $('#simulate-delivery')?.addEventListener('click',()=>{if(p.stage!==6)return;p.stage=9;record(p,'納品ZIP照合・ダウンロード・解凍・Drive保存 → 一次計算・完成PDFとXLSを保存 → 確認用Chat通知完了（表示例）');redraw(p,'calculation')});
 $('#retry-chat')?.addEventListener('click',()=>{if(p.stage!==13)return;p.error='';p.stage=14;record(p,'Google Chatの送付完了通知を再実行（PDFの再送なし・表示例）');redraw(p,'progress')});
  $('#archive-preview')?.addEventListener('click',()=>{if(p.stage!==12)return;p.stage=13;record(p,'Driveの_□外皮計算済へ物件フォルダ全体を移動完了（表示例）。Google Chat通知待ち');redraw(p,'dispatch');toast('物件フォルダの移動完了。次にChatへ通知します')});
 $('#final-chat-preview')?.addEventListener('click',()=>{if(p.stage!==13||p.error)return;p.stage=14;record(p,'Cmosy送信済み・物件フォルダ移動完了をGoogle Chatへ通知（表示例）');redraw(p,'progress')});
 if($('#calc-form'))bindCalculation(p);
 $('#send-template')?.addEventListener('change',ev=>{p.sendTemplate=ev.target.value;p.sendMessage=defaultMessage(p,p.sendTemplate);$('#send-message').value=p.sendMessage});
 $('#send-message')?.addEventListener('input',ev=>p.sendMessage=ev.target.value);
 $('#dispatch-preview')?.addEventListener('click',()=>{if(p.stage<10||p.stage>=12||p.dirty)return;
  const msg=$('#send-message').value.trim();if(!msg){$('#send-message').focus();toast('送付文を入力してください');return}p.sendMessage=msg;
  const match=p.calc.property.trim()===p.name.trim();
  modal('Cmosy送付の最終確認',facts([['物件名',p.name],['テンプレート',cmosyTemplateName],['届先',cmosyDestination],['ファイル数',dispatchFiles(p).length+'件（フォルダ内の全ファイル）'],['保存先',resultFolder(p)]])+`<h3 class="gap-top">伝言メッセージ</h3><div class="message-preview">${e(msg)}</div><h3 class="gap-top">アップロードファイル一覧</h3><ul>${dispatchFiles(p).map(name=>`<li>${e(name)}</li>`).join('')}</ul>${!match?'<div class="note">計算PDFの物件名が受付情報と一致しません。計算結果で物件名を修正し、再計算・保存してください。</div>':''}<label class="check-line"><input id="dispatch-confirm" type="checkbox"> 物件名・届先・伝言・全ファイルを確認しました</label><div class="form-actions"><button class="button primary" id="dispatch-final" disabled>Cmosyへ送信</button></div>${demoNote}`);
  $('#dispatch-confirm').onchange=ev=>$('#dispatch-final').disabled=!ev.target.checked||!match;
  $('#dispatch-final').onclick=()=>{if(p.stage>=12||p.dirty||!match)return;p.sentFiles=[...dispatchFiles(p)];p.stage=12;p.error='';record(p,'送付内容を確認 → Cmosyへログイン・伝言入力・全ファイルのアップロードと送信完了（表示例）。外皮計算済フォルダへのフォルダ移動待ち');redraw(p,'dispatch');toast('Cmosy送信済み・フォルダ移動待ちの表示に更新しました')};
 });
}
function bindCalculation(p){
 const form=$('#calc-form'),locked=p.stage>=12;
 function conditional(){const grade=Number(form.elements.grade.value),solar=form.elements.solar.value==='あり';$$('.envelope-field').forEach(l=>{l.hidden=grade<5;l.querySelector('input').disabled=locked||grade<5});$$('.solar-field').forEach(l=>{l.hidden=!solar;l.querySelector('input,select').disabled=locked||!solar});$$('.solar-face').forEach(face=>{const show=solar&&Number(face.dataset.face)<=Number(form.elements.surfaces.value);face.hidden=!show;face.querySelectorAll('input,select').forEach(el=>el.disabled=locked||!show)});$('#envelope-method').textContent=grade<=4?'評価方法：誘導仕様基準により外皮性能を評価':'評価方法：当該住戸の外皮面積を用いて外皮性能を評価';}
 function dirty(){if(locked)return;for(const [key,value] of new FormData(form))if(key in p.calc)p.calc[key]=String(value);p.dirty=true;p.stage=Math.min(p.stage,9);$('#approve-result').disabled=true;$('#calc-state').textContent='未反映の修正があります。再計算・保存してください。';conditional()}
 form.addEventListener('input',ev=>{if(ev.target.type!=='file')dirty()});form.addEventListener('change',ev=>{if(ev.target.type!=='file')dirty()});conditional();
 $('#calc-attachment').onchange=ev=>{const file=ev.target.files[0];if(!file)return;if(file.size>50*1024*1024||!(/\.(pdf|zip)$/i.test(file.name))){ev.target.value='';toast('PDFまたはZIPを50MB以内で選択してください');return}p.extraFiles.push(file.name);$('#attachment-name').textContent=p.extraFiles.join('、');dirty()};
 form.onsubmit=ev=>{ev.preventDefault();if(locked||!form.reportValidity())return;if(form.elements.solar.value==='要確認'){toast('太陽光の有無を資料で確認してください');return}for(const [key,value] of new FormData(form))if(key in p.calc)p.calc[key]=String(value);if(Number(p.calc.main)+Number(p.calc.other)>Number(p.calc.total)){toast('居室面積の合計が床面積合計を超えています');return}p.dirty=false;p.revision++;p.stage=9;record(p,'修正値・追加資料で再計算 → PDF・XLSを同じDrive保存先へ差替え（表示例）');redraw(p,'calculation');toast('再計算・保存完了の表示に更新しました')};
 $('#approve-result').onclick=()=>{if(p.dirty||locked||!form.reportValidity())return;if(p.calc.solar==='要確認'){toast('太陽光の有無を資料で確認してください');return}p.stage=10;record(p,'担当者が計算結果を確認');redraw(p,'dispatch')};
}
function route(){const [view,c,id,workflow,section]=location.hash.slice(1).split('/');const nextCompany=c in companyNames?c:'hawkone';if(company!==nextCompany){query='';type=filter=phase='all'}company=nextCompany;dialog.close();if(view==='property'){const p=projects[company].find(x=>x.id===id);if(p)renderDetail(p,workflow==='bels'?'bels':'energy',section||'overview');else{location.hash='list/'+company;return}}else renderList();window.scrollTo(0,0)}
window.addEventListener('hashchange',route);route();

