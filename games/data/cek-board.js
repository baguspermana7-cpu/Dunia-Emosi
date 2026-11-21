/* CekBoard — PRD-53 "Papan Juara Otak". Two lists:
 *   device()   every child saved on this device (dunia-players), with their best Perkiraan IQ from their own
 *              avatar-scoped 'cek-kemampuan' record; children who have not reached 3 islands are listed below
 *   online()   the shared board (CekCloud, Supabase RPC leaderboard game 'cek', metric 'iq'), top 50; resolves to
 *              null when the cloud is off, offline, or fails, and never throws
 *   rank(rows) sorts by iq (desc), then islands (desc), then earliest date; ties share a place
 *   cleanName(s) first name only: letters and spaces, max 12 characters (what goes online)
 * Avatar art comes from UISprites pack 'emo' (the animal the child picked), never an emoji.
 */
;(function (W) {
  'use strict'
  var EMO = { lion: 'singa', rabbit: 'kelinci', elephant: 'gajah', fox: 'rubah', frog: 'katak', tiger: 'harimau', panda: 'panda', koala: 'koala' }
  var SLUG = { '\u{1F981}': 'lion', '\u{1F430}': 'rabbit', '\u{1F418}': 'elephant', '\u{1F98A}': 'fox', '\u{1F438}': 'frog', '\u{1F42F}': 'tiger', '\u{1F43C}': 'panda', '\u{1F428}': 'koala' }
  function cleanName (s) { var t = String(s || '').replace(/[^A-Za-zÀ-ɏ ]+/g, ' ').trim().split(/\s+/)[0] || ''; return t.slice(0, 12) }
  // names that never go on the shared board (Indonesian + English rude words; exact or as the start of the name)
  var BLOCK = ['anjing', 'anjir', 'bangsat', 'bajingan', 'babi', 'goblok', 'tolol', 'bego', 'kontol', 'memek', 'ngentot', 'jancuk', 'jancok', 'asu', 'kampret', 'tai', 'brengsek', 'idiot', 'fuck', 'shit', 'bitch', 'dick', 'sex', 'porn']
  function publicName (s) { var n = cleanName(s), l = n.toLowerCase(); return !n || BLOCK.some(function (w) { return l === w || l.indexOf(w) === 0 }) ? 'Pemain' : n }
  function rank (rows) {
    var r = rows.slice().sort(function (a, b) {
      var ai = a.iq == null ? -1 : a.iq, bi = b.iq == null ? -1 : b.iq
      return bi - ai || (b.islands || 0) - (a.islands || 0) || (a.at || 0) - (b.at || 0)
    })
    var place = 0, prev = null
    r.forEach(function (x, i) { var k = (x.iq == null ? 'n' : x.iq) + '|' + (x.islands || 0); if (k !== prev) place = i + 1; prev = k; x.place = x.iq == null ? null : place })
    return r
  }
  function slugOf (animal) { return SLUG[animal] || (EMO[animal] ? animal : '') }
  function device (bestOf) {
    var players = []
    try { players = JSON.parse(localStorage.getItem('dunia-players') || '[]') || [] } catch (_) {}
    var act = 0; try { act = (JSON.parse(localStorage.getItem('dunia-active-slot') || '[0,1]') || [0])[0] | 0 } catch (_) {}
    var rows = []
    players.forEach(function (p, i) {
      if (!p || !p.name) return
      var slug = slugOf(p.animal), rec = null
      try { rec = JSON.parse(localStorage.getItem(slug ? 'dunia-avatar-' + slug + '-cek-kemampuan' : 'cek-kemampuan') || 'null') } catch (_) {}
      var b = rec ? bestOf(rec) : null
      rows.push({ name: cleanName(p.name) || 'Pemain', avatar: slug, iq: b ? b.iq : null, islands: b ? b.islands : 0, at: b ? b.at : 0, me: i === act })
    })
    if (!rows.length) {   // no player on this device: the name typed on this page, with the unscoped record
      var n = ''; try { n = localStorage.getItem('cek-nama') || '' } catch (_) {}
      var r0 = null; try { r0 = JSON.parse(localStorage.getItem('cek-kemampuan') || 'null') } catch (_) {}
      var b0 = r0 ? bestOf(r0) : null
      if (n) rows.push({ name: cleanName(n), avatar: '', iq: b0 ? b0.iq : null, islands: b0 ? b0.islands : 0, at: b0 ? b0.at : 0, me: true })
    }
    return rank(rows)
  }
  function online (limit) {
    var C = W.CekCloud
    if (!C) return Promise.resolve(null)
    return Promise.race([
      Promise.resolve().then(function () { return C.board(limit || 50) }).then(function (rows) {
        return Array.isArray(rows) ? rank(rows.map(decode)) : null
      }).catch(function () { return null }),
      new Promise(function (res) { setTimeout(function () { res(null) }, 6000) })
    ])
  }
  // the shared board keeps ONE high score per child (submit_score keeps the greatest value), so the islands ride in the
  // value: IQ x 10 + islands ranks by IQ, then islands, and can never disagree with the name. Name = "Ana|lion".
  function encode (iq, islands) { return (iq | 0) * 10 + Math.max(0, Math.min(6, islands | 0)) }
  function boardName (name, avatar) { return publicName(name) + '|' + (EMO[avatar] ? avatar : '') }
  function decode (x) {
    var m = /^(.*?)\|(\w*)$/.exec(x.name || ''), v = x.value | 0
    return { name: cleanName(m ? m[1] : x.name) || 'Pemain', avatar: m && EMO[m[2]] ? m[2] : '', iq: Math.floor(v / 10), islands: v % 10, at: Date.parse(x.updated_at) || 0 }
  }
  function submit (name, avatar, iq, islands) {
    var C = W.CekCloud
    if (!C || iq == null) return Promise.resolve(false)
    return C.submit(encode(iq, islands), boardName(name, avatar)).catch(function () { return false })
  }
  W.CekBoard = { publicName: publicName, encode: encode, decode: decode, rank: rank, device: device, online: online, submit: submit, cleanName: cleanName, boardName: boardName, EMO: EMO, slugOf: slugOf }
})(typeof window !== 'undefined' ? window : globalThis)
