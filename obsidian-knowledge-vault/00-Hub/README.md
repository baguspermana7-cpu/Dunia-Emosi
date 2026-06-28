---
id: de
label: Dunia Emosi
group: root
url: index.html
tags: [hub, vault, knowledge-graph, dunia-emosi]
---

# Dunia Emosi — Knowledge Vault

> The Obsidian mirror of the interactive **Second Brain** knowledge graph
> (`secondbrain.html`). Every node in the graph has a note here, organized by
> the same groups, cross-linked with `[[wikilinks]]` so Obsidian's own graph
> view reproduces the web graph.

## Root

- [[de|Dunia Emosi]] — emotion-learning game suite for kids aged 5 to 10.

## Groups

| Folder | Group | What lives here |
|---|---|---|
| `01-Architecture` | architecture | System structure, asset pipeline, dynamic background, save + layout engines |
| `02-Characters`   | characters   | Character-train + sprite standards |
| `03-Gameplay`     | gameplay     | Station journey, city progression, Mario spec, ideas backlog, math difficulty |
| `04-Obstacles`    | obstacles    | Obstacle engine + obstacle variety briefs |
| `05-Pokemon`      | pokemon      | Battle balance, type effectiveness, evolution chains |
| `06-Standards`    | standards    | Coding standards, review checklist, references, regression checks, palette |
| `07-Audits`       | audits       | App audits, load + service-worker audits, changelog, lessons learned |
| `08-Games`        | games        | The 14 standalone playable game HTML pages |

## How it stays in sync

Run the checker from the project root:

```bash
python3 tools/sync-graph.py          # report: dead URLs, isolated nodes, missing notes
python3 tools/sync-graph.py --fix    # generate any missing node notes
```

It parses `secondbrain.html`'s `RAW` (nodes) + `E` (edges), validates every
`url` against the filesystem (decoding `%20`), flags orphan nodes, and writes
rich notes (frontmatter + `[[wikilinks]]` + summary) for anything not yet
mirrored here.
