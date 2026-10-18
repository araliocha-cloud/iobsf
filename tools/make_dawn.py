import math, random
from shapely.geometry import Point, Polygon, LineString, MultiPolygon
from shapely.ops import unary_union
from shapely import affinity
random.seed(11)
W,H=1600,420; HZ=322
def cap(a,b,ra,rb):  # tapered capsule
    return unary_union([Point(a).buffer(ra,16),Point(b).buffer(rb,16)]).convex_hull
def blob(cx,cy,rx,ry,jit=.1,n=26):
    return Polygon([(cx+rx*math.cos(t)*(1+random.uniform(-jit,jit)),cy+ry*math.sin(t)*(1+random.uniform(-jit,jit))) for t in [2*math.pi*i/n for i in range(n)]])
def jag(x0,x1,ytop,ybot,teeth,amp):
    pts=[(x0,ytop),(x1,ytop)]
    for i in range(teeth*2+1):
        x=x1-(x1-x0)*i/(teeth*2); pts.append((x+random.uniform(-.6,.6), ybot+(amp if i%2 else -amp*0.3)+random.uniform(-.8,.8)))
    return Polygon(pts)
def figure(kind, flip, stride, bulk):
    g=[]; lines=[]
    sx=lambda x: -x if flip else x
    b=bulk
    # head, long mane, beard
    g.append(Point(0,-90).buffer(6.0,20))
    g.append(blob(0,-89,8.0,9.2,.12))
    g.append(Polygon([(-8,-90),(8,-90),(10.5,-79),(7,-75),(-7,-75),(-10.5,-79)]))   # mane falling to shoulders
    for i in range(5):
        x=-7+3.5*i; g.append(cap((x,-80),(x*1.25+random.uniform(-1,1),-72-random.uniform(0,3)),1.5,.5))
    g.append(Polygon([(-5,-85),(5,-85),(3.5,-77),(0,-74),(-3.5,-77)]))             # beard
    g.append(cap((0,-82),(0,-75),4.4*b,5.0*b))
    # sloping shoulders and a tapering torso
    g.append(Polygon([(-5*b,-81),(5*b,-81),(15.5*b,-74),(14*b,-68),(10.5*b,-55),(9*b,-46),(-9*b,-46),(-10.5*b,-55),(-14*b,-68),(-15.5*b,-74)]))
    g.append(Point(-13.2*b,-72.5).buffer(3.8*b,16)); g.append(Point(13.2*b,-72.5).buffer(3.8*b,16))
    # hide cape over one shoulder, ragged hem
    side=1 if random.random()<.5 else -1
    cape=[(-side*16*b,-76),(-side*6,-82),(side*4,-70),(side*11*b,-50)]
    for i in range(6):
        t=i/5; cape.append((side*11*b-side*25*b*t+random.uniform(-1,1), -50-14*t+(2.5 if i%2 else -1)))
    g.append(Polygon(cape))
    # fur kilt
    g.append(jag(-11*b,11*b,-49,-33,5,2.2))
    # legs, walking toward us
    st=stride
    lhip,lknee,lank=(-5.2*b,-42),(-6.4-1.5*st,-21),(-7-2*st,-2)
    rhip,rknee,rank=(5.2*b,-42),(6.2+1*st,-22+1*st),(6.8+1.4*st,-4.5*st)
    for hip,knee,ank in [(lhip,lknee,lank),(rhip,rknee,rank)]:
        g.append(cap(hip,knee,5.2*b,3.7*b)); g.append(cap(knee,ank,3.7*b,2.2*b))
        g.append(blob(ank[0]+(1.5 if ank[0]>0 else -1.5),ank[1]+1.2,4.4,1.8,.05,14))
    def arm(sh,el,wr):
        g.append(cap(sh,el,4.3*b,3.4*b)); g.append(cap(el,wr,3.4*b,2.5*b)); g.append(Point(wr).buffer(3.0*b,12))
    R=lambda x,y:(sx(x),y)
    if kind=="spear":
        arm(R(14*b,-74),R(20,-60),R(21,-50))
        g.append(LineString([R(21,-134),R(21,3)]).buffer(1.05,6))
        g.append(Polygon([R(21,-153),R(23.6,-146),R(25,-138),R(21,-130),R(17,-138),R(18.4,-146)]))
        g.append(cap(R(21,-131),R(21,-127),1.9,1.9))
        arm(R(-14*b,-73),R(-19.5,-57),R(-21,-43))
    elif kind=="shoulder":
        arm(R(14*b,-74),R(21,-66),R(17,-80))
        g.append(LineString([R(-6,-40),R(40,-138)]).buffer(1.0,6))
        tip=Polygon([(0,-10),(3,0),(0,3),(-3,0)]); a=math.degrees(math.atan2(-98,46))+90
        tip=affinity.rotate(tip,-a if not flip else a,origin=(0,0)); g.append(affinity.translate(tip,*R(41.5,-141)))
        arm(R(-14*b,-73),R(-19.5,-57),R(-21,-43))
    elif kind=="axe":
        arm(R(14*b,-74),R(24,-82),R(23,-100))
        g.append(LineString([R(19,-90),R(27,-124)]).buffer(1.5,6))
        head=blob(0,0,8.5,4.2,.08,18); head=affinity.rotate(head,(-14 if not flip else 14),origin=(0,0))
        g.append(affinity.translate(head,*R(31,-119)))
        g.append(cap(R(25,-121),R(27.5,-115),2.3,2.3))
        arm(R(-14*b,-73),R(-19.5,-57),R(-21,-43))
    elif kind=="bow":
        arm(R(-14*b,-74),R(-22,-61),R(-27,-50))
        arc=[R(-27-10*math.sin(math.pi*t), -50-50*(t-0.5)*2) for t in [i/24 for i in range(25)]]
        g.append(LineString(arc).buffer(1.25,6))
        lines.append((R(-27,-100),R(-27,0),0.45))
        arm(R(14*b,-74),R(18.5,-57),R(19.5,-42))
        g.append(cap(R(8,-95),R(4,-68),2.0,2.8))     # quiver
        for k in range(3): g.append(cap(R(8+k*1.2,-95),R(9+k*1.6,-101),.6,.4))
    elif kind=="club":
        arm(R(14*b,-74),R(20,-60),R(22,-49))
        g.append(cap(R(22,-49),R(30,-24),1.6,4.2))
        arm(R(-14*b,-73),R(-19.5,-57),R(-21,-43))
    return unary_union([x.buffer(0) for x in g]).buffer(.35).buffer(-.35), lines
def path(geom, tr):
    out=[]
    polys=[geom] if geom.geom_type=="Polygon" else list(geom.geoms)
    for p in polys:
        for ring in [p.exterior]+list(p.interiors):
            c=list(ring.coords)
            out.append("M"+" L".join(f"{tr(x,y)[0]:.1f},{tr(x,y)[1]:.1f}" for x,y in c)+"Z")
    return " ".join(out)
def place(fig, cx, fy, h, shadow=True):
    geom,lines=fig; k=h/100; tr=lambda x,y:(cx+x*k, fy+y*k)
    out=[]
    if shadow:
        lean=(cx-W/2)*0.5
        out.append(f'<path d="M{cx-h*.07:.1f},{fy:.1f} L{cx+h*.07:.1f},{fy:.1f} L{cx+lean+h*.2:.1f},{fy+h*.75:.1f} L{cx+lean-h*.2:.1f},{fy+h*.75:.1f}Z" fill="url(#shadow)"/>')
    out.append(f'<path d="{path(geom.simplify(0.25),tr)}"/>')
    for a,b,w in lines:
        A=tr(*a);B=tr(*b); out.append(f'<line x1="{A[0]:.1f}" y1="{A[1]:.1f}" x2="{B[0]:.1f}" y2="{B[1]:.1f}" stroke="#060504" stroke-width="{max(w*k,.5):.2f}"/>')
    return "".join(out)
kinds=["spear","axe","bow","shoulder","club","spear"]
band=[(0,414,178,"spear",False,1.0,1.08)]
ranks=[(122,388,136),(226,368,106),(318,353,84),(400,343,67),(474,336,53),(540,331,42),(598,328,33)]
for r,(dx,fy,h) in enumerate(ranks):
    for side in (-1,1):
        band.append((side*(dx+random.uniform(-10,10)), fy+random.uniform(-2,2), h*random.uniform(.94,1.05), kinds[(r*2+(side>0)+1)%len(kinds)], side<0, random.uniform(.5,1.2), random.uniform(.95,1.08)))
for (dx,fy,h) in [(-70,362,104),(72,364,106),(-170,346,80),(172,347,82),(-280,336,60),(282,336,60),(-118,334,58),(120,335,58),(-360,331,46),(362,331,46),(-230,330,44),(232,330,44)]:
    band.append((dx+random.uniform(-6,6), fy, h*random.uniform(.95,1.05), random.choice(kinds), random.random()<.5, random.uniform(.5,1.2), random.uniform(.95,1.08)))
band.sort(key=lambda b:b[1])
figs="".join(place(figure(k,fl,st,bk), W/2+dx, fy, h) for dx,fy,h,k,fl,st,bk in band)
tiny="".join(place(figure(random.choice(kinds),random.random()<.5,.8,1), W/2+dx, HZ+4, 17+random.uniform(-3,3), shadow=False) for dx in [-720,-690,-655,-625,640,672,705,740,-770,775])
rays="".join(f'<path d="M{W/2},{HZ} L{W/2+1500*math.cos(a-0.03):.0f},{HZ-1500*math.sin(a-0.03):.0f} L{W/2+1500*math.cos(a+0.03):.0f},{HZ-1500*math.sin(a+0.03):.0f}Z" fill="url(#ray)"/>' for a in [math.pi*(i+0.5)/12 for i in range(12)])
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMax slice" role="img" aria-label="A band of early humans with stone axes, spears and bows walking out of the sunrise">
<defs>
<radialGradient id="sun"><stop offset="0" stop-color="#fff8e0"/><stop offset=".05" stop-color="#ffe4a3"/><stop offset=".13" stop-color="#ffb558"/><stop offset=".28" stop-color="#e07a30" stop-opacity=".9"/><stop offset=".5" stop-color="#8a3f18" stop-opacity=".55"/><stop offset=".78" stop-color="#3a1c0c" stop-opacity=".25"/><stop offset="1" stop-color="#1b1916" stop-opacity="0"/></radialGradient>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a3d16"/><stop offset=".08" stop-color="#4a250f"/><stop offset=".45" stop-color="#1e120a"/><stop offset="1" stop-color="#1b1916"/></linearGradient>
<linearGradient id="shadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060504" stop-opacity=".8"/><stop offset="1" stop-color="#060504" stop-opacity="0"/></linearGradient>
<radialGradient id="ray" cx="50%" cy="100%" r="100%"><stop offset="0" stop-color="#ffd58a" stop-opacity=".09"/><stop offset=".6" stop-color="#ffd58a" stop-opacity=".03"/><stop offset="1" stop-color="#ffd58a" stop-opacity="0"/></radialGradient>
<radialGradient id="haze"><stop offset="0" stop-color="#ffe0a0" stop-opacity=".7"/><stop offset="1" stop-color="#ffcf86" stop-opacity="0"/></radialGradient>
</defs>

<g class="rise">
<ellipse cx="{W/2}" cy="{HZ}" rx="980" ry="360" fill="url(#sun)"/>
<g class="rays">{rays}</g>
<circle cx="{W/2}" cy="{HZ+8}" r="128" fill="#ffd27a" opacity=".32"/>
<circle cx="{W/2}" cy="{HZ+8}" r="84" fill="#fff4d2"/>
<ellipse cx="{W/2}" cy="{HZ}" rx="640" ry="30" fill="url(#haze)"/>
</g>
<path d="M0,{HZ+2} C220,{HZ-6} 420,{HZ+1} 600,{HZ-3} S940,{HZ+3} 1120,{HZ-2} 1420,{HZ} {W},{HZ-6} L{W},{H} L0,{H}Z" fill="url(#ground)"/>
<line x1="0" y1="{HZ}" x2="{W}" y2="{HZ}" stroke="#ffe0a0" stroke-opacity=".35" stroke-width="1"/>
<g class="band" fill="#060504">{tiny}{figs}</g>
</svg>'''
open('/home/claude/iobsf/assets/img/dawn.svg','w').write(svg)
print(len(svg))
