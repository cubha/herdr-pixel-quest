# 분리 검증: 재질 + 장면 층 = 원래 시안 석판 (구역마다 최대 오차)
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import tab5, zones5
for k, fn in zones5.ZONES.items():
    a, z = fn()
    r = tab5.rec_stop()
    L = r.p / np.maximum(r.al, 1e-6)[..., None]
    comp = r.base * (1 - r.al[..., None]) + r.p
    print(k, 'max err', float(np.abs(np.clip(comp,0,255) - a).max()), 'scene px', int((r.al > 0.004).sum()))
