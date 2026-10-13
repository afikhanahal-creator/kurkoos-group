import numpy as np, wave
SR=48000;B=0.5;DUR=36.4;n=int(SR*DUR);L=np.zeros(n);R=np.zeros(n);rng=np.random.default_rng(7)
def add(sig,at,g=1.0,pan=0):
    i=int(at*SR)
    if i>=n:return
    j=min(n,i+len(sig));s=sig[:j-i]*g;L[i:j]+=s*(1-max(0,pan));R[i:j]+=s*(1+min(0,pan))
def env(d,a=.002,r=.2):k=np.arange(int(SR*d))/SR;return np.minimum(1,k/a)*np.exp(-k/r)
def kick():k=np.arange(int(SR*.35))/SR;return np.sin(2*np.pi*(48+110*np.exp(-k/.035))*k)*env(.35,.001,.11)
def hat(d=.05):x=np.diff(rng.standard_normal(int(SR*d)),prepend=0);return x*env(d,.001,.015)
def snare():x=rng.standard_normal(int(SR*.22));x=np.convolve(x,np.ones(5)/5,'same');k=np.arange(len(x))/SR;return (x*.8+np.sin(2*np.pi*190*k)*.5)*env(.22,.001,.07)
f=lambda m:440*2**((m-69)/12)
prog=[[50,57,62,65],[46,53,58,62],[53,57,60,65],[48,55,60,64]]   # Dm Bb F C
bars=int(DUR/(4*B))+1
for b in range(bars):
    t0=b*4*B;ch=prog[b%4];d=4*B;k=np.arange(int(SR*d))/SR
    pad=sum(np.sin(2*np.pi*f(m)*k)+.25*np.sin(2*np.pi*f(m+12)*1.002*k) for m in ch)/8;pad*=np.minimum(1,k/.3)*np.minimum(1,(d-k)/.3);add(pad,t0,.14)
    for q in range(8):
        bt=t0+q*B/2;kk=np.arange(int(SR*B*.4))/SR
        if q%2==1:add(np.tanh(2.2*np.sin(2*np.pi*f(ch[0]-12)*kk))*env(B*.4,.003,.1),bt,.24)
        add(hat(),bt+B/4,.12,.25)
    for q in range(4):
        bt=t0+q*B
        if bt>0.4:add(kick(),bt,.95)
        if q in(1,3) and bt>1:add(snare(),bt,.32)
cuts=[float(x) for x in open('out/cuts.txt')]
for c in cuts[1:]:
    k=np.arange(int(SR*.16))/SR;sw=np.convolve(rng.standard_normal(len(k)),np.ones(25)/25,'same')*np.sin(np.pi*k/.16)**2;add(sw,c-.1,.3)
m=np.abs(np.stack([L,R])).max();L/=m*1.1;R/=m*1.1;t=np.arange(n)/SR;fd=np.minimum(1,(DUR-t)/1.5);L*=fd;R*=fd
w=wave.open('out/music.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.stack([L,R],1)*32767).astype(np.int16).tobytes());w.close();print('ok')
