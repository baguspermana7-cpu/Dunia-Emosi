#!/usr/bin/env python3
"""Export the Relocation to UAE tools (PRD-59) as a standalone app for the OUT_COUNTRY_RE repo.

Source of truth stays here in Dunia Emosi (games/*.html + games/uae/), where every gate runs. This script copies the
built pages into a self-contained tree: landing becomes index.html, own service worker (offline after one visit), own
manifest and icon, only the two fonts the pages use, the unit tests, and a GitHub Pages workflow that runs the tests
before deploying.

Usage: python3 tools/export-relocation.py <out-dir>      (the out dir's .git is kept; everything else is replaced)
"""
import hashlib, json, os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
G = os.path.join(ROOT, 'games')
PAGES = {'relokasi-uae.html': 'index.html', 'pindah-abudhabi.html': 'pindah-abudhabi.html',
         'visa-keluarga-uae.html': 'visa-keluarga-uae.html', 'koper-uae.html': 'koper-uae.html',
         'ujian-sim-abudhabi.html': 'ujian-sim-abudhabi.html'}
FONTS = ('Fredoka One', 'Nunito')
TESTS = ['test-uae-data.mjs', 'test-uae-engines.mjs']


def die(msg):
    sys.exit('export-relocation: ' + msg)


def clean(out):
    os.makedirs(out, exist_ok=True)
    for n in os.listdir(out):
        if n == '.git':
            continue
        p = os.path.join(out, n)
        shutil.rmtree(p) if os.path.isdir(p) and not os.path.islink(p) else os.remove(p)


def font_subset(out):
    css = open(os.path.join(ROOT, 'assets/fonts/fonts.css')).read()
    blocks = re.findall(r'@font-face\s*{[^}]*}', css)
    keep = [b for b in blocks if any("'%s'" % f in b or '"%s"' % f in b for f in FONTS)]
    if not keep:
        die('no @font-face for ' + ', '.join(FONTS))
    os.makedirs(os.path.join(out, 'assets/fonts'), exist_ok=True)
    for f in sorted(set(re.findall(r'url\(([^)]+)\)', ''.join(keep)))):
        shutil.copy(os.path.join(ROOT, 'assets/fonts', f.strip('\'"')), os.path.join(out, 'assets/fonts'))
    open(os.path.join(out, 'assets/fonts/fonts.css'), 'w').write('\n'.join(keep) + '\n')


def icons(out):
    """Own icon: a white suitcase on the app's ink colour. Drawn as SVG, rasterised with ImageMagick."""
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#2f2440"/>'
           '<g fill="none" stroke="#fff8ec" stroke-width="28" stroke-linejoin="round" stroke-linecap="round">'
           '<rect x="126" y="176" width="260" height="220" rx="36"/><path d="M206 176v-40a24 24 0 0 1 24-24h52a24 24 0 0 1 24 24v40"/>'
           '<path d="M206 236v100M306 236v100"/></g></svg>')
    a = os.path.join(out, 'assets')
    open(os.path.join(a, 'icon.svg'), 'w').write(svg)
    for size, name in ((512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png'), (32, 'favicon-32.png')):
        subprocess.run(['magick', '-background', 'none', '-density', '300', os.path.join(a, 'icon.svg'),
                        '-resize', '%dx%d' % (size, size), '-strip', '-define', 'png:exclude-chunks=date,time', os.path.join(a, name)], check=True)


def page(src, dst, out):
    s = open(os.path.join(G, src)).read()
    for a, b in PAGES.items():
        s = s.replace('href="%s' % a, 'href="%s' % b)
    s = s.replace('href="../manifest.json"', 'href="manifest.webmanifest"')
    s = s.replace('../assets/', 'assets/')
    # the landing's back arrow led to the Dunia Emosi hub; standalone it has nowhere to go
    s = re.sub(r'\s*<a class="u-icon-btn" href="\.\./index\.html"[^>]*>.*?</a>', '', s, flags=re.S)
    s = re.sub(r'<script src="sw-reload\.js[^"]*"></script>', '<script src="sw-register.js"></script>', s)
    if '../' in s:
        die('%s still points outside the app: %s' % (src, re.findall(r'[^"\s]*\.\./[^"\s]*', s)[:3]))
    open(os.path.join(out, dst), 'w').write(s)


def write_sw(out, files):
    h = hashlib.sha256()
    for f in sorted(files):
        h.update(f.encode()); h.update(open(os.path.join(out, f), 'rb').read())
    ver = h.hexdigest()[:12]
    open(os.path.join(out, 'sw.js'), 'w').write(
        "// Offline after one visit: every file of the app is cached on install. VERSION is a hash of all files,\n"
        "// so any change makes a new cache and the old one is deleted on activate.\n"
        "const VERSION = '%s'\nconst FILES = %s\n" % (ver, json.dumps(['./'] + sorted(files), indent=1)) +
        "self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())))\n"
        "self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())))\n"
        "self.addEventListener('fetch', e => {\n"
        "  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return\n"
        "  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)))\n"
        "})\n")
    return ver


def main():
    if len(sys.argv) != 2:
        die('usage: export-relocation.py <out-dir>')
    out = os.path.abspath(sys.argv[1])
    clean(out)
    shutil.copytree(os.path.join(G, 'uae'), os.path.join(out, 'uae'))
    shutil.copy(os.path.join(G, 'du-buttons.css'), out)
    font_subset(out)
    icons(out)
    for a, b in PAGES.items():
        page(a, b, out)
    open(os.path.join(out, 'sw-register.js'), 'w').write(
        "// Registers the offline service worker. A new version takes over on the next page load.\n"
        "if ('serviceWorker' in navigator) addEventListener('load', function () { navigator.serviceWorker.register('sw.js') })\n")
    json.dump({'name': 'Relocation to UAE', 'short_name': 'Relokasi UAE', 'lang': 'id', 'start_url': './', 'scope': './',
               'display': 'standalone', 'background_color': '#fff8ec', 'theme_color': '#2f2440',
               'icons': [{'src': 'assets/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
                         {'src': 'assets/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
                         {'src': 'assets/icon.svg', 'sizes': 'any', 'type': 'image/svg+xml'}]},
              open(os.path.join(out, 'manifest.webmanifest'), 'w'), indent=1)
    os.makedirs(os.path.join(out, 'tests'))
    for t in TESTS:
        s = open(os.path.join(ROOT, 'tools', t)).read().replace('../games/uae/', '../uae/').replace('games/uae/', 'uae/')
        if 'games/' in s:
            die(t + ' still reads games/')
        open(os.path.join(out, 'tests', t), 'w').write(s)
    files = []
    for d, _, fs in os.walk(out):
        if '/.git' in d or d.endswith('/tests') or '/.github' in d:
            continue
        files += [os.path.relpath(os.path.join(d, f), out) for f in fs]
    files = [f for f in files if f != 'sw.js']
    ver = write_sw(out, files)
    os.makedirs(os.path.join(out, '.github/workflows'))
    open(os.path.join(out, '.github/workflows/pages.yml'), 'w').write(PAGES_YML)
    open(os.path.join(out, 'README.md'), 'w').write(README)
    src = subprocess.run(['git', '-C', ROOT, 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
    open(os.path.join(out, 'SOURCE'), 'w').write('Exported from Dunia-Emosi %s by tools/export-relocation.py. Edit there, not here.\n' % src)
    print('exported %d files, sw %s, from %s -> %s' % (len(files), ver, src, out))


PAGES_YML = """name: Test and deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Tests (data facts, sources, schedule, quiz engines)
        run: node tests/test-uae-data.mjs && node tests/test-uae-engines.mjs
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - id: deployment
        uses: actions/deploy-pages@v4
"""

README = """# Relocation to UAE

Personal planning app for moving a family to Abu Dhabi: work documents, family visa (wife and children), packing
list, and the Abu Dhabi driving theory test. Indonesian, works offline after one visit, everything is saved only on
this device (export a JSON backup from each page).

Every cost, rule and office carries its source and the date it was checked. Rules change: re-check anything older
than 6 months (the app flags it).

Pages: `index.html` (menu and tracker), `pindah-abudhabi.html`, `visa-keluarga-uae.html`, `koper-uae.html`,
`ujian-sim-abudhabi.html`. Tests: `node tests/test-uae-data.mjs && node tests/test-uae-engines.mjs`.

This repo is generated. See `SOURCE` for the commit it came from.
"""

if __name__ == '__main__':
    main()
