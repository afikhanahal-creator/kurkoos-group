"""Shot plan for the Henrietta Szold ground works reel: every cut sits on the 128 BPM grid."""
BPM = 128
B = 60 / BPM  # one beat
SRC = '/tmp/claude-0/-home-user-kurkoos-group/b616de33-7a66-539b-90c4-315bd9ec44de/scratchpad/szold'
# (name, source clip, start s, beats, text block starting on this shot)
SHOTS = [
    ('s01', 'IMG_2016', 0.0, 4, 'title'),
    ('s02', 'IMG_2010', 0.3, 2, 'ground'),
    ('s03', 'IMG_2016', 4.4, 2, None),
    ('s04', 'IMG_2010', 2.6, 2, None),
    ('s05', 'IMG_2011', 0.4, 2, 'piles'),
    ('s06', 'IMG_2011', 2.6, 4, None),
    ('s07', 'IMG_2011', 4.6, 2, None),
    ('s08', 'IMG_2013', 0.1, 2, 'steel'),
    ('s09', 'IMG_2012', 0.0, 2, None),
    ('s10', 'IMG_2014', 2.3, 2, None),
    ('s11', 'IMG_2015', 0.2, 4, None),
    ('s12', 'IMG_2019', 0.3, 2, None),
    ('s13', 'IMG_2015', 5.5, 2, None),
    ('s14', 'IMG_2016', 2.5, 4, 'units'),
    ('s15', 'IMG_2010', 4.2, 2, None),
    ('s16', 'IMG_2017', 1.0, 4, 'line'),
]
END_BEATS = 8
def schedule():
    t, out = 0.0, []
    for name, src, s, beats, block in SHOTS:
        d = beats * B
        out.append(dict(name=name, src=src, ss=s, start=round(t, 4), dur=round(d, 4), block=block))
        t += d
    return out, round(t, 4), round(t + END_BEATS * B, 4)
