#!/usr/bin/env python3
"""Re-register every assets/db/lib/tk-scene/*.webp in the index (index writers can race; the files are the truth)."""
import importlib.util, json, os
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
INDEX = os.path.join(ROOT, 'assets', 'db', 'index.json')
d = os.path.join(ROOT, 'assets', 'db', 'lib', 'tk-scene')
idx = json.load(open(INDEX)); n = 0
for f in sorted(os.listdir(d)):
    if not f.endswith('.webp'): continue
    k = 'tk-scene/' + f[:-5]
    if k in idx['assets']: continue
    im = Image.open(os.path.join(d, f)); key, kind = f[:-5].rsplit('-', 1)
    idx['assets'][k] = {'file': f'assets/db/lib/tk-scene/{f}', 'cat': 'tk-scene', 'tags': [key, kind, 'background', 'timmy'], 'name': key, 'source': f'bg-{key} (owner)', 'w': im.width, 'h': im.height}; n += 1
idx['assets'] = dict(sorted(idx['assets'].items())); json.dump(idx, open(INDEX, 'w'), indent=1)
spec = importlib.util.spec_from_file_location('ing', os.path.join(ROOT, 'tools', 'ingest-asset-sheets.py'))
ing = importlib.util.module_from_spec(spec); spec.loader.exec_module(ing); ing.write_js(idx)
print('re-added', n)
