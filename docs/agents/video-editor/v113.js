// ================= V113 · no more freezes: the clarity gate remembers which posts already passed (so a reload checks only
//                   what changed instead of redrawing every post), photo usage is memoised while a pass runs, posts from
//                   new photos are built a few at a time between frames, imports breathe between files and read image
//                   sizes from the file header instead of decoding =================
(function(){
// ---- 1. clarity gate verdicts survive a reload
const KEY='v73_ok_v1';const sig=p=>(p.id||'')+'|'+p.layout+'|'+((p.visual||{}).headline||'')+'|'+((p.visual||{}).sub||'')+'|'+((p.fx||{}).num||'')+'|'+(p.format||'');
let OK={};try{OK=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){}
function seed(){if(typeof AG==='undefined'||!AG.posts)return 0;let n=0;AG.posts.forEach(p=>{const s=sig(p);if(OK[s]&&p._ovk!==s){p._ovk=s;n++}});return n}
let pt=0;function persist(){clearTimeout(pt);pt=setTimeout(()=>{try{if(typeof AG==='undefined')return;const o={};let n=0;AG.posts.forEach(p=>{if(p._ovk&&p._ovk===sig(p)){o[p._ovk]=1;n++}});if(n){OK=o;localStorage.setItem(KEY,JSON.stringify(o))}}catch(e){}},1500)}
if(typeof appInit==='function')appInit=(f=>async function(){const r=await f.apply(this,arguments);try{seed()}catch(e){}return r})(appInit);
try{seed()}catch(e){}
if(typeof saveAgent==='function')saveAgent=(f=>function(){const r=f.apply(this,arguments);persist();return r})(saveAgent);
setInterval(persist,12000);
// ---- 2. photo usage counts are computed once per pass, not once per post
if(typeof usage==='function')usage=(f=>function(){const now=performance.now();if(usage._c&&now-usage._t<250)return usage._c;const r=f.apply(this,arguments);usage._c=r;usage._t=now;return r})(usage);
// ---- 3. posts from new photos, a few at a time, one render at the end
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function breath(ms){await sleep(ms||120);while(document.hidden)await sleep(1000)}
async function buildChunked(opts={}){const per=opts.per||2;const out={made:0,div:0,chunks:0};if(!window.__v107||typeof __v107.build!=='function')return out;
 const keys=__v107.photoKeys();for(let i=0;i<keys.length;i+=5){const chunk=keys.slice(i,i+5);try{const r=__v107.build({per,keys:chunk,quiet:1});out.made+=r&&r.made||0}catch(e){}out.chunks++;await sleep(60)}
 if(out.made){try{saveAgent()}catch(e){}await sleep(60);try{renderAgent()}catch(e){}await sleep(60);try{render()}catch(e){}}
 if(opts.diversify!==false){await sleep(120);try{const d=window.__v104&&__v104.diversify({cap:3});out.div=d&&d.changed||0}catch(e){}}
 return out}
// ---- 4. image size from the header (png, jpeg, webp); decoding only as a fallback
const rd32=(b,i)=>((b[i]<<24)|(b[i+1]<<16)|(b[i+2]<<8)|b[i+3])>>>0;
function parse(b){if(b.length<30)return null;
 if(b[0]===0x89&&b[1]===0x50&&b[2]===0x4e)return {w:rd32(b,16),h:rd32(b,20)};
 if(b[0]===0xff&&b[1]===0xd8){let i=2;while(i+9<b.length){if(b[i]!==0xff){i++;continue}const m=b[i+1];if(m===0xd8||m===0x01||(m>=0xd0&&m<=0xd7)){i+=2;continue}const len=(b[i+2]<<8)|b[i+3];if(m>=0xc0&&m<=0xcf&&m!==0xc4&&m!==0xc8&&m!==0xcc)return {h:(b[i+5]<<8)|b[i+6],w:(b[i+7]<<8)|b[i+8]};i+=2+len}return null}
 if(b[0]===0x52&&b[1]===0x49&&b[8]===0x57&&b[9]===0x45){const t=String.fromCharCode(b[12],b[13],b[14],b[15]);if(t==='VP8 ')return {w:(b[26]|(b[27]<<8))&0x3fff,h:(b[28]|(b[29]<<8))&0x3fff};if(t==='VP8L'){const x=(b[21]|(b[22]<<8)|(b[23]<<16)|(b[24]<<24))>>>0;return {w:(x&0x3fff)+1,h:((x>>14)&0x3fff)+1}}if(t==='VP8X')return {w:1+(b[24]|(b[25]<<8)|(b[26]<<16)),h:1+(b[27]|(b[28]<<8)|(b[29]<<16))}}
 return null}
async function dims(blob){try{const buf=new Uint8Array(await blob.slice(0,65536).arrayBuffer());const d=parse(buf);if(d&&d.w>0&&d.h>0)return d}catch(e){}
 try{const bm=await createImageBitmap(blob);const r={w:bm.width,h:bm.height};bm.close&&bm.close();return r}catch(e){return {w:0,h:0}}}
window.__v113={seed,persist,buildChunked,breath,dims,parse,sig};
})();
