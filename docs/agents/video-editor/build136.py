import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V136 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak136')
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80]); s=s.replace(a,b)
M='// ================= V83 · safe external opener'
# export: the audio context and video element prepared inside the tap (iPhone), and no wait for an event that already fired
rep("const AC=new (window.AudioContext||window.webkitAudioContext)(),dst=AC.createMediaStreamDestination()",
    "const AC=(window.__v137&&__v137.takeAC())||new (window.AudioContext||window.webkitAudioContext)(),dst=AC.createMediaStreamDestination()")
rep("const v=document.createElement('video');v.src=E.urls[p.id];v.playsInline=true;v.crossOrigin='anonymous';await new Promise(r=>{v.onloadeddata=r;v.onerror=r});",
    "let v=window.__v137&&__v137.takeVideo(E.urls[p.id]);if(!v){v=document.createElement('video');v.src=E.urls[p.id];v.playsInline=true;v.setAttribute('playsinline','');v.crossOrigin='anonymous'}if(AC.state==='suspended')AC.resume().catch(()=>{});if(v.readyState<2)await new Promise(r=>{v.onloadeddata=r;v.oncanplay=r;v.onerror=r;setTimeout(r,6000);try{v.load()}catch(x){}});")
rep("let t=0,last=performance.now(),started=false;","let t=0,last=performance.now(),started=false;const XS={since:performance.now(),seek:false};")
# a video that will not play is stepped through frame by frame, so the export never stalls
rep("if(ph.p==='clip'){if(!started){started=true;v.currentTime=p.in||0;v.play().catch(()=>{})}if(!v.paused&&!v.seeking)t=ph.c.start+Math.max(0,v.currentTime-(p.in||0));",
    "if(ph.p==='clip'){if(!started){started=true;v.currentTime=p.in||0;v.play().catch(()=>{});XS.since=now}if(!XS.seek&&!v.paused&&!v.seeking){t=ph.c.start+Math.max(0,v.currentTime-(p.in||0));XS.since=now}else if(!XS.seek&&now-XS.since>1200){if(!v.muted){v.muted=true;XS.muted=true;if(E.busy)E.busy.label='מייצא בלי הקול של הסרטון: הטלפון חסם אותו';setTimeout(()=>toastSafe('הטלפון חסם את הקול של הסרטון, אז הקובץ יצא בלי הקול המקורי. ייצוא מהמחשב ישמור אותו'),200)}v.play().catch(()=>{});if(now-XS.since>4500){XS.seek=true;if(E.busy)E.busy.label='מייצא תמונה אחר תמונה (הטלפון לא הפעיל את הסרטון)'}}if(XS.seek){t+=(now-last)/1000;const want=(p.in||0)+(t-ph.c.start);if(!v.seeking&&Math.abs(v.currentTime-want)>0.04)v.currentTime=want}")
# cloud effects get their browser stand-in in preview and export
rep("function fxOn(p,t,kind){return p.layers.filter(l=>l.type==='fx'&&l.fx===kind&&t>=l.start&&t<=l.end)}",
    "function fxOn(p,t,kind){const ex=(window.__v137&&p.fx&&p.fx.length)?__v137.stands(p,seq()):[];return p.layers.concat(ex).filter(l=>l.type==='fx'&&l.fx===kind&&t>=l.start&&t<=l.end)}")
# the editor's video decodes a frame on phones
rep("v.addEventListener('seeked',()=>{if(!E.playing)draw()});v.addEventListener('loadeddata',()=>draw())}",
    "v.addEventListener('seeked',()=>{if(!E.playing)draw()});v.addEventListener('loadeddata',()=>draw());v.addEventListener('canplay',()=>draw());if(window.__v137)__v137.prime(v)}")
# an effect tapped on the intro lands on the video; the cursor then moves past it for the next one
rep("else if(a==='addfx'){const f=BFX.find(x=>x[0]===b.dataset.fx);addLayer({id:uid('f'),type:'fx',fx:f[0],start:t,end:Math.min(seq().total,t+f[2]),amt:1});toastSafe(f[1]+' נוסף ב-'+fmtT(t))}",
    "else if(a==='addfx'){const f=BFX.find(x=>x[0]===b.dataset.fx);const s0=seq(),c0=s0.clips[0];let at=t;const onIntro=phaseOf(s0,t).p!=='clip';if(onIntro&&c0)at=c0.start+0.2;at=Math.min(at,Math.max(c0?c0.start:0,s0.clipsEnd-f[2]));addLayer({id:uid('f'),type:'fx',fx:f[0],start:at,end:Math.min(s0.total,at+f[2]),amt:1});E.t=Math.min(s0.clipsEnd-0.05,at+f[2]+0.3);draw();toastSafe(f[1]+' נוסף ב-'+fmtT(at)+(onIntro?' (תחילת הסרטון)':'')+'. הסמן התקדם, כך שהאפקט הבא ייכנס אחריו')}")
s=s.replace(M,open('v136.js',encoding='utf8').read()+'\n'+open('v137.js',encoding='utf8').read()+'\n'+M)
s=s.replace('</head>',open('k136css.txt',encoding='utf8').read()+'\n</head>',1)
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
