/* =============================================================================
 * math-cloud.js — window.DuniaCloud (v2.0.0)  [MathCloud alias kept]
 * =============================================================================
 * Robust, scalable Supabase cloud/account for Dunia Emosi. INERT by default:
 * with no config OR the toggle off it is a complete no-op — every game stays
 * 100% local. See supabase/dunia-cloud-v2.sql + plb.html "Setup Cloud v2".
 *
 * CONCEPT — portable ACCOUNT-CODE (no email/PII). The client uses Supabase
 * anonymous auth ONLY so the anon key may call RPCs; the real identity is a
 * short account_code (e.g. DUNIA-4F7K-9QAX). ALL access goes through SECURITY
 * DEFINER RPCs (server-validated + clamped = anti-cheat); tables deny direct
 * access. Cross-device = enter the same code on another device. anon key is
 * public/safe; the service_role/secret key is NEVER used here.
 *
 * ACTIVATION (owner, one-time):
 *   1. run supabase/dunia-cloud-v2.sql in Supabase → SQL Editor
 *   2. keep the Anonymous auth provider ON
 *   3. config is baked in kuis-matematika.html; flip the toggle (plb.html button
 *      → localStorage 'mp_cloud_on'='1'). Then an account is auto-created on first
 *      sync and its code shown in the game's profile panel.
 *
 * API (all safe to call even when disabled):
 *   DuniaCloud.isEnabled()                 -> bool
 *   DuniaCloud.init()                      -> Promise<bool ready>
 *   DuniaCloud.getCode()                   -> string | null   (account code)
 *   DuniaCloud.createAccount(name?)        -> Promise<string|null>
 *   DuniaCloud.restoreAccount(code)        -> Promise<{ok,name}|null>  (+ pulls)
 *   DuniaCloud.push([game[,slot]])         -> Promise<bool>   (local -> cloud)
 *   DuniaCloud.pull([game[,slot]])         -> Promise<bool>   (cloud -> local; explicit)
 *   DuniaCloud.schedulePush()              -> debounced push  (call from saveEcon)
 *   DuniaCloud.submitScore(metric,value[,name]) -> Promise<bool>
 *   DuniaCloud.leaderboard(metric,limit)   -> Promise<[{name,value,updated_at}]>
 * ==========================================================================*/
;(function (global) {
  'use strict'
  if (global.DuniaCloud) return

  var CFG = global.MATH_SUPABASE || null
  var SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
  var KEY_RE = /^(mp_|dunia)(?!_account_code)/  // sync math + shared keys; NOT the account code
  var GAME = 'dunia'                            // single device-save bucket (schema supports more)
  var SLOT = 1
  var SCHEMA_VERSION = 2
  var CODE_KEY = 'dunia_account_code'
  var sb = null, ready = false, booting = null, pushTimer = null

  // INERT until the owner flips localStorage 'mp_cloud_on'='1' (plb.html button).
  function toggledOn () { try { return localStorage.getItem('mp_cloud_on') === '1' } catch (_) { return false } }
  function enabled () { return !!(CFG && CFG.url && CFG.anonKey) && toggledOn() }

  function getCode () { try { return localStorage.getItem(CODE_KEY) || null } catch (_) { return null } }
  function setCode (c) { try { if (c) localStorage.setItem(CODE_KEY, c) } catch (_) {} }

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
        return sb.auth.signInAnonymously().then(function (a) {
          if (a && a.error) throw a.error
          return a && a.data && a.data.session
        })
      })
    }).then(function () { ready = true; return true })
      .catch(function (e) {
        try { if (global.console) console.warn('[DuniaCloud] disabled:', e && e.message) } catch (_) {}
        ready = false; return false
      })
    return booting
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

  // ensure an account code exists (create one on first sync when allowed)
  function ensureCode (canCreate) {
    var c = getCode()
    if (c) return Promise.resolve(c)
    if (!canCreate) return Promise.resolve(null)
    return sb.rpc('create_account', { p_name: currentName() }).then(function (r) {
      if (r && r.error) return null
      var code = r && r.data
      if (code) setCode(code)
      return code || null
    }).catch(function () { return null })
  }

  function createAccount (name) {
    return init().then(function (ok) {
      if (!ok) return null
      return sb.rpc('create_account', { p_name: name || currentName() }).then(function (r) {
        if (r && r.error) return null
        var code = r && r.data; if (code) setCode(code); return code || null
      })
    }).catch(function () { return null })
  }

  function restoreAccount (code) {
    code = (code || '').toUpperCase().trim()
    if (!code) return Promise.resolve(null)
    return init().then(function (ok) {
      if (!ok) return null
      return sb.rpc('claim_account', { p_code: code }).then(function (r) {
        var row = r && r.data && r.data[0]
        if (!row || !row.exists) return { ok: false, name: null }
        setCode(code)
        return pull().then(function () { return { ok: true, name: row.display_name || null } })
      })
    }).catch(function () { return null })
  }

  function push (game, slot) {
    return init().then(function (ok) {
      if (!ok) return false
      return ensureCode(true).then(function (code) {
        if (!code) return false
        return sb.rpc('cloud_push', {
          p_code: code, p_game: game || GAME, p_slot: slot || SLOT,
          p_version: SCHEMA_VERSION, p_data: { kv: snapshot(), _ts: Date.now() }
        }).then(function (r) { return !(r && r.error) })
      })
    }).catch(function () { return false })
  }

  function pull (game, slot) {
    return init().then(function (ok) {
      if (!ok) return false
      var code = getCode(); if (!code) return false
      return sb.rpc('cloud_pull', { p_code: code, p_game: game || GAME, p_slot: slot || SLOT })
        .then(function (r) {
          if (!r || r.error || !r.data) return false
          return restore(r.data.kv)
        })
    }).catch(function () { return false })
  }

  function schedulePush () {
    if (!enabled()) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(function () { pushTimer = null; push() }, 4000)
  }

  function submitScore (metric, value, name) {
    return init().then(function (ok) {
      if (!ok) return false
      return ensureCode(true).then(function (code) {
        if (!code) return false
        return sb.rpc('submit_score', {
          p_code: code, p_game: 'math', p_metric: metric || 'trophies',
          p_value: value | 0, p_name: name || currentName()
        }).then(function (r) { return !(r && r.error) })
      })
    }).catch(function () { return false })
  }

  function leaderboard (metric, limit) {
    // tolerate old signature leaderboard(limit)
    if (typeof metric === 'number') { limit = metric; metric = 'trophies' }
    return init().then(function (ok) {
      if (!ok) return []
      return sb.rpc('leaderboard', { p_game: 'math', p_metric: metric || 'trophies', p_limit: limit || 50 })
        .then(function (r) { return (r && r.data) || [] })
    }).catch(function () { return [] })
  }

  var API = {
    version: '2.0.0',
    isEnabled: enabled,
    init: init,
    getCode: getCode,
    createAccount: createAccount,
    restoreAccount: restoreAccount,
    pull: pull,
    push: push,
    schedulePush: schedulePush,
    submitScore: submitScore,
    leaderboard: leaderboard
  }
  global.DuniaCloud = API
  global.MathCloud = API   // back-compat alias (existing kuis-matematika.html calls)
})(typeof window !== 'undefined' ? window : this)
