// ================= V155 · one signature block in every post: the brand line, the phone, the link and the hashtags, each on its own line with a blank line between
(function(){
const SIG='קבוצת קורקוס. מקרקע ועד מסירת מפתח.',TAGS='#קבוצתקורקוס #בנייתוילות #הודהשרון';
const RX=/^([\s\S]*?)קבוצת קורקוס(?:\.|\s·)\s*מקרקע ועד מסירת מפתח\.?[ \t]*(?:\n[ \t]*055-981-1814[ \t]*(?:·[ \t]*(\S+))?)?[ \t]*(?:\n[ \t]*(kurkoos-group\.co\.il\S*))?\s*((?:#[^\n]*\s*)*)$/;
function fixSig(fb){if(typeof fb!=='string')return fb;const m=fb.match(RX);if(!m)return fb;
  let body=m[1].replace(/[ \t\n]+$/,'').replace(/\n\n[^\n]{0,40}055-981-1814\.?$/,'').replace(/[ \t\n]+$/,'');
  let link=m[2]||m[3]||'kurkoos-group.co.il';if(!/^https?:\/\//.test(link))link='https://www.'+link.replace(/^www\./,'');
  let tags=(m[4]||'').replace(/\s+/g,' ').trim()||TAGS;
  return `${body}\n\n${SIG}\n\n055-981-1814\n\n${link}\n\n${tags}`}
window.__v155={fixSig};
try{saveAgent=(f=>function(){try{(AG.posts||[]).forEach(p=>{if(p&&typeof p.fb==='string'){const n=fixSig(p.fb);if(n!==p.fb)p.fb=n}})}catch(e){}return f.apply(this,arguments)})(saveAgent)}catch(e){}
})();
