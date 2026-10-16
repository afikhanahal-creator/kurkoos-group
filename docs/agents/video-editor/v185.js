// ================= V185 · every competitor card opens its Meta Ad Library: one button per page the audit found (meta_library_urls,
// written by the scan agent), or a search by name when the company has no page. The links open the public library in a new tab;
// nothing is fetched from Facebook by the system.
(()=>{
if(window.__v185)return;window.__v185=1;
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const safe=u=>{try{const x=new URL(String(u||''));return x.protocol==='https:'&&/(^|\.)facebook\.com$/.test(x.hostname)?x.href:''}catch(e){return ''}};
const EXT='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>';
function compOf(cid){try{return (APP.comps&&APP.comps[cid])||(typeof compList==='function'?compList().find(x=>String(x.id)===String(cid)):null)}catch(e){return null}}
function linksHtml(c){let L=Array.isArray(c.meta_library_urls)?c.meta_library_urls.filter(x=>x&&safe(x.url)):[];
 if(!L.length)L=[{label:'חיפוש לפי שם',url:`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=IL&q=${encodeURIComponent(c.name||'')}&search_type=keyword_unordered`}];
 const one=L.length===1;
 return `<div class="v185" role="group" aria-label="ספריית המודעות של Meta"><span class="v185k">ספריית Meta</span>${L.slice(0,6).map(x=>`<a class="v185a" href="${E(safe(x.url))}" target="_blank" rel="noopener">${E(one&&!/חיפוש/.test(x.label)?'כל המודעות':x.label)} ${EXT}</a>`).join('')}${L.length>6?`<span class="v185m">ועוד ${L.length-6}</span>`:''}</div>`}
try{vComps=(f=>function(){const html=f.apply(this,arguments);try{const t=document.createElement('template');t.innerHTML=html;
 t.content.querySelectorAll('article.cc').forEach(a=>{const b=a.querySelector('[data-cid]');if(!b||a.querySelector('.v185'))return;const c=compOf(b.dataset.cid);if(!c)return;
  const at=a.querySelector('details.v181sec')||a.querySelector('details.v179sec')||a.querySelector('.ca');if(at)at.insertAdjacentHTML('beforebegin',linksHtml(c))});return t.innerHTML}catch(e){console.warn('v185',e);return html}})(vComps)}catch(e){console.error('v185 vComps',e)}
window.__v185={linksHtml};
})();
