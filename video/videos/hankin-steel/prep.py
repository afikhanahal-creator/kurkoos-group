"""Cuts each shot out of the handheld clip and locks it to the scene: the camera motion is tracked frame by frame
(LK optical flow + RANSAC similarity), every frame of a shot is warped into the first frame's coordinates, and a 9:16
window is cropped from the area that stays valid for the whole shot. The result is a static shot, no pan, no shake.
A shot whose steady area is too small for a 9:16 window of at least MIN_H source pixels fails loudly, and is dropped
from the plan by hand. Output 1080x1920 (an upscale of the 848x474 source, so lanczos + unsharp + light grain),
brand grade: teal in the shadows, the earth kept warm. python3 prep.py"""
import subprocess, json, os, sys
import numpy as np, cv2
from plan import schedule, SRC
shots, END, END2, TOTAL = schedule()
W, H, FPS = 848, 474, 30
MIN_H = 380
PAD = 420
os.makedirs('assets/seg', exist_ok=True)

def track():
    cache = 'assets/seg/motion.npy'
    if os.path.exists(cache): return np.load(cache)
    cap = cv2.VideoCapture(SRC); prev = None; M = []
    while True:
        ok, f = cap.read()
        if not ok: break
        g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
        if prev is None: M.append(np.eye(3))
        else:
            p0 = cv2.goodFeaturesToTrack(prev, maxCorners=500, qualityLevel=0.01, minDistance=7, blockSize=7)
            p1, st, _ = cv2.calcOpticalFlowPyrLK(prev, g, p0, None, winSize=(21, 21), maxLevel=3)
            m = st.ravel() == 1
            A, _ = cv2.estimateAffinePartial2D(p0[m], p1[m], method=cv2.RANSAC, ransacReprojThreshold=1.5)
            if A is None: A = np.array([[1, 0, 0], [0, 1, 0]], float)
            M.append(np.vstack([A, [0, 0, 1]]))
        prev = g
    M = np.array(M); np.save(cache, M); return M

M = track()  # M[k]: frame k-1 coords -> frame k coords
cap = cv2.VideoCapture(SRC)
frames = []
while True:
    ok, f = cap.read()
    if not ok: break
    frames.append(f)
print(len(frames), 'frames tracked')

GRADE = ('eq=contrast=1.08:saturation=1.08:brightness=-0.01,'
         'colorbalance=rs=-0.05:gs=0.0:bs=0.07:rm=-0.01:bm=0.02:rh=0.02:bh=-0.03,'
         'vignette=PI/5,unsharp=5:5:0.5,noise=alls=5:allf=t+u')
report = []
DRY = 'dry' in sys.argv[1:]  # python3 prep.py dry: report every window, encode nothing
ONLY = [a for a in sys.argv[1:] if a != 'dry']  # python3 prep.py s06 re-cuts only the named shots
for s in shots:
    if ONLY and s['name'] not in ONLY: continue
    i0 = int(round(s['ss'] * FPS)); n = int(round((s['dur'] + 0.3) * FPS)); i1 = min(len(frames), i0 + n)
    # A[k]: frame k coords -> frame i0 coords
    A = [np.eye(3)]
    for k in range(i0 + 1, i1): A.append(A[-1] @ np.linalg.inv(M[k]))
    corners = np.array([[0, 0, 1], [W, 0, 1], [0, H, 1], [W, H, 1]], float).T
    left, right, top, bottom = -1e9, 1e9, -1e9, 1e9
    for a in A:
        c = a @ corners
        left = max(left, c[0, 0], c[0, 2]); right = min(right, c[0, 1], c[0, 3])
        top = max(top, c[1, 0], c[1, 1]); bottom = min(bottom, c[1, 2], c[1, 3])
    vw, vh = right - left, bottom - top
    h = min(vh, H); w = h * 9 / 16
    if w > vw: w = vw; h = w * 16 / 9
    ok = h >= MIN_H
    cx = left + s['xf'] * vw; cx = min(max(cx, left + w / 2), right - w / 2)
    cy = top + vh / 2
    x, y = cx - w / 2, cy - h / 2
    report.append(dict(name=s['name'], ss=s['ss'], valid=[round(vw), round(vh)], win=[round(w), round(h)], ok=bool(ok),
                       drift=[round(float(A[-1][0, 2])), round(float(A[-1][1, 2]))]))
    print(s['name'], 'ss', s['ss'], 'steady area', round(vw), 'x', round(vh), 'window', round(w), 'x', round(h), 'OK' if ok else 'TOO SMALL: drop or move this shot')
    if not ok or DRY: continue
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', '1080x1920', '-r', str(FPS), '-i', '-',
                           '-vf', GRADE, '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p',
                           f"assets/seg/{s['name']}.mp4"], stdin=subprocess.PIPE)
    for k, a in zip(range(i0, i1), A):
        T = np.array([[1, 0, PAD - x], [0, 1, PAD - y], [0, 0, 1]]) @ a  # into a padded canvas with the window at (PAD, PAD)
        canvas = cv2.warpAffine(frames[k], T[:2], (int(w) + 2 * PAD, int(h) + 2 * PAD), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        win = canvas[PAD:PAD + int(h), PAD:PAD + int(w)]
        out = cv2.resize(win, (1080, 1920), interpolation=cv2.INTER_LANCZOS4)
        ff.stdin.write(out.tobytes())
    ff.stdin.close(); ff.wait()
json.dump(dict(shots=shots, windows=report), open('assets/seg/shots.json', 'w'), indent=1, ensure_ascii=False)
print(len(shots), 'shots, cuts end at', END, 'render card to', END2, 'total', TOTAL)
if not all(r['ok'] for r in report if not ONLY or r['name'] in ONLY): sys.exit('some shots could not be locked')
