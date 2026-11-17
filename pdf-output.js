'use strict';
let confirmationOverrides={},laborValues={},sharedRestriction=null;let currentPDFUrl=null;let assetPromise=null;
const originalState=state;state=function(){syncCrewCounts();return {...originalState(),confirmationOverrides,sharedRestriction,laborValues:{拘束:derivedConfirmationLabor().拘束,計:derivedConfirmationLabor().計},workItemMaster,priceCalcCounts:{day:$('priceDayCount').value,night:$('priceNightCount').value},breakEnabled:$('breakEnabled').checked}};
const originalLoad=load;load=function(obj){sharedRestriction=obj.sharedRestriction??null;$('priceDayCount').value=obj.priceCalcCounts?.day??'';$('priceNightCount').value=obj.priceCalcCounts?.night??'';if(Array.isArray(obj.workItemMaster)){workItemMaster=[...new Set(obj.workItemMaster.filter(v=>typeof v==='string').map(v=>v.trim()).filter(Boolean))];localStorage.setItem('dailyReportWorkItemMasterV1',JSON.stringify(workItemMaster));}$('breakEnabled').checked=obj.breakEnabled===true;$('breakMinutes').value=obj.breakMinutes??'0';$('breakMinutes').disabled=!$('breakEnabled').checked;document.querySelectorAll('[data-rest-step]').forEach(button=>button.disabled=!$('breakEnabled').checked);confirmationOverrides=obj.confirmationOverrides||{};laborValues=obj.laborValues||{};originalLoad(obj);renderConfirmEditor();renderLabor()};
function personKey(p){if(!p.pdfId)p.pdfId=globalThis.crypto?.randomUUID?.()||('p'+Date.now()+Math.random());return p.pdfId}
function activeWorks(){return data.works.map((w,i)=>({w,i})).filter(({w})=>String(w.item||'').trim()||String(w.place||'').trim())}
function periodSelection(p,period){const k=personKey(p);const entry=confirmationOverrides[k]?.[period]||{};const first=data.works[0];const initial=first&&(String(first.item||'').trim()||String(first.place||'').trim())?personKey(first):'';return {work:initial,restriction:sharedRestriction?.value??null,note:null,...entry}}
function updatePeriod(key,period,field,value){const p=data.people.find(p=>personKey(p)===key);if(!p)return;confirmationOverrides[key]??={};confirmationOverrides[key][period]={...(confirmationOverrides[key][period]||{}),[field]:value}}
function renderConfirmEditor(){renderLabor();renderWorkerTable()}
function workerNote(p){return [...new Set([p.note,periodSelection(p,'AM').note,periodSelection(p,'PM').note].filter(Boolean))].join('／')}
function setWorkerNote(i,value){const p=data.people[i];change('people',i,'note',value);for(const period of ['AM','PM'])updatePeriod(personKey(p),period,'note','')}
const RESTRICTION_CHOICES=['路肩','走行','追越','移動','走二','追二'];
function selectWorkerRestriction(key,period,value){const p=data.people.find(p=>personKey(p)===key);if(!p)return;if(value==='__manual__'){const typed=prompt('規制を入力してください',periodSelection(p,period).restriction??'');if(typed===null){renderWorkerTable();return}value=typed.trim()}if(!sharedRestriction||sharedRestriction.key===key&&sharedRestriction.period===period){sharedRestriction={key,period,value};if(confirmationOverrides[key]?.[period])delete confirmationOverrides[key][period].restriction;}else updatePeriod(key,period,'restriction',value);renderWorkerTable()}
function workerRestrictionField(key,p,values){return `<div class="stack">${values.map(({period,v,w})=>{const current=v.restriction??(w?normalizeKinds(w).filter(v=>['路肩','走行','追越'].includes(v)).join('・'):'');const options=[...new Set([...RESTRICTION_CHOICES,...(current?[current]:[])])];return `<select aria-label="${esc(p.name)} ${period}の規制" onchange="selectWorkerRestriction('${key}','${period}',this.value)"><option value="" ${current===''?'selected':''}>規制を選択</option>${options.map(value=>`<option value="${esc(value)}" ${current===value?'selected':''}>${esc(value)}</option>`).join('')}<option value="__manual__">手入力…</option></select>`}).join('')}</div>`}
function wasteQuantity(row){return String(row.b??'').trim()+String(row.c??'').trim()}
function workerRouteOptions(){return [...new Set(data.works.map(w=>String(w.route||'').trim()).filter(Boolean))]}
function workerRouteField(key,p,values){const routes=workerRouteOptions();return `<div class="stack">${values.map(({period,v,w})=>{const current=v.route??w?.route??data.works[0]?.route??'';const options=[...new Set([...routes,...(current?[current]:[])])];return `<select aria-label="${esc(p.name)} ${period}の路線" onchange="updatePeriod('${key}','${period}','route',this.value)"><option value="" ${current===''?'selected':''}>路線を選択</option>${options.map(route=>`<option value="${esc(route)}" ${current===route?'selected':''}>${esc(route)}</option>`).join('')}</select>`}).join('')}</div>`}
function workerPlaceOptions(){return [...new Set(data.works.map(w=>String(w.place||'').trim()).filter(Boolean))]}
function selectWorkerPlace(key,period,value){updatePeriod(key,period,'place',value);const p=data.people.find(p=>personKey(p)===key);const v=periodSelection(p,period);if(!v.work){const w=data.works.find(w=>String(w.place||'').trim()===value);if(w)updatePeriod(key,period,'work',personKey(w))}renderWorkerTable()}
function workerPlaceField(key,p,values){const places=workerPlaceOptions();return `<div class="stack">${values.map(({period,v,w})=>{const current=v.place??w?.place??'';const options=[...new Set([...places,...(current?[current]:[])])];return `<select aria-label="${esc(p.name)} ${period}の現場" onchange="selectWorkerPlace('${key}','${period}',this.value)"><option value="" ${current===''?'selected':''}>現場を選択</option>${options.map(place=>`<option value="${esc(place)}" ${current===place?'selected':''}>${esc(place)}</option>`).join('')}</select>`}).join('')}</div>`}
function renderWorkerTable(){const el=$('people');if(!el)return;el.innerHTML=`<div class="worker-scroll"><table class="worker-table"><colgroup><col style="width:145px"><col style="width:92px"><col style="width:105px"><col style="width:80px"><col style="width:155px"><col style="width:145px"><col style="width:92px"><col style="width:145px"><col style="width:40px"></colgroup><thead><tr>${['氏名','作業員区分','開始／終了','路線','内容','現場（kp等）','規制','備考',''].map(t=>`<th>${t}</th>`).join('')}</tr></thead><tbody>${data.people.map((p,i)=>{const key=personKey(p);const values=['AM','PM'].map(period=>{const v=periodSelection(p,period);const w=data.works.find(w=>personKey(w)===v.work);return {period,v,w}});const field=(name,fallback)=>`<div class="stack">${values.map(({period,v,w})=>`<input aria-label="${esc(p.name)} ${period} ${name}" value="${esc(v[name]??fallback(w))}" oninput="updatePeriod('${key}','${period}','${name}',this.value)">`).join('')}</div>`;return `<tr><td>${input('people',i,'name',p.name)}</td><td>${input('people',i,'role',p.role)}</td><td><label class="worker-time-check"><input type="checkbox" aria-label="${esc(p.name)} 時刻付き確認書に記載" ${p.includeTimeConfirmation===true?'checked':''} onchange="change('people',${i},'includeTimeConfirmation',this.checked)">時刻記載</label><div class="stack"><label class="worker-time-label">開始<input aria-label="個人開始" type="time" value="${esc(p.start)}" oninput="change('people',${i},'start',this.value)"></label><label class="worker-time-label">終了<input aria-label="個人終了" type="time" value="${esc(p.end)}" oninput="change('people',${i},'end',this.value)"></label></div></td><td>${workerRouteField(key,p,values)}</td><td><div class="stack">${values.map(({period,v})=>`<select aria-label="${esc(p.name)} ${period}の内容" onchange="updatePeriod('${key}','${period}','work',this.value);renderWorkerTable()"><option value="">記載しない／未選択</option>${activeWorks().map(({w,i})=>`<option value="${personKey(w)}" ${v.work===personKey(w)?'selected':''}>${i+1}. ${esc(w.item)}</option>`).join('')}</select>`).join('')}</div></td><td>${workerPlaceField(key,p,values)}</td><td>${workerRestrictionField(key,p,values)}</td><td><input aria-label="個人備考" placeholder="備考" value="${esc(workerNote(p))}" oninput="setWorkerNote(${i},this.value)"></td><td><button class="danger" onclick="del('people',${i})">×</button></td></tr>`}).join('')}</tbody></table></div>`}
const workerOriginalRender=render;render=function(k){if(k==='people'){renderWorkerTable();renderLabor()}else{workerOriginalRender(k);if(k==='works')renderWorkerTable()}};
function derivedConfirmationLabor(){
 const start=new Date($('billstart').value),end=new Date($('billend').value);
 const valid=Number.isFinite(start.getTime())&&Number.isFinite(end.getTime())&&end>start;
 const minutes=valid?Math.round((end-start)/60000):null;
 const hours=minutes===null?'':`${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')}`;
 const count=data.people.filter(person=>String(person.name||'').trim()).length;
 return {拘束:hours,計:String(count),minutes};
}
function multiplyLaborMinutes(minutes,count){return Number.isFinite(minutes)&&Number.isInteger(count)&&count>=0?Math.round(minutes*count):null}
function formatLaborMinutes(minutes){return minutes===null?'—':`${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')}`}
function renderPriceCalculator(){if(!$('priceDayTime'))return;const c=calc(),automatic=selectedWorkerCount();let invalid=false;for(const [period,minutes] of [['Day',c?.day],['Night',c?.night]]){const input=$('price'+period+'Count');input.placeholder=automatic+'人（作業員数）';const count=input.value===''?automatic:Number(input.value);const total=multiplyLaborMinutes(minutes,count);if(input.value!==''&&(!Number.isInteger(count)||count<0))invalid=true;$('price'+period+'Time').value=formatLaborMinutes(Number.isFinite(minutes)?Math.round(minutes):null);$('price'+period+'Total').value=formatLaborMinutes(total)}$('priceCalcMessage').textContent=invalid?'人数は0以上の整数を入力してください。':''}
function renderLabor(){
 renderPriceCalculator();
 syncCrewCounts();
 const el=$('laborEditor');if(!el)return;
 const values=derivedConfirmationLabor();laborValues={拘束:values.拘束,計:values.計};
 const detail=values.minutes===null?'開始・終了を入力してください':`${Math.floor(values.minutes/60)}時間${values.minutes%60?values.minutes%60+'分':''}（休憩を含む）`;
 el.innerHTML=`<label class="field">拘束（時間：分）<input id="laborHours" readonly value="${esc(values.拘束)}" title="${esc(detail)}"><span class="hint">${esc(detail)}</span></label><label class="field">計（人・日）<input id="laborCount" readonly value="${esc(values.計)}"></label>`;
}

const oldChange=change;change=function(...args){oldChange(...args);if(args[0]==='people'&&args[2]==='name')renderConfirmEditor();if(args[0]==='works'&&['place','item','route'].includes(args[2]))renderWorkerTable()};
const oldDel=del;del=function(...args){oldDel(...args);renderConfirmEditor()};
try{const saved=JSON.parse(localStorage.getItem('dailyReportV1')||'null');if(saved){sharedRestriction=saved.sharedRestriction??null;$('priceDayCount').value=saved.priceCalcCounts?.day??'';$('priceNightCount').value=saved.priceCalcCounts?.night??'';$('breakEnabled').checked=saved.breakEnabled===true;$('breakMinutes').value=saved.breakMinutes??'0';$('breakMinutes').disabled=!$('breakEnabled').checked;document.querySelectorAll('[data-rest-step]').forEach(button=>button.disabled=!$('breakEnabled').checked);confirmationOverrides=saved.confirmationOverrides||{};laborValues=saved.laborValues||{}}}catch{}
renderConfirmEditor();renderLabor();
async function bytes(path){const response=await fetch(path);if(!response.ok)throw Error('原本・フォントを取得できません：'+path);return new Uint8Array(await response.arrayBuffer())}
async function pdfAssets(){if(!assetPromise)assetPromise=Promise.all([bytes('assets/daily-template.pdf'),bytes('assets/confirmation-template.pdf'),bytes('assets/japanese.ttf'),bytes('assets/stamp-serif.ttf')]).catch(e=>{assetPromise=null;throw e});return assetPromise}
function filledRows(rows){return rows.filter(r=>String(r.a||'').trim()||String(r.b||'').trim())}
function checkOverflowText(text,font,size,width,label){while(font.widthOfTextAtSize(text,size)>width&&size>5)size-=.2;if(font.widthOfTextAtSize(text,size)>width)throw Error(label+'が長すぎます。文字数を減らしてください。');return size}
function drawCell(page,font,text,x0,y0,x1,y1,size=8,label='入力内容',align='center'){
 text=String(text??'');if(!text)return;const lines=text.split(/\r?\n/);const h=y1-y0;size=Math.min(size,(h-2)/(Math.max(lines.length,1)*1.25));if(size<5)throw Error(label+'の行数が多すぎます。');for(const line of lines)size=checkOverflowText(line,font,size,x1-x0-4,label);
 const lineHeight=size*1.25,total=lines.length*lineHeight;
 lines.forEach((line,i)=>{const width=font.widthOfTextAtSize(line,size);const x=align==='left'?x0+2:x0+(x1-x0-width)/2;const baseline=y0+(h-total)/2+i*lineHeight+(lineHeight-size)/2+font.heightAtSize(size,{descender:false});page.drawText(line,{x,y:page.getHeight()-baseline,font,size,color:PDFLib.rgb(0,0,0)})});
}
function sealFamilyName(name){
 return String(name??'').trim().split(/[\s　]+/)[0]||'';
}
function drawNameSeal(page,stampFont,name,x0,y0,x1,y1){
 const chars=Array.from(sealFamilyName(name));if(!chars.length)return;
 const ink=PDFLib.rgb(.70,.075,.095),r=Math.min(x1-x0,y1-y0)/2-2;
 // A fixed slight offset and tilt keeps reprints consistent.
 const cx=(x0+x1)/2+.85,cy=page.getHeight()-(y0+y1)/2-.65,angle=-3.2*Math.PI/180;
 page.pushOperators(PDFLib.pushGraphicsState(),PDFLib.concatTransformationMatrix(Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle),cx,cy));
 page.drawEllipse({x:0,y:0,xScale:r,yScale:r,borderColor:ink,borderWidth:1.35});
 const split=Math.ceil(chars.length/2),columns=chars.length<=3?[chars]:[chars.slice(0,split),chars.slice(split)];
 columns.forEach((column,col)=>{
 const step=r*1.67/column.length;
 column.forEach((char,row)=>{
  let glyph=stampFont.glyphForCodePoint(char.codePointAt(0));
  if(!glyph.id&&sealFallbackFont)glyph=sealFallbackFont.glyphForCodePoint(char.codePointAt(0));
  if(!glyph.id)throw Error('印影の文字「'+char+'」に対応していません。印影の苗字を確認してください。');
  const b=glyph.bbox,centerY=(column.length-1)*step/2-row*step;
  const width=columns.length===1?Math.min(r*1.60,Math.sqrt(Math.max(1,r*r-centerY*centerY))*1.72):r*.77;
  const height=step*.97,centerX=columns.length===1?(row%2===0?-.15:.13):(col===0?1:-1)*r*.405;
  const sx=width/(b.maxX-b.minX),sy=height/(b.maxY-b.minY),left=centerX-width/2,bottom=centerY-height/2;
  page.pushOperators(PDFLib.pushGraphicsState(),PDFLib.concatTransformationMatrix(sx,0,0,-sy,left-b.minX*sx,bottom-b.minY*sy));
  page.drawSvgPath(glyph.path.toSVG(),{x:0,y:0,scale:1,color:ink,borderColor:ink,borderWidth:9});
  page.pushOperators(PDFLib.popGraphicsState());
 });});
 page.pushOperators(PDFLib.popGraphicsState());
}
let sealFallbackFont=null;
function circleWord(page,word,y){const x=word==='合'?617:635;page.drawEllipse({x,y:page.getHeight()-y,xScale:5.3,yScale:5.3,borderWidth:.65,borderColor:PDFLib.rgb(0,0,0)})}
function drawKinds(page,kinds,top){const positions={'路肩':[374.4,5],'走行':[405.4,5],'追越':[436.4,5],'清掃':[467.4,5],'植栽':[498.4,5],'事故':[374.4,17],'小補修':[405.4,17],'雪氷':[436.4,17],'外販':[467.4,17],'その他':[498.4,17]};for(const k of kinds){const q=positions[k];if(!q)continue;const x=q[0],y=top+q[1];page.drawLine({start:{x:x+1,y:page.getHeight()-y-3},end:{x:x+3,y:page.getHeight()-y-5},thickness:.9});page.drawLine({start:{x:x+3,y:page.getHeight()-y-5},end:{x:x+7,y:page.getHeight()-y},thickness:.9})}}
function formatWorkerTime(value){return String(value||'').replace(/^0(?=\d:)/,'')}
async function makePDF(mode){
 if(!window.PDFLib||!window.fontkit)throw Error('PDFライブラリを読み込めませんでした。ページを再読み込みしてください。');
 const s=state();if(!s.date)throw Error('作業日を入力してください。');const date=new Date(s.date+'T00:00:00');if(!Number.isFinite(date.getTime()))throw Error('作業日が正しくありません。');
 const [dailyBytes,confirmBytes,fontBytes,stampBytes]=await pdfAssets();const stampFont=fontkit.create(stampBytes);sealFallbackFont=fontkit.create(fontBytes);const doc=await PDFLib.PDFDocument.create();doc.registerFontkit(fontkit);const font=await doc.embedFont(fontBytes,{subset:false});const dt={year:date.getFullYear()-2018,month:date.getMonth()+1,day:date.getDate(),weekday:'日月火水木金土'[date.getDay()]};
 const cell=(p,t,x0,y0,x1,y1,z=8,label='入力内容',align='center')=>drawCell(p,font,t,x0,y0,x1,y1,z,label,align);
 const works=activeWorks().map(x=>x.w),crews=filledRows(data.crews),vehicles=filledRows(data.vehicles),materials=filledRows(data.materials),waste=filledRows(data.waste),prices=filledRows(data.prices),people=data.people.filter(p=>p.name?.trim());
 if(mode!=='confirmation'){
 const source=await PDFLib.PDFDocument.load(dailyBytes);const count=Math.max(1,Math.ceil(works.length/6),Math.ceil(crews.length/6),Math.ceil(vehicles.length/6),Math.ceil(materials.length/6),Math.ceil(waste.length/6),Math.ceil(prices.length/5));
 for(let n=0;n<count;n++){const [p]=await doc.copyPages(source,[0]);doc.addPage(p);
 if(s.job!=='加須管内道路保全工事業務'){p.drawRectangle({x:68,y:p.getHeight()-92,width:128,height:12,color:PDFLib.rgb(1,1,1)});cell(p,s.job,68,81,196,92,7,'作業名','left')}
 cell(p,s.company+(s.primary?'（'+s.primary+'）':''),235,81,369,92,8,'会社名');
 cell(p,dt.year,99,101,116,113,9);cell(p,dt.month,135,101,150,113,9);cell(p,dt.day,170,101,186,113,9);cell(p,dt.weekday,214,101,234,113,9);cell(p,s.weather,278,101,309,113,8);cell(p,s.baseout,340,101,386,113,9);cell(p,s.basein,490,101,536,113,9);drawNameSeal(p,stampFont,s.chief,760,68,802,103);
 if(count>1)cell(p,`${n+1} / ${count}`,738,31,800,45,7);
 const edges=[139.2,166.56,190.56,214.56,238.56,262.56,286.56];
 works.slice(n*6,n*6+6).forEach((w,i)=>{const y0=edges[i],y1=edges[i+1];cell(p,w.route,54,y0,82,y1,8,'路線');cell(p,w.item,85,y0,198,y1,8,'作業項目');cell(p,w.start,201,y0,231,y1,8);cell(p,w.end,246,y0,275,y1,8);cell(p,w.place,280,y0,370,y1,8,'作業場所');cell(p,w.manual,542,y0,586,y1,8,'手順書');cell(p,w.note,666,y0,740,y1,8,'備考');drawKinds(p,normalizeKinds(w),y0);if(['合','否'].includes(w.check))circleWord(p,w.check,(y0+y1)/2)});
 const lower=[319.8,335.4,351,366.6,382.2,397.8,414];
 const mapRows=(rows,cols)=>rows.slice(n*6,n*6+6).forEach((r,i)=>cols.forEach(([key,x0,x1])=>cell(p,r[key],x0,lower[i],x1,lower[i+1],8,'明細')));
 mapRows(crews,[['a',39,129],['b',132,163]]);mapRows(vehicles,[['a',167,260],['b',264,353],['c',356,384]]);mapRows(materials,[['a',388,508],['b',511,632],['c',635,678]]);mapRows(waste.map(row=>({...row,b:wasteQuantity(row)})),[['a',681,772],['b',775,803]]);
 prices.slice(n*5,n*5+5).forEach((r,i)=>{const y=439.8+i*15.72;cell(p,r.a,100,y,245,y+15.72,8,'単価項目');cell(p,r.b,248,y,292,y+15.72,8);cell(p,r.c,295,y,339,y+15.72,8)});
 }
 }
 if(mode!=='daily'){
 const source=await PDFLib.PDFDocument.load(confirmBytes);const count=Math.max(1,Math.ceil(people.length/15),Math.ceil(vehicles.length/6));
 const variants=people.some(person=>person.includeTimeConfirmation===true)?[false,true]:[false];
 for(const withWorkerTimes of variants){
 for(let n=0;n<count;n++){const [p]=await doc.copyPages(source,[0]);doc.addPage(p);
 cell(p,s.company,128,107,282,121,9,'会社名');cell(p,dt.year,110,123,129,137,9);cell(p,dt.month,140,123,159,137,9);cell(p,dt.day,171,123,189,137,9);cell(p,dt.weekday,253,123,273,137,9);cell(p,fmtTime(s.billstart),317,109,398,137,10);cell(p,fmtTime(s.billend),423,109,526,137,10);drawNameSeal(p,stampFont,s.chief,403,76,448,105);
 if(count>1)cell(p,`${n+1} / ${count}`,485,43,542,58,7);
 people.slice(n*15,n*15+15).forEach((person,i)=>{const top=166.0+i*25.44;cell(p,person.name,97,top,170,top+25.44,9,'氏名');['AM','PM'].forEach((period,j)=>{const entry=periodSelection(person,period),w=entry.work===''?null:data.works.find(w=>personKey(w)===entry.work);if(!w)return;const y=top+j*12.72;cell(p,entry.route??w.route,203,y,238,y+12.72,7,'確認書の路線');cell(p,w.item,241,y,347,y+12.72,7,'確認書の内容');cell(p,entry.place??w.place,350,y,447,y+12.72,7,'確認書の現場');const restriction=entry.restriction??normalizeKinds(w).filter(v=>['路肩','走行','追越'].includes(v)).join('・');cell(p,restriction,450,y,478,y+12.72,6,'規制')});const a=periodSelection(person,'AM'),b=periodSelection(person,'PM');const notes=[person.note,a.note,b.note].filter(Boolean);if(withWorkerTimes&&person.includeTimeConfirmation===true)notes.unshift(`${formatWorkerTime(person.start)}-${formatWorkerTime(person.end)}`);else if(person._overrideStart||person._overrideEnd)notes.unshift(`${person.start}～${person.end}`);cell(p,[...new Set(notes)].join('\n'),481,top,541,top+25.44,6,'個人備考')});
 const vedges=[579,597.2,617.9,638.5,659.2,679.8,700.08];vehicles.slice(n*6,n*6+6).forEach((r,i)=>{cell(p,r.a,389,vedges[i],447,vedges[i+1],8,'車種');cell(p,r.b,450,vedges[i],508,vedges[i+1],8,'車番');cell(p,r.c,511,vedges[i],540,vedges[i+1],8)});
 if(n===0){const automatic=derivedConfirmationLabor();[['拘束',4],['計',5]].forEach(([key,i])=>cell(p,automatic[key],110,579+i*20.64,146,597+i*20.64,8,'その他労務'));}
 }
 }
 }
 const rendered=await PDFLib.PDFDocument.load(await doc.save());const final=await PDFLib.PDFDocument.create();const dailyCount=mode==='confirmation'?0:Math.max(1,Math.ceil(works.length/6),Math.ceil(crews.length/6),Math.ceil(vehicles.length/6),Math.ceil(materials.length/6),Math.ceil(waste.length/6),Math.ceil(prices.length/5));
 for(let i=0;i<rendered.getPageCount();i++){const src=rendered.getPage(i);if(i<dailyCount){const [p]=await final.copyPages(rendered,[i]);final.addPage(p)}else{const e=await final.embedPage(src,{left:79.4,bottom:src.getHeight()-701.1,right:543.6,top:src.getHeight()-63.5});const p=final.addPage([src.getWidth(),src.getHeight()]);const m=28.346456693,k=Math.min((p.getWidth()-2*m)/e.width,(p.getHeight()-2*m)/e.height);p.drawPage(e,{x:(p.getWidth()-e.width*k)/2,y:(p.getHeight()-e.height*k)/2,width:e.width*k,height:e.height*k})}}
 final.setTitle('作業日報・確認書 '+s.date);final.setSubject('原本PDF出力 試作Ver.30');return final.save();
}
async function exportOriginalPDF(mode='both'){
 const status=$('pdfStatus');status.textContent='PDFを作成しています。初回は日本語フォントの読込みに時間がかかります。';const buttons=[...document.querySelectorAll('button[onclick*="exportOriginalPDF"],button[onclick*="printDoc"]')];buttons.forEach(b=>b.disabled=true);
 try{const output=await makePDF(mode);currentPDFUrl=URL.createObjectURL(new Blob([output],{type:'application/pdf'}));const filename=({'daily':'作業日報_様式2号','confirmation':'作業確認書','both':'作業日報_確認書'})[mode]+'_'+$('date').value+'.pdf';const viewerURL='pdf-viewer.html#'+encodeURIComponent(currentPDFUrl);$('pdfTitle').textContent=filename;$('pdfFrame').src=viewerURL;$('openPDF').href=viewerURL;$('savePDF').href=currentPDFUrl;$('savePDF').download=filename;$('pdfLinks').replaceChildren();for(const label of ['PDFを開く','PDFを保存']){const a=document.createElement('a');a.href=label.includes('保存')?currentPDFUrl:viewerURL;a.textContent=label;a.className='smalllink';a.style.marginRight='18px';if(label.includes('保存'))a.download=filename;else{a.target='_blank';a.rel='noopener'}$('pdfLinks').append(a)}status.textContent='PDFを作成しました。プレビュー上部の「次へ」またはページ番号で確認書に切り替えられます。';renderConfirmEditor();$('pdfDialog').showModal();}
 catch(e){status.textContent='PDFを作成できませんでした：'+e.message;status.scrollIntoView({behavior:'smooth',block:'center'});console.error(e)}finally{buttons.forEach(b=>b.disabled=false)}
}
function fillSample(){if(!confirm('現在の入力を見本データで置き換えます。保存は自動では行いません。よろしいですか？'))return;const day='2026-11-15';confirmationOverrides={};laborValues={};load({date:day,weather:'晴',job:'加須管内道路保全工事業務',company:'タイヨー株式会社',primary:'',chief:'青木',billstart:day+'T08:00',billend:day+'T17:00',baseout:'08:00',basein:'17:00',confirmed:'yes',baseOverrides:{baseout:false,basein:false},rows:{works:[{...templates.works,item:'路肩清掃（出力見本）',start:'08:00',end:'17:00',place:'下り 33.1kp',kind:['路肩','清掃'],note:'架空データ'}],people:[{...templates.people,name:'青木',role:'責任者',start:'08:00',end:'17:00'}],crews:[{a:'タイヨー株式会社',b:'1',c:''}],vehicles:[{a:'作業車',b:'1234',c:'1'}],materials:[],waste:[],prices:[]},confirmationOverrides:{},laborValues:{}});window.scrollTo({top:0,behavior:'smooth'})}

function clearInputsToDefaults(){
 if(!confirm('入力した内容を消して初期値に戻しますか？ 登録した氏名リストと保存済みデータは残します。'))return;
 const now=new Date(),pad=n=>String(n).padStart(2,'0'),day=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
 const defaults={date:day,weather:'晴',job:'加須管内道路保全工事業務',company:'タイヨー株式会社',primary:'',chief:'',baseout:'08:00',basein:'17:00',billstart:day+'T08:00',billend:day+'T17:00',nightstart:'22:00',nightend:'06:00',breakEnabled:false,breakMinutes:'0',confirmed:'no',baseOverrides:{baseout:false,basein:false},confirmationOverrides:{},laborValues:{},rows:{}};
 for(const key of Object.keys(templates))defaults.rows[key]=[{...templates[key],...(key==='works'?{kind:[]}:{} )}];
 load(defaults);$('timelineDate').value=day;
 propagateTimes();drawTimeline();
 if(currentPDFUrl){URL.revokeObjectURL(currentPDFUrl);currentPDFUrl=null;}
 $('pdfFrame').removeAttribute('src');$('openPDF').removeAttribute('href');$('savePDF').removeAttribute('href');$('pdfLinks').replaceChildren();
 $('pdfStatus').textContent='入力欄を初期値に戻しました。登録した氏名リストと保存済みデータは残っています。';
}
// Correct the former 18:00 default once, without overriding later user choices.
try{
 if(localStorage.getItem('dailyReportNightDefaultV20')!=='done'){
  if($('nightstart').value==='18:00'){$('nightstart').value='22:00';drawTimeline();}
  const raw=localStorage.getItem('dailyReportV1');
  if(raw){const old=JSON.parse(raw);if(old.nightstart==='18:00'){old.nightstart='22:00';localStorage.setItem('dailyReportV1',JSON.stringify(old));}}
  localStorage.setItem('dailyReportNightDefaultV20','done');
 }
}catch{}

updateBreakControls();
