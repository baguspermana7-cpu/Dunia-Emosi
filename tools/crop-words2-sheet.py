#!/usr/bin/env python3
"""Crop the owner's 100-item words2 sheet (sayur/profesi/tubuh/pakaian/olahraga/
musik/sekolah/warna + benda) into assets/db/words2/001.webp..100.webp.
Uniform 10x10 grid on white; keep top 80% of each cell (drop the name label),
reuse the flood pipeline from crop-monster-sheet.py."""
import importlib.util, os
from PIL import Image
HERE=os.path.dirname(__file__)
spec=importlib.util.spec_from_file_location("cms", os.path.join(HERE,"crop-monster-sheet.py"))
cms=importlib.util.module_from_spec(spec); spec.loader.exec_module(cms)
SRC=os.environ.get("WORDS2_SRC","/tmp/words2-sheet.png")
OUT=os.path.abspath(os.path.join(HERE,"..","assets","db","words2")); os.makedirs(OUT,exist_ok=True)
sheet=Image.open(SRC).convert("RGBA"); W,H=sheet.size; cw,ch=W/10,H/10
made=0
for r in range(10):
    for c in range(10):
        idx=r*10+c+1
        cell=sheet.crop((int(c*cw),int(r*ch),int((c+1)*cw),int(r*ch+ch*0.80)))
        spr=cms.process_cell(cell, white=236)
        if spr is not None:
            spr.save(os.path.join(OUT,("00%d"%idx)[-3:]+".webp"),"WEBP",quality=88,method=6); made+=1
print("cropped",made)
if __name__=="__main__": pass
