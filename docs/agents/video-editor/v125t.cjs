const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o={};
o.count=await E(`(()=>{const D=__v46x.D.filter(d=>d.cat==='studio');const fam={};D.forEach(d=>fam[d.fam]=(fam[d.fam]||0)+1);return {n:D.length,fam,cat:__v46x.CATS.studio,presets:PE_PRE.map(x=>x[0]).slice(-6)}})()`);
// each family draws pixels on a blank canvas
o.draws=await E(`(()=>{const out={};const fams=[...new Set(__v46x.D.filter(d=>d.cat==='studio').map(d=>d.fam))];fams.forEach(f=>{const d=__v46x.D.find(x=>x.cat==='studio'&&x.fam===f);const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d');x.fillStyle='#808080';x.fillRect(0,0,1080,1350);try{__v46x.drawDeco(c,[d.id])}catch(e){out[f]='ERR '+e.message;return}const px=x.getImageData(0,0,1080,1350).data;let ch=0;for(let i=0;i<px.length;i+=40){if(Math.abs(px[i]-128)>6||Math.abs(px[i+1]-128)>6||Math.abs(px[i+2]-128)>6)ch++}out[f]=ch});return out})()`);
// a real post with several studio elements, in the editor
await E(`(()=>{const d=AG.posts.find(x=>/^x_t_/.test(x.layout)&&!x.tpl&&peSlots(x).length);peOpen(d)})()`);await p.waitForTimeout(1500);
await E(`(()=>{PE.p.fx=PE.p.fx||{};PE.p.fx.deco=['v125_leak_tr_warm','v125_ring_mid_10_red','v125_tag_0_tl_red'];peRender()})()`);await p.waitForTimeout(1500);
await p.screenshot({path:'ux/v125_post.png'});
// the lighting tab shows the new looks and one applies
await E(`PE.tab='light';peRender()`);await p.waitForTimeout(900);
o.light=await p.evaluate(()=>{const bs=[...document.querySelectorAll('#pe-root [data-pe-a="pre"]')];const b=bs.find(x=>x.textContent.includes('קולנועי'));if(!b)return {n:bs.length,found:false};b.click();return {n:bs.length,found:true}});await p.waitForTimeout(600);
o.adj=await E(`JSON.stringify(PE.p.fx.adj)`);
// the full-screen shapes library lists the category
await E(`PE.tab='shape';peRender()`);await p.waitForTimeout(800);await p.evaluate(()=>{const b=document.querySelector('[data-v68open]');b&&b.click()});await p.waitForTimeout(1500);
o.lib=await p.evaluate(()=>{const c=[...document.querySelectorAll('#v68sp [data-v68cat]')].find(b=>b.dataset.v68cat==='studio');if(!c)return 'no chip';c.click();return new Promise(r=>setTimeout(()=>r({chip:c.textContent.trim(),tiles:document.querySelectorAll('#v68sp .v68c').length}),900))});
await p.screenshot({path:'ux/v125_lib.png'});
o.errors=errs.slice(0,3);console.log(JSON.stringify(o,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
