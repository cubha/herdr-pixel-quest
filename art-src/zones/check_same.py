# 사본(기록 장치 넣은 것)이 확정 시안 생성기와 같은 석판을 그리는지
import sys, os, importlib
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
CONF = os.path.abspath(os.path.join(HERE, '../../.claude/plan/next/stage3'))
def load(path):
    for m in ['tab5', 'zones5', 'scenes6']:
        sys.modules.pop(m, None)
    sys.path.insert(0, path)
    z = importlib.import_module('zones5')
    out = {k: fn()[0] for k, fn in z.ZONES.items()}
    sys.path.pop(0)
    return out
new, old = load(HERE), load(CONF)
for k in new:
    d = np.abs(np.clip(new[k], 0, 255).round() - np.clip(old[k], 0, 255).round())
    print(k, 'max', float(d.max()), 'px>1', int((d.max(-1) > 1).sum()))
