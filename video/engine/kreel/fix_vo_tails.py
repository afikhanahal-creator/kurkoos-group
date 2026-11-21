"""Clean voice files: drops the white noise bursts at the end of each vo/*.wav (the rule is in vo_noise.py).
    python3 video/engine/kreel/fix_vo_tails.py video/projects/<name>/vo"""
import os, sys, subprocess
subprocess.check_call([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vo_noise.py'), 'clean', sys.argv[1]])
