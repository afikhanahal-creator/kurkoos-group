// ================= V164 · every word and every photo editable in every designed post (no flattening, no conversion)
//   1. any text the layout draws can be replaced per post (fx.tx: original line → new line), so fixed labels edit too
//   2. the text tab lists the call to action, every list item (edit, add, remove, reorder), the source line and all other text
//   3. clicking a text in the preview jumps to its field; the photo tab replaces the photo as before
(function(){
const strip=t=>String(t==null?'':t).replace(/[⁦-⁩]/g,'');
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>strip(s).replace(/\*/g,'').replace(/\s+/g,' ').trim();
const flat=p=>p&&/^x_/.test(p.layout||'')&&!/^x_t_/.test(p.layout||'');
let CAP=null;
// ---- 1. overrides and capture at the drawing level
if(window.FX&&FX.draw&&!FX.__v164){const D0=FX.draw;FX.__v164=1;FX.draw=function(cv,props){const map=props&&props.tx&&typeof props.tx==='object'?props.tx:null;const want=window.__v164want;if(!map&&!want)return D0.apply(this,arguments);
  const C=CanvasRenderingContext2D.prototype,f0=C.fillText,s0=C.strokeText,cap=[];
  const wrap=o=>function(t,x,y,m){const raw=strip(t);let out=t;if(map&&Object.prototype.hasOwnProperty.call(map,raw))out=map[raw];
    if(want){try{const T=this.getTransform();const w=this.measureText(String(out)).width;const sz=parseFloat((String(this.font).match(/([\d.]+)px/)||[])[1])||20;
      const al=this.textAlign,rtl=this.direction==='rtl';const x0=al==='center'?x-w/2:(al==='right'||(al==='start'&&rtl)||(al==='end'&&!rtl))?x-w:x;
      const pts=[[x0,y-sz*.9],[x0+w,y-sz*.9],[x0,y+sz*.3],[x0+w,y+sz*.3]].map(([a,b])=>[T.a*a+T.c*b+T.e,T.b*a+T.d*b+T.f]);
      cap.push({t:raw,x1:Math.min(...pts.map(q=>q[0])),x2:Math.max(...pts.map(q=>q[0])),y1:Math.min(...pts.map(q=>q[1])),y2:Math.max(...pts.map(q=>q[1]))})}catch(e){}}
    return o.call(this,out,x,y,m)};
  C.fillText=wrap(f0);C.strokeText=wrap(s0);try{return D0.apply(this,arguments)}finally{C.fillText=f0;C.strokeText=s0;if(want)CAP=cap}}}
if(typeof peCanvas==='function')peCanvas=(f=>function(p){const on=typeof PE!=='undefined'&&PE.p&&p&&p.id===PE.p.id&&flat(p);window.__v164want=on;try{return f.apply(this,arguments)}finally{window.__v164want=false;if(on){PE.__cap=CAP;setTimeout(fillFixed,0)}}})(peCanvas);
// ---- 2. the panel
function itemsOf(p){const a=p.fx&&p.fx.items;return Array.isArray(a)&&a.every(x=>x&&typeof x==='object'&&!Array.isArray(x))?a:null}
function known(p){const v=p.visual||{},fx=p.fx||{};const out=[];[v.headline,p.hook,v.sub,v.eyebrow,v.cta,fx.myth,fx.truth,fx.num,fx.source].forEach(s=>{if(s)out.push(norm(s))});(itemsOf(p)||[]).forEach(it=>{out.push(norm(it.v||it.big||''));out.push(norm(it.l||it.label||''))});return out.filter(Boolean)}
function originOf(p,t){const n=norm(t);if(!n)return null;const v=p.visual||{},fx=p.fx||{};const inS=(s)=>s&&norm(s).includes(n);
  if(/^מקור:/.test(n))return {sel:'[data-v164="src"]'};
  const its=itemsOf(p)||[];for(let i=0;i<its.length;i++){const a=norm(its[i].l||its[i].label||''),b=norm(its[i].v||its[i].big||'');if(n===a||(a&&n.includes(a))||(a&&a.includes(n)&&n.length>3))return {sel:`[data-v164="il"][data-i="${i}"]`};if(b&&n===b)return {sel:`[data-v164="iv"][data-i="${i}"]`}}
  if(inS(v.headline||p.hook))return {sel:'#pe-h'};if(inS(v.sub))return {sel:'#pe-sub'};if(inS(v.eyebrow))return {sel:'#pe-eb'};if(inS(v.cta))return {sel:'[data-v164="cta"]'};
  if(inS(fx.myth))return {sel:'[data-pe-x="myth"]'};if(inS(fx.truth))return {sel:'[data-pe-x="truth"]'};return {sel:`[data-v164="tx"][data-k="${CSS.escape(n)}"]`,tx:n}}
function fixedList(p){const cap=PE.__cap||[];const k=known(p);const seen=new Set();const out=[];const map=(p.fx&&p.fx.tx)||{};
  cap.forEach(c=>{const n=norm(c.t);if(!n||n.length<2||seen.has(n))return;if(k.some(s=>s.includes(n)||(n.length>3&&n.includes(s)&&s.length>3)))return;if(/^\d{1,2}$/.test(n))return;seen.add(n);out.push(n)});
  Object.keys(map).forEach(n=>{if(!seen.has(n)){seen.add(n);out.push(n)}});return out}
function fillFixed(){const box=document.getElementById('v164fixed');if(!box||!PE.p)return;const p=PE.p;const map=(p.fx&&p.fx.tx)||{};const list=fixedList(p);
  const sig=list.join('|');if(box.dataset.sig===sig)return;box.dataset.sig=sig;
  box.innerHTML=list.length?list.map(n=>`<label class="v164row"><span>${esc(n)}</span><input type="text" data-v164="tx" data-k="${esc(n)}" value="${esc(Object.prototype.hasOwnProperty.call(map,n)?map[n]:n)}" aria-label="טקסט בעיצוב: ${esc(n)}"></label>`).join(''):'<p class="v164empty">כל הטקסט בעיצוב הזה נערך בשדות למעלה.</p>'}
function panel(p){const v=p.visual||{},fx=p.fx||{};const its=itemsOf(p);const srcAble=/x_c_bars|x_c_stat|x_mag_news|x_c_|x_s_/.test(p.layout)||fx.source!==undefined;
  return `<section class="v164" aria-label="כל הטקסט בעיצוב">
   <p class="v164lead"><b>כל מילה בעיצוב נערכת כאן.</b> לחצו על טקסט בתצוגה כדי לקפוץ לשדה שלו. להחלפת התמונה: לשונית "תמונה".</p>
   <label class="pe-l" for="v164cta">קריאה לפעולה</label><input id="v164cta" type="text" data-pe-f="cta" data-v164="cta" value="${esc(v.cta||'')}">
   ${its?`<div class="v164h">פריטים בעיצוב <small>${its.length}</small></div><ol class="v164items">${its.map((it,i)=>`<li><input type="text" class="v164v" data-v164="iv" data-i="${i}" value="${esc(it.v??it.big??'')}" aria-label="ערך ${i+1}" placeholder="ערך"><input type="text" class="v164l" data-v164="il" data-i="${i}" value="${esc(it.l??it.label??'')}" aria-label="פריט ${i+1}" placeholder="טקסט"><span class="v164ctl"><button type="button" data-v164b="up" data-i="${i}" aria-label="הזזה למעלה" ${i?'':'disabled'}>↑</button><button type="button" data-v164b="dn" data-i="${i}" aria-label="הזזה למטה" ${i<its.length-1?'':'disabled'}>↓</button><button type="button" data-v164b="rm" data-i="${i}" aria-label="מחיקת פריט">✕</button></span></li>`).join('')}</ol><button type="button" class="px-btn sm" data-v164b="add">+ הוספת פריט</button>`:''}
   ${srcAble?`<label class="pe-l" for="v164src">שורת מקור</label><input id="v164src" type="text" data-v164="src" value="${esc(fx.source||'')}" placeholder="למשל: הלמ&quot;ס, 2026">`:''}
   <div class="v164h">כל שאר הטקסט בעיצוב</div><div id="v164fixed"><p class="v164empty">טוען את הטקסטים…</p></div>
   ${fx.tx&&Object.keys(fx.tx).length?`<button type="button" class="px-btn sm ghost" data-v164b="txreset">החזרת הטקסט הקבוע למקור</button>`:''}
  </section>`}
if(typeof peRender==='function')peRender=(f=>function(){const r=f.apply(this,arguments);try{const p=PE.p;if(!p||!flat(p))return r;document.body.classList.add('v164on');
  if(PE.tab==='text'||!PE.tab){const body=document.querySelector('#pe-root .pe-body');if(body&&!body.querySelector('.v164')){const anchor=body.querySelector('.pe-sec');(anchor||body).insertAdjacentHTML(anchor?'afterend':'beforeend',panel(p));setTimeout(fillFixed,0)}}}catch(e){console.error('v164',e)}return r})(peRender);
// ---- input and buttons
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||!t.dataset.v164||typeof PE==='undefined'||!PE.p)return;const p=PE.p,k=t.dataset.v164;if(k==='cta')return;
  e.stopImmediatePropagation();if(!t._pe){try{pePush()}catch(x){}t._pe=1}p.fx=p.fx||{};
  if(k==='iv'||k==='il'){const it=itemsOf(p)[+t.dataset.i];if(!it)return;const key=k==='iv'?('v' in it||!('big' in it)?'v':'big'):('l' in it||!('label' in it)?'l':'label');it[key]=t.value}
  else if(k==='src'){if(t.value)p.fx.source=t.value;else delete p.fx.source}
  else if(k==='tx'){const o=t.dataset.k;p.fx.tx=Object.assign({},p.fx.tx||{});if(t.value===o)delete p.fx.tx[o];else p.fx.tx[o]=t.value;if(!Object.keys(p.fx.tx).length)delete p.fx.tx}
  try{peLive();peTopDirty()}catch(x){}},true);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v164b]');if(!b||typeof PE==='undefined'||!PE.p)return;e.preventDefault();e.stopImmediatePropagation();const p=PE.p,a=b.dataset.v164b,i=+b.dataset.i;const its=itemsOf(p);try{pePush()}catch(x){}
  if(a==='add'){(p.fx.items=p.fx.items||[]).push({v:'',l:''})}else if(a==='rm'&&its){its.splice(i,1)}else if(a==='up'&&its&&i>0){[its[i-1],its[i]]=[its[i],its[i-1]]}else if(a==='dn'&&its&&i<its.length-1){[its[i+1],its[i]]=[its[i],its[i+1]]}else if(a==='txreset'){delete p.fx.tx}
  try{peRender();peLive();peTopDirty()}catch(x){}if(a==='add')setTimeout(()=>{const l=document.querySelectorAll('#pe-root [data-v164="il"]');l.length&&l[l.length-1].focus()},60)},true);
// ---- 3. click a text in the preview → its field
document.addEventListener('click',e=>{const cv=e.target.closest&&e.target.closest('#pe-cv');if(!cv||typeof PE==='undefined'||!PE.p||!flat(PE.p)||!PE.__cap)return;
  const r=cv.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*1080,y=(e.clientY-r.top)/r.height*1350;
  const hits=PE.__cap.filter(c=>x>=c.x1-12&&x<=c.x2+12&&y>=c.y1-10&&y<=c.y2+10).sort((a,b)=>(a.x2-a.x1)*(a.y2-a.y1)-(b.x2-b.x1)*(b.y2-b.y1));if(!hits.length)return;
  const o=originOf(PE.p,hits[0].t);if(!o)return;const go=()=>{const el=document.querySelector('#pe-root '+o.sel);if(el){el.scrollIntoView({block:'center',behavior:'smooth'});el.focus({preventScroll:true});el.classList.add('v164hit');setTimeout(()=>el.classList.remove('v164hit'),1400)}};
  if(PE.tab!=='text'){PE.tab='text';try{peRender()}catch(x){}setTimeout(()=>{fillFixed();setTimeout(go,40)},80)}else go()});
window.__v164={fixedList,originOf};
})();
