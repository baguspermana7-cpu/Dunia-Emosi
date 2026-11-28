#!/usr/bin/env node
// test-uae-data — PRD-59 L2 + L4 (docs/prd/PRD-59-orang-tua-abudhabi.md): the data behind "Relocation to UAE".
// L2 every document step has an issuer, a place, what to bring, a cost (number + currency + date) and a source URL;
//    the "needs" order has no cycle and every needed step comes earlier; phase totals add up to the whole.
// L4 every practice question has Indonesian and English text, one answer that exists, an explanation, a source and a
//    date; no duplicate question; every topic has at least 10 questions; every sign a question names is drawn.
// Usage: node tools/test-uae-data.mjs
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m) } }
const D = require('../games/uae/uae-docs-data.js')
const B = require('../games/uae/uae-sim-bank.js')
const SG = require('../games/uae/uae-signs.js')
const url = u => /^https:\/\/[^\s]+\.[a-z]{2,}/i.test(u)
const date = d => /^20\d\d-\d\d(-\d\d)?$/.test(String(d))

// ---- L2 documents ----
ok(date(D.checked), 'docs: checked date')
ok(D.fx && D.fx.aedToIdr > 3000 && D.fx.aedToIdr < 6000 && date(D.fx.asOf) && D.fx.source, `docs: AED->IDR rate sane with date+source (${D.fx && D.fx.aedToIdr})`)
const phaseIds = new Set(D.phases.map(p => p.id)), seen = new Map()
ok(D.steps.length >= 15, `docs: at least 15 steps (${D.steps.length})`)
D.steps.forEach((s, i) => {
  const t = `docs step ${i + 1} ${s.id}`
  ok(!seen.has(s.id), `${t}: unique id`); seen.set(s.id, i)
  ok(phaseIds.has(s.phase), `${t}: phase ${s.phase} exists`)
  ok(s.title && s.issuer, `${t}: title + issuer`)
  ok(s.where && s.where.name, `${t}: place name`)
  ok(Array.isArray(s.bring) && s.bring.length, `${t}: what to bring`)
  ok(s.pages, `${t}: number of sheets/copies`)
  ok(s.time, `${t}: processing time`)
  const c = s.cost
  ok(c && Number.isFinite(c.min) && Number.isFinite(c.max) && c.min >= 0 && c.max >= c.min && /^(IDR|AED)$/.test(c.cur) && date(c.asOf), `${t}: cost min<=max, IDR|AED, asOf (${JSON.stringify(c)})`)
  ok(['self', 'employer', 'either'].includes(s.payer), `${t}: payer`)
  ok(Array.isArray(s.sources) && s.sources.length && s.sources.every(url), `${t}: >=1 https source`)
  ok(!c || !c.est || (c.note && c.note.length > 10), `${t}: an estimate says why`)
})
D.steps.forEach((s, i) => (s.needs || []).forEach(n => ok(seen.has(n) && seen.get(n) < i, `docs ${s.id}: needs ${n}, which must exist and come earlier`)))
// totals: the sum of the phases equals the whole (mirrors uae-docs.js totals())
const fx = D.fx.aedToIdr, idr = (v, cur) => cur === 'AED' ? v * fx : v
const own = D.steps.filter(s => s.payer !== 'employer')
const whole = own.reduce((a, s) => a + idr(s.cost.max, s.cost.cur), 0)
const byPhase = D.phases.reduce((a, p) => a + own.filter(s => s.phase === p.id).reduce((b, s) => b + idr(s.cost.max, s.cost.cur), 0), 0)
ok(Math.abs(whole - byPhase) < 1e-6, `docs: phase totals add up to the whole (${whole} vs ${byPhase})`)
ok(D.phases.every(p => D.steps.some(s => s.phase === p.id)), 'docs: no empty phase')

// ---- L4 questions ----
const topics = new Set(B.topics.map(t => t.id)), texts = new Set(), ids = new Set()
ok(B.format && B.format.count > 0 && B.format.minutes > 0 && B.format.pass > 0 && B.format.pass <= B.format.count, 'sim: exam format numbers')
ok(B.format.verified ? url(B.format.source) && date(B.format.asOf) : !!B.format.note, 'sim: exam format has a source, or says it is unverified')
B.questions.forEach((q, i) => {
  const t = `sim q${i + 1} ${q.id}`
  ok(!ids.has(q.id), `${t}: unique id`); ids.add(q.id)
  ok(topics.has(q.topic), `${t}: topic ${q.topic}`)
  ok(q.q && q.q.id && q.q.en, `${t}: question in ID and EN`)
  const key = (q.q.en + '|' + (q.sign || '')).toLowerCase().replace(/\W+/g, ' ').trim()
  ok(!texts.has(key), `${t}: no duplicate question`); texts.add(key)
  ok(Array.isArray(q.opts) && q.opts.length >= 3 && q.opts.length <= 4 && q.opts.every(o => o.id && o.en), `${t}: 3-4 options, each ID+EN`)
  ok(new Set(q.opts.map(o => o.en.toLowerCase())).size === q.opts.length, `${t}: options distinct`)
  ok(Number.isInteger(q.a) && q.a >= 0 && q.a < q.opts.length, `${t}: answer index in range`)
  ok(q.ex && q.ex.id && q.ex.en, `${t}: explanation ID+EN`)
  ok(url(q.src) && date(q.asOf), `${t}: source + date`)
  ok(!q.sign || SG.keys.includes(q.sign) || (/^ae:/.test(q.sign) && !!require('../games/uae/uae-signs-real.js').byCode[q.sign.slice(3)]), `${t}: sign ${q.sign} is drawn or is a listed real code`)
})
B.topics.forEach(t => { const n = B.questions.filter(q => q.topic === t.id).length; ok(n >= 10, `sim topic ${t.id}: >= 10 questions (${n})`) })
ok(B.questions.length >= B.format.count, `sim: bank (${B.questions.length}) covers one exam (${B.format.count})`)
// licence process uses the PRD-59A step schema (same engine, UAEFlow)
ok(B.process && B.process.steps.length >= 5, 'sim: licence process has >= 5 steps')
const seenP = new Set()
;(B.process ? B.process.steps : []).forEach(s => {
  const t = `sim step ${s.id}`
  ok(s.id && !seenP.has(s.id) && s.phase === 'sim' && s.title && s.why && s.issuer && s.where && s.where.name, `${t}: id, phase, title, why, issuer, where`)
  ok(Array.isArray(s.bring) && s.bring.every(b => b.id && b.text), `${t}: bring items {id,text}`)
  ok(s.cost && ['IDR', 'AED'].includes(s.cost.cur) && s.cost.min <= s.cost.max && s.cost.asOf && (!s.cost.est || s.cost.note), `${t}: cost IDR|AED, min<=max, asOf, estimate has a note`)
  ok((s.needs || []).every(n => seenP.has(n)), `${t}: needs only earlier steps`)
  ok(s.sources && s.sources.length && s.sources.every(url), `${t}: https sources`)
  seenP.add(s.id)
})

// L13 (PRD-59B §9) journey map: every licence step sits in exactly one stage, stages follow the step order
{
  const st = (B.process && B.process.stages) || [], flat = st.flatMap(g => g.steps || [])
  ok(st.length >= 2 && st.every(g => g.id && g.title && g.steps && g.steps.length), `L13: stages with id, title and steps (${st.length})`)
  ok(flat.join() === B.process.steps.map(s => s.id).join(), `L13: stages list every step once, in step order (${flat.join()})`)
}

// L11 (PRD-59B §8) real sign artwork: every mapped sign has a local WebP + a free licence + https source page,
// every file on disk has a credit, and question signs that map to a real code actually get it
{
  const fsx = require('node:fs')
  const RS = require('../games/uae/uae-signs-real.js')
  let C = {}
  try { C = require('../games/uae/uae-signs-credits.js') } catch (e) { ok(false, 'L11: uae-signs-credits.js exists (run tools/build-uae-signs.mjs)') }
  const FREE = /^(public domain|cc0|cc by(-sa)? \d\.\d)/i
  for (const [k, code] of Object.entries(RS.keymap)) {
    const f = `games/uae/signs/${code}.webp`, c = C[code]
    ok(fsx.existsSync(f) && c && FREE.test(c.licence) && /^https:\/\//.test(c.page), `L11 sign ${k} -> ${code}: local file, free licence, source page (${c ? c.licence : 'no credit'})`)
  }
  const files = fsx.existsSync('games/uae/signs') ? fsx.readdirSync('games/uae/signs') : []
  ok(files.length >= 100, `L11: at least 100 real sign images on disk (${files.length})`)
  ok(files.every(f => C[f.replace(/\.webp$/, '')]), 'L11: every file in games/uae/signs has a credit entry')
  ok(Object.keys(C).every(code => RS.byCode[code] && RS.byCode[code].en && RS.byCode[code].id), 'L11: every credited sign has an English and an Indonesian name')
}
// ---- PRD-59C family visa (L16 data, L17 per child) ----
{
  const FAM = require('../games/uae/uae-family-data.js'), FL = require('../games/uae/uae-flow.js')
  ok(date(FAM.checked) && FAM.steps.length >= 20, `L16: family data dated, ${FAM.steps.length} base steps`)
  const office = s => s.where && s.where.name && s.where.name.length > 5
  FAM.steps.forEach(s => {
    ok(['sponsor', 'wife', 'child', 'family'].includes(s.who) && ['id', 'ae'].includes(s.land), `L16 ${s.id}: who + country`)
    ok(office(s) && s.issuer && s.why && s.why.length > 40, `L16 ${s.id}: issuer, office and a reason`)
    ok(s.bring.length >= 1 && s.bring.every(b => b.id && b.text.length > 8 && b.copies), `L16 ${s.id}: every item names the paper and how many (${s.bring.filter(b => !b.copies).map(b => b.id)})`)
    ok(new Set(s.bring.map(b => b.id)).size === s.bring.length, `L16 ${s.id}: item ids unique`)
    ok(s.cost && Number.isFinite(s.cost.min) && s.cost.max >= s.cost.min && ['IDR', 'AED'].includes(s.cost.cur) && date(s.cost.asOf), `L16 ${s.id}: cost with currency and date`)
    ok(s.cost.est || s.cost.note !== undefined, `L16 ${s.id}: cost says official or estimate`)
    ok(s.sources.length && s.sources.every(url), `L16 ${s.id}: https sources`)
    ok(s.days && s.days.min >= 0 && s.days.max >= s.days.min && s.days.max <= 30, `L21 ${s.id}: days min..max (${JSON.stringify(s.days)})`)
  })
  ok(FL.validate({ steps: FAM.steps }).length === 0, 'L16: base needs come earlier, no duplicate')
  // the official Kemenag chain the owner named: KUA copies, Kemenag, Kemenkum, Kemlu, Embassy, in that order
  const order = ['w-nikah-kua', 'w-nikah-kemenag', 'w-nikah-ahu', 'w-nikah-kemlu', 'w-nikah-uae'].map(id => FAM.steps.findIndex(s => s.id === id))
  ok(order.every((v, i) => v >= 0 && (i === 0 || v > order[i - 1])), `L16: buku nikah chain KUA > Kemenag > Kemenkum > Kemlu > Kedutaan (${order})`)
  const kem = FAM.steps.find(s => s.id === 'w-nikah-kemenag')
  ok(kem.needs.includes('w-nikah-kua') && FAM.steps.find(s => s.id === 'w-nikah-ahu').needs.includes('w-nikah-kemenag'), 'L16: Kemenag waits for the KUA copies, Kemenkum waits for Kemenag')
  ok(kem.bring.some(b => /3 lembar/.test(b.copies)) && kem.bring.some(b => /kuasa/.test(b.text)) && /lantai 9/.test(kem.where.address), 'L16: Kemenag step lists the 3 KUA-legalised copies, the power of attorney and floor 9')
  // L17 per child
  const two = FAM.build([{ name: 'Ani', stage: 'g2' }, { name: 'Budi', stage: 'pre' }])
  const ids = two.steps.map(s => s.id)
  ok(new Set(ids).size === ids.length && FL.validate(two).length === 0, 'L17: built list valid, ids unique')
  ok(ids.includes('c-passport-1') && ids.includes('c-passport-2') && two.steps.find(s => s.id === 'c-passport-2').title.includes('Budi'), 'L17: each child has own steps with the name')
  ok(ids.includes('c-school-docs-1') && !ids.includes('c-school-docs-2') && !ids.includes('c-school-ask-2'), 'L17: a child not yet at school gets no school steps')
  ok(two.steps.find(s => s.id === 'sp-entry').needs.includes('c-passport-2') && two.steps.find(s => s.id === 'c-akta-uae-2').needs.join() === 'c-akta-kemlu-2', 'L17: entry permit waits for every child, a child step waits for the same child')
  ok(!FAM.build([{ name: 'K', stage: 'pre' }]).steps.some(s => s.id === 'f-school'), 'L17: no school registration when no child goes to school')
  ok(FAM.build(['Lama']).steps.some(s => s.id === 'c-school-docs-1'), 'L17: an old saved name (string) still builds, as Grade 2+')
  const one = FAM.build([{ name: 'A', stage: 'g2' }]), base = FAM.steps.find(s => s.id === 'sp-entry').cost
  ok(two.steps.find(s => s.id === 'sp-entry').cost.max === base.max * 3 && one.steps.find(s => s.id === 'sp-entry').cost.max === base.max * 2 && two.steps.find(s => s.id === 'w-nikah-uae').cost.min === FAM.steps.find(s => s.id === 'w-nikah-uae').cost.min * 3, 'L16: per-person and per-document fees count the wife and every child')
  const r = FL.schedule(two.steps, {})
  ok(r.total[1] <= 90 && r.critical.includes('sp-entry'), `L21: family plan ${r.total} days, critical ${r.critical.join('>')}`)
  // L21b the plan never puts the departure in the past: steps still open run from today when the start date is behind
  {
    const P = FAM.plan, fresh = P && P(FL, two.steps, {}, '2026-11-28', '2026-11-28')
    ok(!!fresh && fresh.anchor === '2026-11-28' && fresh.depart[0] === FL.addDays('2026-11-28', r.steps['f-flight'].start[0]) && fresh.goal === '2027-02-26' && !fresh.late, `L21b: plan from today: depart ${fresh && fresh.depart}, goal ${fresh && fresh.goal}`)
    const old = P && P(FL, two.steps, {}, '2026-09-01', '2026-11-28')
    ok(!!old && old.anchor === '2026-11-28' && old.depart[0] >= '2026-11-28' && old.goal === '2026-11-30' && old.late, `L21b: start 3 months ago, nothing done: dates run from today (${old && old.depart}), target 30 Nov passed, late`)
    const allDone = { steps: {} }; two.steps.forEach(x => { allDone.steps[x.id] = { status: 'done' } })
    const fin = P && P(FL, two.steps, allDone, '2026-09-01', '2026-11-28')
    ok(!!fin && fin.done && !fin.late, 'L21b: every step done: plan reports done, not late')
    const fut = P && P(FL, two.steps, {}, '2027-01-10', '2026-11-28')
    ok(!!fut && fut.anchor === '2027-01-10' && fut.goal === '2027-04-10', 'L21b: a future start date is kept as the anchor')
    const nx = P && P(FL, two.steps, {}, '2026-11-28', '2026-11-28')
    ok(!!nx && nx.first === r.critical[0], `L21b: "start here" = first open step of the critical path (${nx && nx.first})`)
    const d1 = { steps: {} }; d1.steps[r.critical[0]] = { status: 'done' }
    const nx2 = P && P(FL, two.steps, d1, '2026-11-28', '2026-11-28')
    ok(!!nx2 && nx2.first !== r.critical[0] && FL.state(d1, nx2.first).status !== 'done', `L21b: after it is done the next open critical step leads (${nx2 && nx2.first})`)
  }
  // L22 every glossary term used by some step has a tip; every step text term is explained
  ok(FAM.glossary.every(g => g.term && g.tip.length > 30), 'L22: every glossary term has an explanation')
  const used = FAM.glossary.filter(g => FAM.steps.some(s => [s.title, s.why, s.notes, s.issuer, s.where.name, ...s.bring.map(b => b.text)].join(' ').includes(g.term)))
  ok(used.length >= 15, `L22: ${used.length} glossary terms appear in the steps`)
}
// ---- PRD-59D packing list (L19) ----
{
  const KP = require('../games/uae/uae-koper-data.js')
  const items = KP.groups.flatMap(g => g.items)
  ok(date(KP.checked) && KP.groups.length >= 8 && items.length >= 50, `L19: ${KP.groups.length} groups, ${items.length} items, dated`)
  ok(new Set(items.map(x => x.id)).size === items.length, 'L19: item ids unique')
  items.forEach(x => {
    ok(['ibu', 'anak', 'semua'].includes(x.who) && KP.locs[x.loc] && KP.grades[x.grade] && x.qty && x.text.length > 8, `L19 ${x.id}: who, place, grade, quantity`)
    ok(x.tip && x.tip.length > 20, `L19 ${x.id}: explanation for the info button`)
    ok(x.grade !== 'resmi' || (x.src.length && x.src.every(url)), `L19 ${x.id}: an "official" item cites https sources`)
  })
  // the rules that cause real trouble are present and say the official numbers
  const has = (id, re) => { const x = items.find(y => y.id === id); return x && re.test(x.qty + ' ' + x.tip) }
  ok(has('powerbank', /100 Wh/) && has('powerbank', /satu power bank/) && items.find(y => y.id === 'powerbank').loc === 'kabin', 'L19: power bank one, 100 Wh, cabin (Etihad)')
  ok(has('aed', /60\.000/) && has('idr', /100 juta/), 'L19: cash thresholds AED 60.000 and Rp 100 juta')
  ok(has('controlled', /izin/) && items.find(y => y.id === 'controlled').loc === 'jangan', 'L19: controlled medicine needs a permit, never packed without one')
  ok(['passport', 'nikah', 'akta', 'powerbank', 'rx'].every(id => items.find(y => y.id === id).loc === 'kabin'), 'L19: originals, medicine and power bank are in the cabin bag')
  ok(KP.conflicts.length >= 3, 'L19: conflicts listed')
}
// ---- L23 (PRD-59 8.3): every text of the data has an English text, numbers and official names survive ----
{
  const EN = require('../games/uae/uae-i18n-en.js'); globalThis.UAEI18N_EN = EN
  const T = require('../games/uae/uae-i18n.js')
  const FMd = require('../games/uae/uae-family-data.js'), KPd = require('../games/uae/uae-koper-data.js')
  const SKIP = /^(id|sources|src|asOf|checked|cur|url|needs|phase|who|land|loc|grade|payer|per|sign|map|tel|href|code|stage)$/
  const texts = new Set()
  const walk = o => { if (o == null) return; if (typeof o === 'string') { const t = o.trim().replace(/\s+/g, ' '); if (t.length > 1 && /[A-Za-z]{2}/.test(t) && !/^https?:/.test(t) && !/^\d{4}-\d\d/.test(t) && !/^[a-z0-9-]+$/.test(t)) texts.add(t); return } if (Array.isArray(o)) return o.forEach(walk); if (typeof o === 'object') for (const k in o) if (!SKIP.test(k)) walk(o[k]) }
  walk([D.steps, D.phases, FMd.build([{ name: 'Anak 1', stage: 'g2' }, { name: 'Anak 2', stage: 'kg' }]).steps, FMd.glossary, FMd.conflicts, KPd.groups, KPd.conflicts, B.process])
  const none = [...texts].filter(t => T.core(t) == null)
  ok(texts.size > 700 && none.length === 0, `L23: ${none.length} of ${texts.size} data texts have no English text: ${none.slice(0, 6).join(' | ')}`)
  const nums = s => (s.match(/\d+(?:[.,]\d+)*/g) || []).sort().join(' ')
  const NAMES = ['ICP', 'TAMM', 'MOHRE', 'Tawtheeq', 'Emirates ID', 'KUA', 'Kemenag', 'Kemenkum', 'Kemlu', 'M-Paspor', 'SKCK', 'STEMPEL ASLI', 'Etihad', 'MOHAP', 'AED']
  let badNum = [], badName = [], ph = []
  for (const [k, v] of Object.entries(EN.map)) {
    if (nums(k) !== nums(v)) badNum.push(k)
    for (const n of NAMES) if (k.includes(n) !== v.includes(n)) badName.push(n + ': ' + k)
    if ((k.match(/\{(\d+|tgl)\}/g) || []).sort().join() !== (v.match(/\{(\d+|tgl)\}/g) || []).sort().join()) ph.push(k)
  }
  ok(Object.keys(EN.map).length > 1000 && badNum.length === 0, `L23: numbers differ between ID and EN in ${badNum.length} texts: ${badNum.slice(0, 2).join(' | ').slice(0, 200)}`)
  ok(badName.length === 0, `L23: an official name is lost or added in ${badName.length} texts: ${badName.slice(0, 2).join(' | ').slice(0, 200)}`)
  ok(ph.length === 0, `L23: placeholders differ in ${ph.length} texts: ${ph.slice(0, 2).join(' | ')}`)
  ok(T.core('3 dari 21 selesai') === '3 of 21 done' && T.core('1 Des 2026 sampai 4 Jan 2027') === '1 Dec 2026 to 4 Jan 2027' && T.core('Tunggu langkah 1, 2 dulu') === 'Wait for step 1, 2 first', 'L23: number template, date range and waiting rule')
  ok(T.core('Anak Budi, Anak Sari') == null && T.t('  Budi  ') === '  Budi  ', 'L23: a text with no English entry (a typed name) is left as it is, spacing kept')
  // the standalone export carries the generated file only, so the freshness check runs where the builder is
  const builder = new URL('./build-uae-i18n.py', import.meta.url).pathname
  if (require('node:fs').existsSync(builder)) ok(require('node:child_process').spawnSync('python3', [builder, '--check']).status === 0, 'L23: uae-i18n-en.js is fresh (tools/build-uae-i18n.py --check)')
}
console.log(`test-uae-data: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
