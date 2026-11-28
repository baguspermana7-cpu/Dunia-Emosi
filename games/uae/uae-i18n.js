/* PRD-59 §8.3 (L23): Indonesian / English on the relocation pages with no reload.
   The data and the renderers stay Indonesian (one source). This module swaps text in place: every text node and the
   aria-label / placeholder / alt / title attributes are looked up in the dictionary (uae-i18n-en.js: exact strings,
   then pattern rules for sentences built around numbers, names and dates). The original text is kept per node, so
   switching back restores it exactly. A MutationObserver translates whatever a renderer writes later; it is
   disconnected while this module writes, so it never reacts to itself.
   Not translated: anything inside [data-noi18n] (the quiz has its own language mode), form field values, and text
   with no dictionary entry (official names, the children's names, what the owner typed). */
(function (root) {
  'use strict'
  var KEY = 'dunia-uae-lang-v1', ATTRS = ['aria-label', 'placeholder', 'alt', 'title']
  var DICT = root.UAEI18N_EN || { map: {}, rules: [] }, api = {}
  var lang = 'id'
  try { if (root.localStorage.getItem(KEY) === 'en') lang = 'en' } catch (e) { /* private mode: stay Indonesian */ }

  // exact string, else its number template, else the first matching rule; surrounding white space is kept
  function core(s) {
    if (Object.prototype.hasOwnProperty.call(DICT.map, s)) return DICT.map[s]
    // template: "3 dari 21 selesai" is looked up as "{0} dari {1} selesai" and the numbers are put back
    var nums = [], k = s.replace(/\d+(?:[.,]\d+)*/g, function (m) { nums.push(m); return '{' + (nums.length - 1) + '}' })
    if (nums.length && Object.prototype.hasOwnProperty.call(DICT.map, k)) return DICT.map[k].replace(/\{(\d+)\}/g, function (_, i) { return nums[i] })
    for (var i = 0; i < DICT.rules.length; i++) {
      var r = DICT.rules[i], m = r[0].exec(s); if (!m) continue
      var out = typeof r[1] === 'function' ? r[1].apply(api, [s].concat(m.slice(1))) : s.replace(r[0], r[1])   // fn(whole text, groups...)
      if (out != null) return out   // a rule may decline (null): the next one is tried
    }
    return null
  }
  function t(s) {
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(String(s)); if (!m[2]) return s
    var e = core(m[2].replace(/\s+/g, ' ')); return e == null ? s : m[1] + e + m[3]   // source line breaks are not part of the key
  }

  api.t = t; api.core = core
  if (typeof document === 'undefined') { if (typeof module !== 'undefined' && module.exports) module.exports = api; return }

  var orig = new WeakMap(), shown = new WeakMap(), attrOrig = new WeakMap(), titleId = null, mo = null
  function skip(el) { return !el || el.closest('[data-noi18n], script, style, textarea') }
  function skipEl(el) { return !el || el.closest('[data-noi18n], script, style') }   // a textarea keeps its text, its placeholder is ours
  function textNode(n) {
    if (lang === 'en') {
      if (!orig.has(n) || shown.get(n) !== n.data) orig.set(n, n.data)   // new node, or a renderer rewrote it
      var e = t(orig.get(n)); shown.set(n, e); if (n.data !== e) n.data = e
    } else if (orig.has(n)) {
      if (shown.get(n) === n.data) n.data = orig.get(n)
      orig.delete(n); shown.delete(n)
    }
  }
  function attrs(el) {
    var st = attrOrig.get(el)
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i]; if (!el.hasAttribute(a)) continue
      var v = el.getAttribute(a)
      if (lang === 'en') {
        if (!st) { st = {}; attrOrig.set(el, st) }
        if (!st[a] || st[a].en !== v) st[a] = { id: v }
        st[a].en = t(st[a].id); if (v !== st[a].en) el.setAttribute(a, st[a].en)
      } else if (st && st[a]) { if (st[a].en === v) el.setAttribute(a, st[a].id); delete st[a] }
    }
  }
  function walk(node) {
    if (node.nodeType === 3) { if (!skip(node.parentElement)) textNode(node); return }
    if (node.nodeType !== 1 || skipEl(node)) return
    attrs(node)
    var w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), n
    while ((n = w.nextNode())) {
      if (n.nodeType === 1) { if (!skipEl(n)) attrs(n) } else if (!skip(n.parentElement)) textNode(n)
    }
  }
  function write(fn) { if (mo) mo.disconnect(); try { fn() } finally { if (mo) mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS }) } }
  function all() {
    write(function () {
      walk(document.body)
      if (lang === 'en') { if (titleId == null || document.title !== t(titleId)) titleId = document.title; document.title = t(titleId) }
      else if (titleId != null) { document.title = titleId; titleId = null }
      document.documentElement.lang = lang
      var bs = document.querySelectorAll('.u-lang button')
      for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', String(bs[i].dataset.lang === lang))
    })
  }
  function set(l) {
    l = l === 'en' ? 'en' : 'id'; if (l === lang) return
    lang = l; api.lang = l
    try { root.localStorage.setItem(KEY, l) } catch (e) { /* not saved; the page still switches */ }
    // English text has other lengths: keep what the reader is looking at where it is
    // (a page at its top stays at its top)
    var anc = root.scrollY > 8 ? document.elementFromPoint(root.innerWidth / 2, root.innerHeight / 2) : null, y0 = anc ? anc.getBoundingClientRect().top : 0
    all()
    if (anc && anc.isConnected) { var dy = anc.getBoundingClientRect().top - y0; if (dy) root.scrollBy(0, dy) }
    document.dispatchEvent(new CustomEvent('uae-lang', { detail: { lang: l } }))
  }
  api.t = t; api.core = core; api.set = set; api.lang = lang; api.key = KEY
  root.UAEI18N = api

  function boot() {
    var bar = document.querySelector('.u-top-in')
    if (bar && !bar.querySelector('.u-lang')) {
      var g = document.createElement('div'); g.className = 'u-lang'; g.setAttribute('role', 'group'); g.setAttribute('data-noi18n', '')
      g.setAttribute('aria-label', 'Bahasa / Language')
      g.innerHTML = '<button type="button" data-lang="id" aria-label="Bahasa Indonesia">ID</button><button type="button" data-lang="en" aria-label="English">EN</button>'
      g.addEventListener('click', function (e) { var b = e.target.closest('button[data-lang]'); if (b) set(b.dataset.lang) })
      bar.appendChild(g)
    }
    mo = new MutationObserver(function (list) {
      if (lang !== 'en') return
      write(function () {
        for (var i = 0; i < list.length; i++) {
          var m = list[i]
          if (m.type === 'childList') for (var k = 0; k < m.addedNodes.length; k++) walk(m.addedNodes[k])
          else if (m.type === 'characterData') { if (!skip(m.target.parentElement)) textNode(m.target) }
          else if (m.target.nodeType === 1 && !skipEl(m.target)) attrs(m.target)
        }
      })
    })
    all()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot()
})(typeof window !== 'undefined' ? window : globalThis)
