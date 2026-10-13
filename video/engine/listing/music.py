import numpy as np, wave
import listing_reel as render
SR=48000;BPM=120;B=60/BPM
tl,total=render.timeline();DUR=total/30+0.6
n=int(SR*DUR);L=np.zeros(n);R=np.zeros(n)
t=np.arange(n)/SR
def add(sig,at,gain=1.0,pan=0.0):
    i=int(at*SR)
    if i>=n: return
    j=min(n,i+len(sig));s=sig[:j-i]*gain
    L[i:j]+=s*(1-max(0,pan));R[i:j]+=s*(1+min(0,pan))
def env(d,a=.002,r=.2):
    k=np.arange(int(SR*d))/SR;return np.minimum(1,k/a)*np.exp(-k/r)
kick=lambda:np.sin(2*np.pi*(45+90*np.exp(-np.arange(int(SR*.4))/SR/.04))*np.arange(int(SR*.4))/SR)*env(.4,.001,.13)
rng=np.random.default_rng(3)
def hat(d=.06):x=rng.standard_normal(int(SR*d));x=np.diff(x,prepend=0);return x*env(d,.001,.018)
def clap():x=rng.standard_normal(int(SR*.25));x=np.convolve(x,np.ones(6)/6,'same');return x*env(.25,.001,.06)
# chords: Am F C G (warm, modern)
prog=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]]
f=lambda m:440*2**((m-69)/12)
bars=int(DUR/(4*B))+1
for b in range(bars):
    t0=b*4*B;ch=prog[b%4]
    # pad
    d=4*B;k=np.arange(int(SR*d))/SR;pad=sum(np.sin(2*np.pi*f(m)*k)+.3*np.sin(2*np.pi*f(m)*2.003*k) for m in ch)/6
    pad*=np.minimum(1,k/.25)*np.minimum(1,(d-k)/.3);add(pad,t0,.16,0)
    # bass on offbeats
    for q in range(8):
        bt=t0+q*B/2
        if q%2==1:
            k=np.arange(int(SR*B*.45))/SR;bs=np.tanh(2*np.sin(2*np.pi*f(ch[0]-12)*k))*env(B*.45,.004,.12);add(bs,bt,.22)
    for q in range(4):
        bt=t0+q*B
        if bt>0.9: add(kick(),bt,.95)
        add(hat(),bt+B/2,.18,.3);add(hat(.03),bt+B/4,.07,-.3);add(hat(.03),bt+3*B/4,.07,-.3)
        if q in (1,3) and bt>2: add(clap(),bt,.28)
# a soft riser into the hero and a stop before the end card
cuts=[s/30 for s,_,_ in tl]
for c in cuts[1:]:
    k=np.arange(int(SR*.18))/SR;sw=rng.standard_normal(len(k));sw=np.convolve(sw,np.ones(30)/30,'same')*np.sin(np.pi*k/.18)**2;add(sw,c-.12,.25)
m=np.max(np.abs(np.stack([L,R])));L/=m*1.1;R/=m*1.1
fade=np.minimum(1,(DUR-t)/1.2);L*=fade;R*=fade
st=(np.stack([L,R],1)*32767).astype(np.int16)
w=wave.open('out/music.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(st.tobytes());w.close()
print('music',DUR)
