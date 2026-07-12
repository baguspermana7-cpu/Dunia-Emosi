import sys, os, json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = "/home/baguspermana7/Documents/temporary/game asset/db"
OUT = "assets/db"
SHEETS = {  # category : (filename, grid)
  "creatures": ("db-creatures-100.png", 10),
  "faces":     ("db-faces-100.png", 10),
  "objects":   ("db-objects-100.png", 10),
  "science":   ("db-science-100.png", 10),
  "vehicles":  ("db-vehicles-100.png", 10),
  "elements":  ("db-elements-100.png", 10),
}
MAXPX = 200

def process_cell(cell):
    """cell: RGBA PIL image. Returns bordered, cropped RGBA or None if empty."""
    arr = np.array(cell.convert("RGBA"))
    h, w = arr.shape[:2]
    rgb = arr[:,:,:3].astype(np.int16)
    # near-white candidate bg
    near_white = (rgb[:,:,0]>236)&(rgb[:,:,1]>236)&(rgb[:,:,2]>236)
    # flood from border: label white regions, kill those touching the border
    lbl, n = ndimage.label(near_white)
    border_labels = set(lbl[0,:]) | set(lbl[-1,:]) | set(lbl[:,0]) | set(lbl[:,-1])
    border_labels.discard(0)
    bg = np.isin(lbl, list(border_labels))
    alpha = (~bg).astype(np.uint8)*255
    # keep largest foreground connected component (drop stray specks)
    fl, fn = ndimage.label(alpha>0)
    if fn==0: return None
    sizes = ndimage.sum(np.ones_like(fl), fl, range(1,fn+1))
    keep = np.argmax(sizes)+1
    # keep components >= 4% of the largest (multi-part sprites), drop tiny noise
    big = sizes[keep-1]
    keep_labels = [i+1 for i,s in enumerate(sizes) if s >= max(20, big*0.04)]
    fg = np.isin(fl, keep_labels)
    alpha = (fg.astype(np.uint8))*255
    if alpha.max()==0: return None
    # soft de-fringe: slight blur on alpha edge then re-threshold high to shave halo
    a_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.array(a_img)
    alpha = np.where(alpha>150,255,0).astype(np.uint8)
    out = arr.copy(); out[:,:,3]=alpha
    spr = Image.fromarray(out,"RGBA")
    # autocrop
    bbox = spr.getbbox()
    if not bbox: return None
    spr = spr.crop(bbox)
    return add_border(spr)

def add_border(spr, pad=4, ring=2):
    """Add a thin light 'sticker' outline around the alpha silhouette."""
    spr = spr.convert("RGBA")
    w,h = spr.size
    canvas = Image.new("RGBA",(w+pad*2,h+pad*2),(0,0,0,0))
    a = spr.split()[3]
    # dilate alpha to make a ring
    dil = a.filter(ImageFilter.MaxFilter(2*ring+1))
    ring_layer = Image.new("RGBA", spr.size, (255,255,255,0))
    ra = np.array(dil)
    rr = np.zeros((h,w,4),np.uint8)
    rr[:,:,0]=255; rr[:,:,1]=255; rr[:,:,2]=255; rr[:,:,3]=(ra*0.82).astype(np.uint8)
    ring_layer = Image.fromarray(rr,"RGBA")
    canvas.alpha_composite(ring_layer,(pad,pad))
    canvas.alpha_composite(spr,(pad,pad))
    return canvas

def run(cats):
    manifest={}
    for cat in cats:
        fn, grid = SHEETS[cat]
        sheet = Image.open(os.path.join(SRC,fn)).convert("RGBA")
        W,H = sheet.size; cw,ch = W//grid, H//grid
        d = os.path.join(OUT,cat); os.makedirs(d,exist_ok=True)
        made=0; empty=[]
        for r in range(grid):
            for c in range(grid):
                idx=r*grid+c+1
                cell=sheet.crop((c*cw,r*ch,(c+1)*cw,(r+1)*ch))
                res=process_cell(cell)
                if res is None: empty.append(idx); continue
                res.thumbnail((MAXPX,MAXPX),Image.LANCZOS)
                res.save(os.path.join(d,f"{idx:03d}.webp"),"WEBP",quality=88,method=6)
                made+=1
        manifest[cat]={"count":made,"empty":empty}
        print(f"{cat:10s} made={made}/100 empty={empty}")
    return manifest

if __name__=="__main__":
    cats = sys.argv[1:] if len(sys.argv)>1 else list(SHEETS)
    m=run(cats)
    # merge into manifest.json
    mpath=os.path.join(OUT,"manifest.json")
    existing={}
    if os.path.exists(mpath): existing=json.load(open(mpath))
    existing.update(m)
    os.makedirs(OUT,exist_ok=True)
    json.dump(existing, open(mpath,"w"), indent=2)
    print("manifest updated")
