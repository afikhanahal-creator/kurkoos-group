// ================= V151 · type variety: every post gets one of five typographic voices built from the uploaded Almoni weights
//                   (classic, contrast 900 over 300, narrow Almoni Tzar headlines, light display, narrow with light text).
//                   Chosen per post (stable), changeable in the editor, applied at draw time so it covers existing and future posts =================
(function(){
const STY={auto:'אוטומטי',classic:'קלאסי',contrast:'ניגוד חזק',narrow:'צר ודחוס',light:'עדין',narrowlight:'צר ועדין'};
const tzar=()=>{try{return document.fonts.check('800 40px "Almoni Tzar"')&&[...document.fonts].some(f=>f.family.replace(/"/g,'')==='Almoni Tzar'&&f.status==='loaded')}catch(e){return false}};
const has=w=>{try{return [...document.fonts].some(f=>f.family.replace(/"/g,'')==='Almoni'&&f.status==='loaded'&&String(f.weight).split(' ').includes(String(w)))}catch(e){return false}};
function hash(s){let h=0;s=String(s||'');for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)}
function styleOf(p){const t=p&&p.typo;if(t&&t!=='auto'&&STY[t])return t;const n=hash((p&&(p.id||p.key))||'')%100;const s=n<28?'classic':n<52?'contrast':n<74?'narrow':n<88?'light':'narrowlight';if((s==='narrow'||s==='narrowlight')&&!tzar())return 'contrast';return s}
const RE=/^\s*(?:(italic|normal|oblique)\s+)?(?:(\d{3}|bold|normal)\s+)?([\d.]+)px\s+(.+)$/;
function remap(v,st){if(st==='classic')return v;const m=String(v).match(RE);if(!m)return v;const fam=m[4];if(!/^"?Almoni"?\s*(,|$)/.test(fam))return v;
 let w=m[2]==='bold'?700:m[2]&&m[2]!=='normal'?+m[2]:400;const s=+m[3];const disp=w>=700&&s>=34,text=w<=500&&s>=18&&s<34;let F=fam;
 if(st==='contrast'){if(disp)w=900;else if(text&&has(300))w=300}
 else if(st==='narrow'){if(disp){F='"Almoni Tzar", '+fam;w=800}}
 else if(st==='light'){if(w>=700&&s>=70)w=has(500)?500:400;else if(disp)w=700;else if(text&&has(300))w=300}
 else if(st==='narrowlight'){if(disp){F='"Almoni Tzar", '+fam;w=800}else if(text&&has(300))w=300}
 return `${m[1]?m[1]+' ':''}${w} ${s}px ${F}`}
let CUR=null;
try{const P=CanvasRenderingContext2D.prototype;const d=Object.getOwnPropertyDescriptor(P,'font');
 Object.defineProperty(P,'font',{configurable:true,get(){return d.get.call(this)},set(v){if(CUR&&this.canvas&&this.canvas.__v151!==false){try{v=remap(v,CUR)}catch(e){}}d.set.call(this,v)}})}catch(e){}
try{drawSlide=(f=>function(cv,p){const prev=CUR;CUR=p?styleOf(p):null;try{return f.apply(this,arguments)}finally{CUR=prev}})(drawSlide)}catch(e){}
// thumbnails are cached per post look; the voice is part of that look
try{sigOf=(f=>function(p){return f.apply(this,arguments)+'|ty:'+styleOf(p)+(tzar()?'t':'')})(sigOf)}catch(e){}
// when the fonts finish loading, cached drawings are redrawn with them
try{document.fonts.addEventListener('loadingdone',()=>{try{TC.clear()}catch(e){}clearTimeout(window.__v151r);window.__v151r=setTimeout(()=>{try{if(typeof PE!=='undefined'&&PE.p)peRender();else render()}catch(e){}},300)})}catch(e){}
// editor: choose the voice of this post
try{peText=(f=>function(){const h=f.apply(this,arguments);const p=PE.p;if(!p)return h;const cur=p.typo||'auto';const eff=styleOf(p);
 return h+`<div class="pe-sec v151"><div class="pe-l">סגנון טיפוגרפיה <small>כל המשקלים של Almoni${tzar()?' ו-Almoni צר':''}. עכשיו: ${STY[eff]}</small></div><div class="pe-chips">${Object.entries(STY).map(([k,l])=>`<button type="button" data-v151="${k}" aria-pressed="${cur===k}">${l}</button>`).join('')}</div></div>`})(peText)}catch(e){}
document.addEventListener('click',ev=>{const b=ev.target.closest&&ev.target.closest('[data-v151]');if(!b||typeof PE==='undefined'||!PE.p)return;ev.preventDefault();try{pePush()}catch(e){}const k=b.dataset.v151;if(k==='auto')delete PE.p.typo;else PE.p.typo=k;try{TC.clear()}catch(e){}peRender()},true);
window.__v151={styleOf,remap,STY,tzar};
})();
