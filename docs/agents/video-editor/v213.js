/*V213:START*/
// ================= V213 · the element inspector: every element of a post can be edited like in a desktop editor. For a text
// element: size, weight, line height, letter spacing, alignment, outline, shadow (stored per element in fx.tov, drawn by the
// V212 hook). For a photo: light adjustments per photo (exposure, contrast, saturation, warmth), flip, reset, from the photo
// toolbar. All of it is undoable and travels with the post. =================
(()=>{
if(window.__v213)return;window.__v213=1;
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const TEXTY=new Set(['text','caption','pill','tag','sticker','stamp','cta','counter','stat','vtext','otext','dropcap']);
const COLS=[['','ללא'],['navy','כחול לילה'],['white','לבן'],['red','אדום'],['mist','תכלת'],['teal','טורקיז'],['ink','שחור']];
function specEl(key){try{const sp=TPL.specs.find(s=>s.id===PE.p.layout);if(!sp)return null;const m=String(key).match(/^([a-z]+)(\d+)$/);if(!m)return null;const e=sp.el[+m[2]];return e&&e.t===m[1]?e:null}catch(e){return null}}
function selOne(){try{const S=__v53.SEL;if(!S||S.length!==1)return null;const it=__v53.items().find(i=>i.key===S[0]);return it&&it.kind==='el'?it:null}catch(e){return null}}
const ov=key=>((PE.p.fx||{}).tov||{})[key]||{};
function setOv(key,k,v){const f=PE.p.fx=PE.p.fx||{};f.tov=f.tov||{};f.tov[key]=f.tov[key]||{};if(v===''||v==null||v===false)delete f.tov[key][k];else f.tov[key][k]=v;if(!Object.keys(f.tov[key]).length)delete f.tov[key];if(!Object.keys(f.tov).length)delete f.tov}
function redraw(){try{TC&&TC.clear&&TC.clear()}catch(e){}try{peDraw()}catch(e){}try{peTopDirty()}catch(e){}}
const num=(k,l,v,step,min,max)=>`<label class="v213f"><span>${l}</span><input type="number" data-v213f="${k}" value="${v}" step="${step}" ${min!=null?`min="${min}"`:''} ${max!=null?`max="${max}"`:''} inputmode="decimal"></label>`;
function typoHtml(){const it=selOne();if(!it||!TEXTY.has(it.t))return '';const e=specEl(it.key);if(!e)return '';const o=ov(it.key);const small=e.kind==='small';const t=e.t;const size=o.size||e.size||(t==='text'?(small?22:70):t==='caption'?64:t==='stat'?200:26);const w=o.w||e.w||(t==='text'?(small?400:800):t==='caption'?700:700);
  let h=`<div class="v213t" id="v213t"><div class="v53l">טיפוגרפיה של האלמנט</div><div class="v213grid">${num('size','גודל (px)',size,1,10,400)}<label class="v213f"><span>משקל</span><select data-v213f="w">${[[300,'דק'],[400,'רגיל'],[500,'בינוני'],[700,'מודגש'],[800,'עבה'],[900,'שחור']].map(([k,l])=>`<option value="${k}"${+w===k?' selected':''}>${l}</option>`).join('')}</select></label>`;
  if(t==='text'&&!small||t==='caption')h+=num('lh','גובה שורה',o.lh||e.lh||(t==='caption'?1.28:1.04),0.02,0.8,2.2);
  if(t==='text')h+=num('track','ריווח אותיות',o.track!=null?o.track:(e.track!=null?e.track:(small?1:0)),0.01,-0.2,0.6);
  if(t==='text'||t==='caption'||t==='pill')h+=`<label class="v213f"><span>יישור</span><select data-v213f="align">${[['right','ימין'],['center','מרכז'],['left','שמאל']].map(([k,l])=>`<option value="${k}"${(o.align||e.align||'right')===k?' selected':''}>${l}</option>`).join('')}</select></label>`;
  if(t==='text'&&!small)h+=`<label class="v213f"><span>קו מתאר</span><select data-v213f="stroke">${COLS.map(([k,l])=>`<option value="${k}"${(o.stroke||e.stroke||'')===k?' selected':''}>${l}</option>`).join('')}</select></label><label class="v213f chk"><input type="checkbox" data-v213f="shadow"${(o.shadow!=null?o.shadow:e.shadow)?' checked':''}> צל רך</label>`;
  if(t==='text'||t==='caption')h+=num('maxW','רוחב מרבי (px)',o.maxW||e.maxW||936,10,120,1080);
  h+=`</div><div class="v53row2"><button type="button" class="px-btn sm ghost" data-v213r="1" ${Object.keys(o).length?'':'disabled'}>איפוס לעיצוב התבנית</button></div></div>`;return h}
// the typography block lives inside the layers panel, right under the selection inspector
let obT=0;const ob=new MutationObserver(()=>{clearTimeout(obT);obT=setTimeout(inject,40)});
function inject(){const p=$('#pe-root .pe-body #v53p');if(!p)return;const old=p.querySelector('#v213t');const html=typoHtml();if(old&&!html){old.remove();return}if(!html)return;if(old){if(old.dataset.key===(selOne()||{}).key&&document.activeElement&&old.contains(document.activeElement))return;old.outerHTML=html;$('#v213t').dataset.key=(selOne()||{}).key;return}
  const mark=p.querySelector('.v53l.big');if(mark){mark.insertAdjacentHTML('beforebegin',html);$('#v213t').dataset.key=(selOne()||{}).key}}
function watch(){const r=document.getElementById('pe-root');if(!r)return;ob.observe(r,{childList:true,subtree:true});inject()}
if(typeof peOpen==='function')peOpen=(f=>function(){const r=f.apply(this,arguments);setTimeout(watch,0);return r})(peOpen);
if(typeof peClose==='function')peClose=(f=>function(){try{ob.disconnect()}catch(e){}return f.apply(this,arguments)})(peClose);
if(typeof peRender==='function')peRender=(f=>function(){const r=f.apply(this,arguments);setTimeout(inject,0);return r})(peRender);
let armed=false;
document.addEventListener('focusout',e=>{if(e.target.closest&&e.target.closest('#v213t,#v213adj'))armed=false},true);
document.addEventListener('change',e=>{const t=e.target;const k=t.dataset&&t.dataset.v213f;if(!k||!t.closest('#v213t'))return;const it=selOne();if(!it)return;if(!armed){try{pePush()}catch(x){}armed=true}
  let v=t.type==='checkbox'?t.checked:t.value;if(t.type==='number'){v=+v;if(!isFinite(v))return}if(k==='w'||k==='size'||k==='maxW')v=+v;const sp=specEl(it.key)||{};const same=(k==='shadow'?!!sp.shadow===v:String(sp[k]!=null?sp[k]:'')===String(v));if(k==='size'&&!sp.size&&v===(sp.kind==='small'?22:70))setOv(it.key,k,'');else setOv(it.key,k,same?'':v);PE.p.upd=new Date().toISOString();redraw();const b=$('#v213t [data-v213r]');if(b)b.disabled=!Object.keys(ov(it.key)).length},true);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v213r]');if(!b)return;const it=selOne();if(!it)return;e.preventDefault();try{pePush()}catch(x){}const f=PE.p.fx||{};if(f.tov){delete f.tov[it.key];if(!Object.keys(f.tov).length)delete f.tov}redraw();inject()},true);
// ---------- light adjustments per photo, from the photo toolbar ----------
const ADJ=[['exp','חשיפה'],['con','ניגודיות'],['sat','רוויה'],['temp','חום וקור']];
function adjOpen(on){const old=$('#v213adj');if(old){old.remove();return}if(!on||on.kind!=='slot')return;const s=peSlots(PE.p)[on.i];if(!s||s.legacy)return;const a=Object.assign({exp:0,con:0,sat:0,temp:0},s.o.adj||{});const tb=$('#v206tb');if(!tb)return;const d=document.createElement('div');d.id='v213adj';d.className='v213adj';d.innerHTML=`<b>תאורה לתמונה הזו</b>${ADJ.map(([k,l])=>`<label><span>${l}<output>${Math.round(a[k]*100)}</output></span><input type="range" data-v213a="${k}" min="-1" max="1" step="0.02" value="${a[k]}"></label>`).join('')}<div class="v213row"><button type="button" class="v206b" data-v213a="flip" aria-pressed="${!!s.o.flip}">היפוך אופקי</button><button type="button" class="v206b" data-v213a="reset">איפוס</button><button type="button" class="v206b" data-v213a="all">תאורה לכל הפוסט</button><button type="button" class="v206ib" data-v213a="x" aria-label="סגירה">✕</button></div>`;tb.parentElement.appendChild(d);Object.assign(d.style,{left:tb.style.left,top:(parseFloat(tb.style.top)+tb.offsetHeight+6)+'px'})}
function slotOn(){const on=window.__v206&&__v206.TB.on;return on&&on.kind==='slot'?peSlots(PE.p)[on.i]:null}
document.addEventListener('input',e=>{const t=e.target;const k=t.dataset&&t.dataset.v213a;if(!k||!t.closest('#v213adj')||t.type!=='range')return;const s=slotOn();if(!s)return;if(!armed){try{pePush()}catch(x){}armed=true}s.o.adj=Object.assign({exp:0,con:0,sat:0,temp:0},s.o.adj||{});s.o.adj[k]=+t.value;const o=t.closest('label').querySelector('output');if(o)o.textContent=Math.round(+t.value*100);PE.p.upd=new Date().toISOString();redraw()},true);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#v213adj [data-v213a]');if(!b)return;e.preventDefault();e.stopPropagation();const a=b.dataset.v213a;const s=slotOn();if(a==='x'){$('#v213adj').remove();return}if(!s)return;try{pePush()}catch(x){}
  if(a==='flip'){s.o.flip=!s.o.flip;b.setAttribute('aria-pressed',String(!!s.o.flip))}else if(a==='reset'){delete s.o.adj;delete s.o.flip;$('#v213adj').querySelectorAll('input[type=range]').forEach(r=>{r.value=0;r.closest('label').querySelector('output').textContent='0'})}else if(a==='all'){PE.tab='light';$('#v213adj').remove();try{peRender()}catch(x){}return}
  PE.p.upd=new Date().toISOString();redraw()},true);
window.addEventListener('pointerdown',e=>{if($('#v213adj')&&!(e.target.closest&&e.target.closest('#v213adj,#v206tb')))$('#v213adj').remove()},true);
window.__v213={typoHtml,adjOpen,setOv,ov,inject};
})();
/*V213:END*/
