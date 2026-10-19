"""Shot plan for the Hankin 41 steel works reel: every cut sits on the 128 BPM grid, like the Szold reel.
One handheld WhatsApp clip (848x474, 34.7 s) is the only source; each shot is a window locked to the scene (prep.py),
so nothing moves inside a shot. Seconds 0 to 6.5 (a worker filling the frame) are not used."""
BPM = 128
B = 60 / BPM  # one beat
SRC = '/tmp/claude-0/-home-user-kurkoos-group/b616de33-7a66-539b-90c4-315bd9ec44de/scratchpad/hankin/src/hankin.mp4'
# (name, source start s, beats, text block starting on this shot, x of the window as a fraction of the steady area)
SHOTS = [
    ('s01', 17.0, 4, 'title', 0.5),
    ('s02', 31.7, 2, 'steel', 0.5),
    ('s03', 20.0, 2, None, 0.45),
    ('s04', 24.0, 2, None, 0.5),
    ('s05', 27.3, 2, None, 0.5),
    ('s06', 33.8, 2, None, 0.5),
    ('s07', 6.7, 2, 'floor', 0.55),
    ('s08', 22.0, 2, None, 0.5),
    ('s09', 25.6, 2, None, 0.5),
    ('s10', 12.0, 2, None, 0.2),
    ('s11', 32.7, 2, None, 0.5),
    ('s12', 9.0, 2, None, 0.15),
    ('s13', 14.2, 2, None, 0.2),
    ('s14', 23.0, 2, None, 0.5),
    ('s15', 18.5, 4, 'line', 0.5),
]
RENDER_BEATS = 4   # the architectural render card
END_BEATS = 8      # the logo card
def schedule():
    t, out = 0.0, []
    for name, s, beats, block, xf in SHOTS:
        d = beats * B
        out.append(dict(name=name, ss=s, start=round(t, 4), dur=round(d, 4), block=block, xf=xf))
        t += d
    end = round(t, 4)
    return out, end, round(end + RENDER_BEATS * B, 4), round(end + (RENDER_BEATS + END_BEATS) * B, 4)
