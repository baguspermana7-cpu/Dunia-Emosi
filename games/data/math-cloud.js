/* =============================================================================
 * math-cloud.js — window.MathCloud (v1.0.0)
 * =============================================================================
 * Optional Supabase sync for the Math game (kuis-matematika). INERT by default:
 * if no config is present it is a complete no-op and the game stays 100% local.
 *
 * ACTIVATION (owner, one-time — see plb.html "Panduan Supabase"):
 *   1. run the SQL (creates table public.math_players + RLS + leaderboard view)
 *   2. enable an auth provider (Anonymous, or Email)
 *   3. drop ONE line BEFORE this script loads, e.g. in kuis-matematika.html:
 *        <script>window.MATH_SUPABASE={url:'https://xxx.supabase.co',anonKey:'eyJ...'}</script>
 *   That's it — cloud sync turns on. anon key is public/safe; NEVER use service_role.
 *
 * What syncs: a lossless snapshot of every localStorage key matching /^(mp_|dunia)/
 * — the math economy (mp_econ), best score (mp_best), the 7 avatar slots
 * (dunia-players / dunia-active-slot), per-avatar level progress, and unlocks
 * INCLUDING the kodok slot-7 unlock (dunia-kodok-slot7-v4) + gym options. One
 * account row (slot 1) holds the whole device save.
 *
 * API (all safe to call even when disabled):
 *   MathCloud.isEnabled()          -> bool (config present)
 *   MathCloud.init()               -> Promise<bool ready>  (lazy-loads sdk + auth)
 *   MathCloud.pull()               -> Promise<bool changed> (cloud -> localStorage)
 *   MathCloud.push()               -> Promise<bool ok>      (localStorage -> cloud)
 *   MathCloud.schedulePush()       -> debounced push (call from saveEcon)
 *   MathCloud.leaderboard(limit)   -> Promise<[{name,trophies}]>
 * ==========================================================================*/
;(function (global) {
  'use strict'
  if (global.MathCloud) return

  var CFG = global.MATH_SUPABASE || null
  var SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
  var KEY_RE = /^(mp_|dunia)/           // math + shared avatar/unlock keys
  var SLOT = 1                          // account's math save lives in slot 1
  var sb = null, ready = false, booting = null, pushTimer = null

  function enabled () { return !!(CFG && CFG.url && CFG.anonKey) }

  function loadSdk () {
    if (global.supabase && global.supabase.createClient) return Promise.resolve()
    return new Promise(function (res, rej) {
      var s = document.createElement('script')
      s.src = SDK_URL; s.async = true
      s.onload = function () { res() }
      s.onerror = function () { rej(new Error('sdk load failed')) }
      document.head.appendChild(s)
    })
  }

  function init () {
    if (!enabled()) return Promise.resolve(false)
    if (ready) return Promise.resolve(true)
    if (booting) return booting
    booting = loadSdk().then(function () {
      sb = global.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true } })
      return sb.auth.getSession().then(function (r) {
        if (r && r.data && r.data.session) return r.data.session
        // no session yet -> anonymous sign-in (requires Anonymous provider ON)
        return sb.auth.signInAnonymously().then(function (a) {
          if (a && a.error) throw a.error
          return a && a.data && a.data.session
        })
      })
    }).then(function () {
      ready = true; return true
    }).catch(function (e) {
      try { if (global.console) console.warn('[MathCloud] disabled:', e && e.message) } catch (_) {}
      ready = false; return false
    })
    return booting
  }

  function uid () {
    try { return sb && sb.auth && sb.auth.getUser ? null : null } catch (_) { return null }
  }

  function snapshot () {
    var kv = {}
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i)
        if (k && KEY_RE.test(k)) kv[k] = localStorage.getItem(k)
      }
    } catch (_) {}
    return kv
  }

  function restore (kv) {
    if (!kv) return false
    var changed = false
    try {
      for (var k in kv) {
        if (!kv.hasOwnProperty(k) || !KEY_RE.test(k)) continue
        if (localStorage.getItem(k) !== kv[k]) { localStorage.setItem(k, kv[k]); changed = true }
      }
    } catch (_) {}
    return changed
  }

  function currentName () {
    try { var e = JSON.parse(localStorage.getItem('mp_econ') || '{}'); return (e && e.name) || 'Pemain' } catch (_) { return 'Pemain' }
  }

  function push () {
    return init().then(function (ok) {
      if (!ok) return false
      return sb.auth.getUser().then(function (u) {
        var owner = u && u.data && u.data.user && u.data.user.id
        if (!owner) return false
        return sb.from('math_players').upsert({
          owner: owner, slot: SLOT, name: currentName(), data: { kv: snapshot() }
        }, { onConflict: 'owner,slot' }).then(function (r) { return !(r && r.error) })
      })
    }).catch(function () { return false })
  }

  function pull () {
    return init().then(function (ok) {
      if (!ok) return false
      return sb.auth.getUser().then(function (u) {
        var owner = u && u.data && u.data.user && u.data.user.id
        if (!owner) return false
        return sb.from('math_players').select('data').eq('owner', owner).eq('slot', SLOT).maybeSingle()
          .then(function (r) {
            if (!r || r.error || !r.data || !r.data.data) return false
            return restore(r.data.data.kv)
          })
      })
    }).catch(function () { return false })
  }

  function schedulePush () {
    if (!enabled()) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(function () { pushTimer = null; push() }, 4000)
  }

  function leaderboard (limit) {
    return init().then(function (ok) {
      if (!ok) return []
      return sb.from('math_leaderboard').select('name,trophies').limit(limit || 20)
        .then(function (r) { return (r && r.data) || [] })
    }).catch(function () { return [] })
  }

  global.MathCloud = {
    version: '1.0.0',
    isEnabled: enabled,
    init: init,
    pull: pull,
    push: push,
    schedulePush: schedulePush,
    leaderboard: leaderboard
  }
})(typeof window !== 'undefined' ? window : this)
