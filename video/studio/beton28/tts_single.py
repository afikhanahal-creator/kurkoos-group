# one continuous read of the whole narration (one voice, one request), cut at the pauses into v01..v11
import base64,json,subprocess,sys,re,urllib.request,os
sys.path.insert(0,'/home/user/kurkoos-group/video/studio/beton28');import tts
L=tts.lines();OUT=tts.OUT
fix=lambda t:t.replace('לחוזק','לְחוֹזֶק').replace('מקרקע','מִקַּרְקַע').replace('החוזק','הַחוֹזֶק')
txt='\n\n'.join(fix(re.sub(r'<break[^>]*/>',' ',re.sub(r'</?speak>','',s)).strip()) for _,_,_,s in L)
model=sys.argv[1] if len(sys.argv)>1 else 'gemini-3.8-flash-lite-tts'
body={'contents':[{'parts':[{'text':txt}]}],'generationConfig':{'responseModalities':['AUDIO'],'speechConfig':{'voiceConfig':{'prebuiltVoiceConfig':{'voiceName':'Charon'}}}}}
r=urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
d=json.load(urllib.request.urlopen(r,timeout=300))['candidates'][0]['content']['parts'][0]['inlineData']['data']
open('full.pcm','wb').write(base64.b64decode(d))
subprocess.check_call(['ffmpeg','-v','error','-y','-f','s16le','-ar','24000','-ac','1','-i','full.pcm','-ar','48000','full.wav'])
print('full',tts.dur('full.wav'))
# find pauses
for th in (0.45,0.38,0.32,0.28,0.24,0.2):
    o=subprocess.run(['ffmpeg','-i','full.wav','-af',f'silencedetect=n=-38dB:d={th}','-f','null','-'],capture_output=True,text=True).stderr
    st=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',o)];en=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',o)]
    gaps=[(s,e) for s,e in zip(st,en) if s>0.1]
    if len(gaps)>=len(L)-1: break
gaps=sorted(gaps,key=lambda g:g[1]-g[0],reverse=True)[:len(L)-1];gaps.sort()
print('gaps',len(gaps),[(round(s,2),round(e,2)) for s,e in gaps])
if len(gaps)!=len(L)-1: sys.exit('could not split into %d lines'%len(L))
cuts=[0]+[ (s+e)/2 for s,e in gaps]+[tts.dur('full.wav')]
for i,(name,start,end,_) in enumerate(L):
    p=os.path.join(OUT,name+'.wav')
    subprocess.check_call(['ffmpeg','-v','error','-y','-ss',str(cuts[i]),'-to',str(cuts[i+1]),'-i','full.wav','-af','silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',p])
    print(name,round(tts.dur(p),2),'slot',round(end-start,2))
