#!/usr/bin/env python3
"""
sync-graph.py — Vault <-> Second Brain auto-sync checker (Dunia Emosi)
Usage: python3 tools/sync-graph.py [--fix]

Reads secondbrain.html RAW node array + E edge array and cross-checks against:
1. HTML/MD file existence (dead links in RAW nodes)
2. Edge connectivity (nodes with zero edges = isolated)
3. Obsidian vault .md files (missing vault notes for existing nodes)

With --fix, generates a rich markdown note (frontmatter + wikilinks to connected
nodes + a one-line summary) for any node that lacks one.

Run from: Dunia-Emosi/  (or anywhere — paths are derived from this file).
"""
import os, re, sys
from urllib.parse import unquote

BASE  = os.path.dirname(os.path.abspath(__file__))          # Dunia-Emosi/tools
ROOT  = os.path.abspath(os.path.join(BASE, '..'))           # Dunia-Emosi
VAULT = os.path.join(ROOT, 'obsidian-knowledge-vault')
HTML  = os.path.join(ROOT, 'secondbrain.html')

FIX_MODE = '--fix' in sys.argv

# Group -> vault folder
FOLDER_MAP = {
    'root':         '00-Hub',
    'architecture': '01-Architecture',
    'characters':   '02-Characters',
    'gameplay':     '03-Gameplay',
    'obstacles':    '04-Obstacles',
    'pokemon':      '05-Pokemon',
    'standards':    '06-Standards',
    'audits':       '07-Audits',
    'games':        '08-Games',
    'journey':      '09-Journey',
}

# ── Parse RAW nodes from secondbrain.html ────────────────────────────────────
with open(HTML, encoding='utf-8') as f:
    src = f.read()

raw_block = re.search(r'const RAW=\[(.*?)\];', src, re.DOTALL)
if not raw_block:
    print("ERROR  Could not find RAW array in secondbrain.html"); sys.exit(1)

raw_text = raw_block.group(1)

# Expand any `const D='...'` URL-prefix constant so `url:D+'NAME.md'` becomes a
# plain string literal the node regex can read.
d_const = re.search(r"const D='([^']*)';", src)
if d_const:
    raw_text = raw_text.replace("D+'", "'" + d_const.group(1))

# id, label, group, url(null|'..'), desc
node_rx = re.compile(
    r"\{id:'([^']+)',\s*label:'([^']+)',\s*group:'([^']+)',\s*(?:emoji:'[^']*',\s*)?url:(null|'[^']*'),\s*desc:'([^']*?)'",
    re.DOTALL,
)
nodes = node_rx.findall(raw_text)

# also capture tags for each node id (best-effort)
tag_rx = re.compile(r"\{id:'([^']+)'.*?tags:\[([^\]]*)\]", re.DOTALL)
tags_by_id = {}
for nid, tagstr in tag_rx.findall(raw_text):
    tags_by_id[nid] = [t.strip().strip("'\"") for t in tagstr.split(',') if t.strip()]

edges_block = re.search(r'const E=\[(.*?)\];', src, re.DOTALL)
edge_pairs = re.findall(r"\['([^']+)','([^']+)'\]", edges_block.group(1)) if edges_block else []

labels_by_id = {n[0]: n[1] for n in nodes}
group_by_id  = {n[0]: n[2] for n in nodes}

print(f"\n  Dunia Emosi — Second Brain Graph Sync Report")
print(f"    {len(nodes)} nodes  -  {len(edge_pairs)} edges\n")

# ── Check 1: Dead URLs ───────────────────────────────────────────────────────
print("---  1. Dead URLs (node URL file does not exist on disk)  ---")
dead = []
for nid, label, group, url, desc in nodes:
    if url == 'null' or url.startswith("'http"):
        continue
    url_clean = unquote(url.strip("'"))     # decode %20 etc. for filesystem check
    full_path = os.path.join(ROOT, url_clean)
    if not os.path.exists(full_path):
        dead.append((nid, label, url_clean))

if dead:
    for nid, label, url_clean in dead:
        print(f"  [DEAD] [{nid}] {label}\n         -> {url_clean}")
else:
    print("  OK  All URLs valid")

# ── Check 2: Isolated nodes (degree 0) ───────────────────────────────────────
print("\n---  2. Isolated nodes (no edges)  ---")
node_ids = {n[0] for n in nodes}
connected = set()
for a, b in edge_pairs:
    connected.add(a); connected.add(b)
isolated = node_ids - connected
if isolated:
    for nid in sorted(isolated):
        print(f"  [ISOLATED] [{nid}] {labels_by_id.get(nid, nid)}  ({group_by_id.get(nid,'?')})")
else:
    print("  OK  All nodes have at least one edge")

# ── Check 3: Vault notes vs nodes ────────────────────────────────────────────
print("\n---  3. Vault coverage (nodes missing an Obsidian note)  ---")
vault_files = set()
for root, dirs, files in os.walk(VAULT):
    for fn in files:
        if fn.endswith('.md'):
            vault_files.add(fn[:-3].lower())

no_note = []
for nid, label, group, url, desc in nodes:
    # a note named exactly <nid>.md (case-insensitive) satisfies coverage
    if nid.lower() not in vault_files:
        no_note.append((nid, label, group, url, desc))

if no_note:
    print(f"  {len(no_note)} node(s) without a dedicated vault note:")
    for nid, label, group, url, desc in no_note[:30]:
        print(f"  [NOTE?] [{nid}] {label}  ({group})")
    if len(no_note) > 30:
        print(f"  ... and {len(no_note)-30} more")
else:
    print("  OK  All nodes have corresponding vault notes")

# ── Check 4: Vault hub file ──────────────────────────────────────────────────
print("\n---  4. Vault hub  ---")
readme = os.path.join(VAULT, '00-Hub', 'README.md')
print(f"  {'OK' if os.path.exists(readme) else 'MISSING'}  00-Hub/README.md")

# ── Summary ──────────────────────────────────────────────────────────────────
print(f"\n---  Summary  ---")
print(f"  Dead URLs:      {len(dead)}")
print(f"  Isolated nodes: {len(isolated)}")
print(f"  Missing notes:  {len(no_note)}")

total_issues = len(dead) + len(isolated)
if total_issues == 0:
    print("\n  HEALTHY — all links valid, no orphans\n")
else:
    print(f"\n  {total_issues} issue(s) found. (Dead/isolated must be resolved in the graph data.)\n")

# ── Fix mode: generate rich vault notes for nodes missing them ───────────────
if FIX_MODE and no_note:
    print("---  Fix mode: generating vault notes  ---")
    # adjacency for wikilinks
    adj = {n[0]: [] for n in nodes}
    for a, b in edge_pairs:
        if a in adj and b not in adj[a]:
            adj[a].append(b)
        if b in adj and a not in adj[b]:
            adj[b].append(a)

    created = 0
    for nid, label, group, url, desc in no_note:
        url_clean = '' if url == 'null' else url.strip("'")
        tags = tags_by_id.get(nid, [])
        conns = adj.get(nid, [])
        wikilinks = '\n'.join(
            f"- [[{c}|{labels_by_id.get(c, c)}]] _({group_by_id.get(c,'?')})_"
            for c in conns
        ) or "_No connections._"
        note = f"""---
id: {nid}
label: {label}
group: {group}
url: {url_clean}
tags: [{', '.join(tags)}]
---

# {label}

> {desc}

## Connections

{wikilinks}

## Notes

_Add personal notes here._
"""
        folder = os.path.join(VAULT, FOLDER_MAP.get(group, '00-Hub'))
        os.makedirs(folder, exist_ok=True)
        fname = os.path.join(folder, f"{nid}.md")
        if not os.path.exists(fname):
            with open(fname, 'w', encoding='utf-8') as f:
                f.write(note)
            print(f"  Created {FOLDER_MAP.get(group,'00-Hub')}/{nid}.md")
            created += 1
        else:
            print(f"  Skipped {nid}.md (already exists)")
    print(f"\n  {created} note(s) created.\n")
