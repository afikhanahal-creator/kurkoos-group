// ================= V173 · channels: TikTok and YouTube next to Facebook and Instagram, Metricool from the site, a "ערוצים" card in settings
(()=>{
if(window.__v173)return;window.__v173=1;
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// the four channels the engine schedules to. Platform colours only on the small channel badges.
try{NETS.tt={n:'טיקטוק',c:'#111111',l:'TT',max:2200};NETS.yt={n:'יוטיוב',c:'#CC0000',l:'YT',max:5000}}catch(e){}
const KEYS=[['fb','facebook'],['ig','instagram'],['tt','tiktok'],['yt','youtube']];
const DEF_KEY='v173_nets';
function defNets(){let d=null;try{d=lsGet(DEF_KEY,null)}catch(e){}const o={fb:true,ig:true,tt:false,yt:false};if(d&&typeof d==='object')KEYS.forEach(([k])=>{if(k in d)o[k]=!!d[k]});if(!KEYS.some(([k])=>o[k]))o.fb=true;return o}
function setDef(k,v){const o=defNets();o[k]=v;if(!KEYS.some(([x])=>o[x]))o[k]=true;try{lsSet(DEF_KEY,o)}catch(e){}}

/* Metricool payload: the extra providers */
try{buildInfo=(f=>function(q){const info=f.apply(this,arguments);try{
 if(q.nets.tiktok&&!info.providers.some(p=>p.network==='tiktok'))info.providers.push({network:'tiktok'});
 if(q.nets.youtube&&!info.providers.some(p=>p.network==='youtube'))info.providers.push({network:'youtube'});
 info.draft=true}catch(e){}return info})(buildInfo)}catch(e){}

/* the rendered post goes with the draft (site only: the file sits in public storage that Metricool can read) */
async function mediaFor(p){if(window.__ENGINE_HOST!=='site'||!p)return '';
 try{const assets=await window.claude.use('assets');if(!assets)return '';const cv=document.createElement('canvas');cv.width=1080;cv.height=1350;drawSlide(cv,p,p.slide||0);
  const blob=await new Promise(r=>cv.toBlob(r,'image/png'));if(!blob)return '';const up=await assets.upload(blob);return up&&up.url||''}catch(e){console.warn('v173 media',e);return ''}}
const TOAST={needs_reauth:'צריך לחבר מחדש את Metricool',server_not_connected:'Metricool עוד לא מחובר לאתר. ההוראות בהגדרות > ערוצים',not_in_manifest:'הדף לא קיבל הרשאה ל-Metricool. רעננו ואשרו'};
try{sendMC=async function(it){const p=itemPost(it);
 if(!mcpNS)return toast('Metricool לא מחובר. ההוראות בהגדרות > ערוצים');
 if(!it.at||new Date(it.at)<new Date())return toast('בחרו זמן עתידי לפני שליחה');
 const n=it.nets||{};const video=!!it.reel;
 const nets={facebook:!!n.fb,instagram:!!n.ig,tiktok:!!n.tt,youtube:!!n.yt&&video};
 if(n.yt&&!video)toast('יוטיוב מקבל רק סרטונים, הפוסט נשלח לשאר הערוצים');
 if(!nets.facebook&&!nets.instagram&&!nets.tiktok&&!nets.youtube)return toast('בחרו לפחות ערוץ אחד');
 const main=n.fb?'fb':'ig';
 const media=video?'':await mediaFor(p);
 const q={nets,text:itemText(it,main),media,draft:true,date:it.at,fbType:video?'REEL':'POST',igType:video?'REEL':'POST'};
 try{const res=await mcpNS.callTool(SERVER,'createScheduledPost',{blogId:BRAND,date:it.at+':00'+(window.__ilOffset?__ilOffset(it.at):'+03:00'),info:JSON.stringify(buildInfo(q))},{cache:false});
  let pl=res.payload;if(typeof pl==='string'){try{pl=JSON.parse(pl)}catch(e){}}
  it.sent={at:new Date().toISOString(),url:findKey(pl,'plannerUrl')||'',media:!!media};it.status='scheduled';saveSched(it);
  toast(media?'נשלח ל-Metricool כטיוטה עם התמונה. אשרו שם כדי שיתפרסם':'נשלח ל-Metricool כטיוטה. הוסיפו שם את המדיה ואשרו');
  try{await mcpNS.invalidate(SERVER,'getScheduledPosts')}catch(e){}}
 catch(err){const c=err&&err.code;toast(TOAST[c]||(c==='tool_error'?'Metricool דחה: '+String(err.message||'').slice(0,120):'השליחה נכשלה, נסו שוב'))}}}catch(e){console.error('v173 sendMC',e)}

/* settings: which channels are connected, defaults for new posts */
const ST={state:'idle',configured:null,nets:null,err:''};
function netsFrom(data){const rows=Array.isArray(data)?data:(data&&Array.isArray(data.data)?data.data:[]);const b=rows.find(r=>String(r.id||r.blogId)==='7115159')||rows[0];if(!b)return null;
 const src=Object.assign({},b,b.networksData||{});const has=re=>Object.keys(src).some(k=>re.test(k)&&src[k]&&String(src[k]).length>1&&!/^(false|null|0)$/i.test(String(src[k])));
 return {fb:has(/^facebook(Data|PageId|_page)?$/i),ig:has(/^instagram(Data|Connect)?$/i),tt:has(/^tiktok(Data|Account)?$/i),yt:has(/^youtube(Data|Channel)?$/i),gb:has(/^(gbp|gmb)(Data)?$/i),label:b.label||''}}
async function load(){ST.state='busy';paintCard();
 try{const mcp=await (window.claude&&window.claude.use?window.claude.use('mcp'):null);
  if(!mcp){ST.state='off';ST.err='';paintCard();return}
  if(window.__ENGINE_HOST==='site'&&mcp.status){const s=await mcp.status();ST.configured=!!(s&&s.configured);if(!ST.configured){try{mcpNS=null}catch(e){}ST.state='nokey';paintCard();return}}
  const r=await mcp.callTool('metricool','getBrandSettings',{});let pl=r&&r.payload;if(typeof pl==='string'){try{pl=JSON.parse(pl)}catch(e){}}
  ST.nets=netsFrom(pl&&pl.data!==undefined?pl.data:pl);ST.state='ok'}
 catch(e){ST.state='err';ST.err=String(e&&e.message||'').slice(0,160)}
 paintCard()}
const ROWS=[['fb','פייסבוק','קבוצת קורקוס'],['ig','אינסטגרם','kurkoos_group'],['tt','טיקטוק','kurkoos_group'],['yt','יוטיוב','קבוצת קורקוס'],['gb','גוגל לעסק','פרופיל העסק']];
function cardHtml(){const d=defNets();const n=ST.nets||{};
 const head=ST.state==='ok'?`<span class="v173st on">Metricool מחובר</span>`:ST.state==='busy'?`<span class="v173st">בודק חיבור…</span>`:ST.state==='nokey'?`<span class="v173st warn">צריך מפתח Metricool באתר</span>`:ST.state==='off'?`<span class="v173st warn">לא זמין בדף הזה</span>`:ST.state==='err'?`<span class="v173st warn">החיבור נכשל</span>`:'';
 const rows=ROWS.map(([k,name,acc])=>{const known=ST.state==='ok';const on=known&&n[k];const def=k in d;
  return `<li class="v173row"><span class="v173b" style="background:${(NETS[k]||{c:'#4285F4'}).c}" aria-hidden="true">${(NETS[k]||{l:'G'}).l}</span><span class="v173n"><b>${name}</b><span>${E(acc)}</span></span>
   <span class="v173c ${known?(on?'ok':'no'):''}">${known?(on?'מחובר':'לא מחובר'):''}</span>
   ${def?`<label class="v173sw"><input type="checkbox" data-v173def="${k}" ${d[k]?'checked':''}><span>ברירת מחדל</span></label>`:'<span class="v173sw muted">רק בתוך Metricool</span>'}</li>`}).join('');
 const help=ST.state==='nokey'?`<div class="v173help"><b>איך מחברים (פעם אחת):</b><ol><li>ב-Metricool: הגדרות החשבון ואז API, מעתיקים את הטוקן.</li><li>ב-Vercel: Settings ואז Environment Variables, מוסיפים <code>METRICOOL_USER_TOKEN</code> עם הטוקן.</li><li>Redeploy לאתר, ורעננו את הדף.</li></ol><p>הגישה ל-API קיימת בחבילות Advanced ומעלה של Metricool.</p></div>`
  :ST.state==='err'?`<p class="v173help">${E(ST.err)}</p>`:ST.state==='off'?`<p class="v173help">היכנסו דרך עמוד הניהול של האתר כדי לתזמן לערוצים.</p>`:'';
 return `<section class="v173card" id="v173card" aria-labelledby="v173h"><div class="v173top"><h2 class="vh" id="v173h" style="margin:0">ערוצים</h2>${head}<button type="button" class="px-btn sm" data-v173="re">בדיקה מחדש</button></div>
  <p class="muted v173p">פוסטים נשלחים ל-Metricool תמיד כטיוטה, והפרסום עצמו מאושר שם. יוטיוב מקבל רק סרטונים.</p>
  <ul class="v173list">${rows}</ul>${help}</section>`}
function paintCard(){const el=document.getElementById('v173card');if(el)el.outerHTML=cardHtml()}
try{vSettings=(f=>function(){return cardHtml()+f.apply(this,arguments)})(vSettings)}catch(e){}
try{render=(f=>function(){const r=f.apply(this,arguments);try{if(APP.view==='settings'&&ST.state==='idle')load()}catch(e){}return r})(render)}catch(e){}
document.addEventListener('change',e=>{const t=e.target;if(t&&t.dataset&&t.dataset.v173def){setDef(t.dataset.v173def,t.checked);paintCard()}});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v173="re"]');if(b){e.preventDefault();load()}});
setTimeout(()=>{try{if(window.__ENGINE_HOST==='site')load()}catch(e){}},2500);

window.__v173={defNets,load,ST,netsFrom};
})();
