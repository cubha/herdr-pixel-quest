"""Pixel Quest stone tablet: one big slab behind the whole terminal area.

    python3 art-src/gen_tablet.py <out-folder>

Writes tablet.png (dark) and tablet-slate.png (light, blue-grey slate), 994x732 each: the
terminal area of a 1280x820 window with the sidebar open, so `cover` barely
crops it. Drawn at screen resolution (not doubled) so the worn rim, broken
corners, cracks and moss read as natural stone rather than a pixel grid.
Seeded: a rerun writes the same pixels. Needs numpy and Pillow.

Copyright (c) 2026 cubha. MIT License.
"""
import os
import sys

import numpy as np
from PIL import Image

DARK = dict(base=(52, 54, 82), crack=(8, 9, 16), hair=0.5, warm=(170, 110, 60), shade=(6, 7, 15),
            wk=0.42, sk=0.45, gone=(5, 6, 12))
LIGHT = dict(base=(192, 198, 212), crack=(54, 60, 78), hair=0.75, warm=(255, 236, 200), shade=(104, 112, 132),
             wk=0.28, sk=0.35, gone=(66, 72, 90))


def tablet(path, P):
    W,H=994,732
    rng=np.random.default_rng(4)
    def vnoise(h,w,cell):
        gh,gw=h//cell+3,w//cell+3; g=rng.uniform(-1,1,(gh,gw))
        y=np.arange(h)/cell; x=np.arange(w)/cell
        iy=y.astype(int); ix=x.astype(int); fy=(y-iy)[:,None]; fx=(x-ix)[None,:]
        fy=fy*fy*(3-2*fy); fx=fx*fx*(3-2*fx)
        a=g[iy][:,ix]; b=g[iy][:,ix+1]; c=g[iy+1][:,ix]; d=g[iy+1][:,ix+1]
        return (a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy
    def fbm(h,w,cells,amps): return sum(a*vnoise(h,w,c) for c,a in zip(cells,amps))
    yy,xx=np.mgrid[0:H,0:W].astype(float)
    # distance to edge, perturbed by noise -> organic rim
    d=np.minimum.reduce([xx,yy,W-1-xx,H-1-yy])
    # corner damage: larger bites near corners, irregular
    for cx,cy in ((0,0),(W-1,0),(0,H-1),(W-1,H-1)):
        r=np.hypot(xx-cx,yy-cy); R=rng.uniform(55,95)
        d=np.minimum(d, r-R*0.55)
    warp=fbm(H,W,(90,30,9),(16,8,3))
    dd=d+warp+10
    # face colour: mottled stone with soft blotches + fine grain
    face=np.zeros((H,W,3)); base=np.array(P['base'],float)
    m=fbm(H,W,(160,60,18,5),(9,6,3,2))
    face[:]=base; face+=m[...,None]*np.array([1,1,1.15])
    face+=rng.normal(0,2.2,(H,W))[...,None]
    # subtle warm/cool tint variation
    tint=fbm(H,W,(220,70),(1,0.5)); face+=tint[...,None]*np.array([4,1,-3])
    # edge zone: grime darkening toward the rim (smooth, noisy), bevel light/shadow
    g=np.clip((70-dd)/70,0,1)**1.6
    face*= (1-0.45*g)[...,None]
    bevel=(dd>0)&(dd<9)
    nx=np.gradient(dd,axis=1); ny=np.gradient(dd,axis=0)
    lit=(nx+ny)>0          # faces up/left
    face[bevel&lit]+=14; face[bevel&~lit]-=16
    # broken-off area outside the rim: deep shadow
    gone=dd<=0
    # cracks: random walks from corners and rim points, thin, slightly wobbly
    crack=np.zeros((H,W),bool)
    def walk(x,y,ang,n,branch=True):
        for i in range(n):
            ix,iy=int(x),int(y)
            if 0<=ix<W and 0<=iy<H: crack[iy,ix]=True
            ang+=rng.normal(0,0.18); x+=np.cos(ang); y+=np.sin(ang)
            if branch and rng.random()<0.012: walk(x,y,ang+rng.choice([-0.8,0.8]),int(n*0.35),False)
    for (cx,cy,a) in ((40,40,0.7),(W-40,42,2.4),(40,H-40,-0.7),(W-42,H-40,-2.3)):
        walk(cx,cy,a+rng.normal(0,0.2),int(rng.uniform(140,260)))
    for _ in range(7):
        side=rng.integers(4)
        if side==0: walk(rng.uniform(100,W-100),12,np.pi/2,int(rng.uniform(30,90)))
        if side==1: walk(rng.uniform(100,W-100),H-12,-np.pi/2,int(rng.uniform(30,90)))
        if side==2: walk(12,rng.uniform(80,H-80),0,int(rng.uniform(30,90)))
        if side==3: walk(W-12,rng.uniform(80,H-80),np.pi,int(rng.uniform(30,90)))
    face[crack]-=26
    sh=np.roll(crack,1,axis=0)&~crack; face[sh]+=7     # lit lip below each crack
    # moss: noise-shaped clumps hugging the bottom corners, bottom rim and a little up the sides
    mn=fbm(H,W,(40,14,5),(1,0.6,0.3))
    near_b=np.exp(-((H-1-yy)/55)**2)
    near_c=np.maximum(np.exp(-(np.hypot(xx,H-1-yy)/170)**2), np.exp(-(np.hypot(W-1-xx,H-1-yy)/200)**2))
    near_s=np.exp(-(np.minimum(xx,W-1-xx)/30)**2)*np.clip((yy-H*0.45)/(H*0.55),0,1)
    moss_p=np.clip(0.9*near_c+0.35*near_b*(mn>0.2)+0.4*near_s,0,1)
    moss=(0.35*mn+moss_p>0.72)&(moss_p>0.12)&(dd>-3)
    fine=vnoise(H,W,3)
    shade=np.clip(0.5+0.35*mn+0.35*fine,0,1)
    mcol=np.stack([34+30*shade,78+80*shade,40+26*shade],-1)
    face[moss]=mcol[moss]*0.85+face[moss]*0.15
    # visible cracks across the face (own RNG so the rest of the slab stays the same)
    r2=np.random.default_rng(31)
    big=np.zeros((H,W),np.uint8)       # 2 = deep crack core, 1 = hairline
    def walk2(x,y,ang,n,width,depth=0):
        a0=ang
        for i in range(n):
            ix,iy=int(x),int(y)
            if not(0<=ix<W and 0<=iy<H): return
            if i>20 and dd[iy,ix]<=2: return
            big[iy,ix]=max(big[iy,ix],width)
            if width==2:
                if 0<=ix+1<W: big[iy,ix+1]=max(big[iy,ix+1],1)
            ang+=r2.normal(0,0.10)+0.06*(a0-ang)
            if r2.random()<0.03: ang+=r2.choice([-1,1])*r2.uniform(0.3,0.7)   # sharp kink
            step=r2.uniform(0.8,1.4); x+=np.cos(ang)*step; y+=np.sin(ang)*step
            if depth<2 and r2.random()<0.018:
                walk2(x,y,ang+r2.choice([-1,1])*r2.uniform(0.5,1.1),int(n*r2.uniform(0.2,0.45)),1,depth+1)
    # two long cracks crossing the slab, a few medium ones off the rim, hairlines
    walk2(W*0.28,H-30,-1.2,560,2); walk2(W-30,H*0.30,3.05,460,2)
    for _ in range(4):
        side=r2.integers(4)
        x,y,a=[(r2.uniform(80,W-80),28,np.pi/2),(r2.uniform(80,W-80),H-28,-np.pi/2),(28,r2.uniform(60,H-60),0.0),(W-28,r2.uniform(60,H-60),np.pi)][side]
        walk2(x,y,a+r2.normal(0,0.35),int(r2.uniform(90,220)),2)
    for _ in range(10):
        walk2(r2.uniform(60,W-60),r2.uniform(60,H-60),r2.uniform(0,2*np.pi),int(r2.uniform(25,70)),1,2)
    core=big==2; hair=big==1
    face[core]=np.array(P['crack'],float); face[hair]=face[hair]*P['hair']
    lip=np.roll(core|hair,1,axis=0)&~(core|hair); face[lip]+=16          # lit lower lip
    sh=np.roll(core,-1,axis=1)&~(core|hair); face[sh]*=0.85               # soft side shadow
    # torchlight from the top centre (smooth, no bands)
    t=np.clip(1-np.hypot((xx-W/2)/(W*0.62),yy/(H*1.05)),0,1)
    warm=np.array(P['warm'],float); dark=np.array(P['shade'],float)
    face=face*(1-P['wk']*t[...,None])+warm*P['wk']*t[...,None]
    face=face*(1-P['sk']*(1-t)[...,None])+dark*P['sk']*(1-t)[...,None]
    face[gone&~moss]=np.array(P['gone'],float)
    Image.fromarray(np.clip(face,0,255).astype(np.uint8)).save(path)



if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    os.makedirs(out, exist_ok=True)
    tablet(os.path.join(out, 'tablet.png'), DARK)
    tablet(os.path.join(out, 'tablet-slate.png'), LIGHT)
    print('wrote tablet.png and tablet-slate.png to', out)
