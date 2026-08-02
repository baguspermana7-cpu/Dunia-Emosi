/* =============================================================================
 * Dunia Emosi — Film Anak offline installer (client side)
 * =============================================================================
 * Per-game, opt-in, HONEST offline install. Tap once and ONE game downloads
 * completely — every file it can ever need, including the level-gated assets
 * that used to leave gotham-getaway's levels 2-5 broken offline — into its own
 * Cache Storage bucket. sw.js then serves that bucket cache-first, and never
 * deletes it on a CACHE_VERSION bump.
 *
 * CACHE NAMING / INVALIDATION
 *   dunia-film-<slug>   one bucket per game. Named by SLUG, never by app
 *                       version → an app deploy cannot invalidate it.
 *                       sw.js activate() preserves every `dunia-film-` key.
 *   dunia-film-shell    the few wrapper files needed to REACH a game offline
 *                       (film-anak.html, film-play.html, film-offline.js,
 *                        sw-reload.js).
 *   Install state lives INSIDE the game's own bucket as a synthetic response at
 *   <gamedir>/__offline-state.json. It is therefore atomic with the cache it
 *   describes: delete the bucket and the state is gone; the bucket survives a
 *   version bump and so does the state. (localStorage would drift out of sync.)
 *
 *   Staleness = manifest.hash !== state.hash. The manifest hash is a content
 *   fingerprint of the whole game folder, produced by
 *   tools/build-film-manifests.mjs (re-run it whenever game files change).
 *
 * Vanilla ES5 syntax (var / function, no arrows, no template literals) to match
 * the rest of the project. Zero build step, zero dependencies. Every capability
 * is feature-detected — on a browser without Cache Storage the module reports
 * "unsupported" and the UI hides itself rather than throwing.
 * ========================================================================== */
(function (global) {
  'use strict'

  var PREFIX = 'dunia-film-'
  var SHELL_CACHE = PREFIX + 'shell'
  var STATE_FILE = '__offline-state.json'
  var CONCURRENCY = 6 // in flight at once — a throttled tablet chokes on more
  var RETRIES = 2 // per file, on transient network failure

  // Wrapper files that must also be present for an installed game to be
  // reachable with no network. Kept deliberately tiny. Requested with the same
  // ?v= strings the pages use; sw.js falls back to these ignoring the query, so
  // a version drift here degrades gracefully instead of breaking.
  var SHELL_FILES = [
    'film-anak.html',
    'film-play.html',
    'film-offline.js',
    'sw-reload.js'
  ]

  var supported = !!(global.caches && global.fetch && global.Promise)
  var activeJobs = 0   // >0 while a download is in flight (see sw-reload.js)

  // Every URL is resolved against THIS SCRIPT's directory (…/games/), never
  // against the page. Resolving against the page is a trap: from
  // /games/film-anak.html the relative 'games/' resolves to /games/games/.
  // Using the script's own src keeps the module correct on Vercel, on a
  // GitHub-Pages subdirectory and on localhost alike.
  var BASE_DIR = (function () {
    try {
      var s = document.currentScript && document.currentScript.src
      if (s) return new URL('.', s).href
    } catch (e) {}
    return new URL('.', location.href).href
  })()

  // ── service-worker readiness ─────────────────────────────────────────────
  // Downloading 200 MB is pointless if nothing SERVES it: only sw.js turns the
  // dunia-film-* buckets into offline playability. film-anak.html historically
  // never registered the SW (only index.html / game.js did), so a child who
  // deep-linked straight to the hub had no controller at all. Register here
  // too, eagerly at page load — never mid-install, because the app's
  // sw-reload.js reloads the page on `controllerchange` and that would
  // interrupt a download in flight.
  var swReadyPromise = (function () {
    if (!('serviceWorker' in navigator)) return Promise.resolve(false)
    return navigator.serviceWorker.getRegistration()
      .then(function (reg) {
        // ../sw.js resolves to the app root, so its default scope covers
        // /games/film/** — exactly what the film buckets need.
        return reg || navigator.serviceWorker.register(new URL('../sw.js', BASE_DIR).href)
      })
      .then(function () {
        if (navigator.serviceWorker.controller) return true
        return new Promise(function (resolve) {
          var t = setTimeout(function () { resolve(!!navigator.serviceWorker.controller) }, 8000)
          navigator.serviceWorker.addEventListener('controllerchange', function () {
            clearTimeout(t); resolve(true)
          })
        })
      })
      .catch(function () { return false })
  })()

  function swReady() { return swReadyPromise }

  // ── small helpers ────────────────────────────────────────────────────────
  function gameBase(slug) {
    return new URL('film/' + slug + '/', BASE_DIR).href
  }
  function gamesBase() {
    return BASE_DIR
  }
  function cacheName(slug) {
    return PREFIX + slug
  }
  function stateUrl(slug) {
    return gameBase(slug) + STATE_FILE
  }
  function thumbUrl(slug) {
    return new URL('../assets/film-thumbs/' + slug + '.webp', BASE_DIR).href
  }

  function fmtBytes(n) {
    if (!n && n !== 0) return '—'
    if (n < 1024) return n + ' B'
    if (n < 1048576) return Math.round(n / 1024) + ' KB'
    if (n < 1073741824) {
      var mb = n / 1048576
      return (mb < 10 ? mb.toFixed(1) : Math.round(mb)) + ' MB'
    }
    return (n / 1073741824).toFixed(1) + ' GB'
  }

  /** Reject after ms — a hung request must not stall the whole install. */
  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error('timeout')) }, ms)
      promise.then(
        function (v) { clearTimeout(t); resolve(v) },
        function (e) { clearTimeout(t); reject(e) }
      )
    })
  }

  // ── manifests ────────────────────────────────────────────────────────────
  var indexPromise = null

  /**
   * The combined slug -> {files,bytes,hash} index. One request for all 17
   * games so the hub can render sizes immediately.
   */
  function index(force) {
    if (!indexPromise || force) {
      indexPromise = fetch(new URL('film/offline-index.json', gamesBase()).href, {
        cache: 'no-cache'
      })
        .then(function (r) { return r.ok ? r.json() : null })
        .then(function (j) { return (j && j.games) || null })
        .catch(function () { return null })
    }
    return indexPromise
  }

  function manifest(slug) {
    return fetch(gameBase(slug) + 'offline-manifest.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('manifest ' + r.status)
        return r.json()
      })
  }

  // ── install state (stored inside the game's own cache) ───────────────────
  function readState(slug) {
    if (!supported) return Promise.resolve(null)
    return caches.has(cacheName(slug)).then(function (has) {
      if (!has) return null
      return caches.open(cacheName(slug)).then(function (c) {
        return c.match(stateUrl(slug)).then(function (res) {
          return res ? res.json().catch(function () { return null }) : null
        })
      })
    }).catch(function () { return null })
  }

  function writeState(slug, state) {
    return caches.open(cacheName(slug)).then(function (c) {
      return c.put(
        new Request(stateUrl(slug)),
        new Response(JSON.stringify(state), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    })
  }

  // ── status ───────────────────────────────────────────────────────────────
  /**
   * status(slug) -> {state, bytes, files, done, hash, installedHash, persisted}
   *   state: 'unsupported' | 'not-installed' | 'partial' | 'installed' | 'stale'
   *
   * 'partial'  an install was interrupted (state record says fewer files cached
   *            than the manifest lists) — resumable.
   * 'stale'    the game's files changed on the server since it was installed.
   *            Reported only when the live manifest is reachable; offline we
   *            honestly report 'installed' rather than guessing.
   */
  function status(slug, meta) {
    if (!supported) return Promise.resolve({ state: 'unsupported' })
    // `meta` = the {files,bytes,hash} row from offline-index.json. Passing it
    // lets the hub resolve all 17 games from ONE network request instead of 17
    // manifest fetches. Without it we fall back to the per-game manifest.
    var head = meta
      ? Promise.resolve(meta)
      : manifest(slug).catch(function () { return null })
    return Promise.all([readState(slug), head])
      .then(function (r) {
        var st = r[0]
        var mf = r[1]
        var out = {
          state: 'not-installed',
          bytes: mf ? mf.bytes : st ? st.bytes : 0,
          files: mf ? mf.files : st ? st.files : 0,
          hash: mf ? mf.hash : null,
          installedHash: st ? st.hash : null,
          done: st ? st.done || 0 : 0,
          persisted: st ? !!st.persisted : false,
          offlineManifest: !mf
        }
        if (!st) return out
        if (!st.complete) { out.state = 'partial'; return out }
        out.state = mf && mf.hash !== st.hash ? 'stale' : 'installed'
        return out
      })
  }

  /** statusAll(slugs) — resolves every game from the single combined index. */
  function statusAll(slugs) {
    return index().then(function (idx) {
      var out = {}
      return Promise.all(
        slugs.map(function (slug) {
          return status(slug, idx ? idx[slug] : null).then(function (s) { out[slug] = s })
        })
      ).then(function () { return out })
    })
  }

  // ── storage estimate / persistence ───────────────────────────────────────
  function estimate() {
    if (!(navigator.storage && navigator.storage.estimate)) {
      return Promise.resolve({ supported: false, usage: 0, quota: 0, free: 0 })
    }
    return navigator.storage.estimate().then(function (e) {
      var usage = e.usage || 0
      var quota = e.quota || 0
      return { supported: true, usage: usage, quota: quota, free: Math.max(0, quota - usage) }
    }).catch(function () {
      return { supported: false, usage: 0, quota: 0, free: 0 }
    })
  }

  /**
   * Ask the OS to keep this origin's storage. Granted → the browser will not
   * evict the installed games under storage pressure. Never throws; the caller
   * reports the honest answer to the child's parent instead of pretending.
   */
  function persist() {
    if (!(navigator.storage && navigator.storage.persist)) return Promise.resolve(false)
    return navigator.storage.persisted()
      .then(function (already) { return already ? true : navigator.storage.persist() })
      .catch(function () { return false })
  }

  // ── install ──────────────────────────────────────────────────────────────
  /**
   * install(slug, onProgress) -> {promise, cancel}
   *
   * Downloads every file in the manifest into dunia-film-<slug> with bounded
   * concurrency, resumable (already-cached files with an unchanged content hash
   * are skipped), and cancellable. onProgress receives:
   *   {phase, done, total, bytes, totalBytes, skipped, failed, file}
   *   phase: 'prepare' | 'download' | 'finalize' | 'done' | 'cancelled' | 'error'
   *
   * Every request carries X-Dunia-Offline: 1. sw.js sees that header and steps
   * ASIDE completely — otherwise the service worker would ALSO copy all 196 MB
   * into dunia-assets-*, doubling the storage the child just paid for.
   */
  function install(slug, onProgress) {
    if (!supported) {
      return { promise: Promise.reject(new Error('unsupported')), cancel: function () {} }
    }
    var cancelled = false
    activeJobs++
    // AbortController so Batal is INSTANT. Without it a cancel had to wait for
    // whatever multi-megabyte file was already in flight to finish downloading
    // (~20 s on a throttled tablet) before the UI could return to rest.
    var ac = (typeof AbortController !== 'undefined') ? new AbortController() : null
    var report = function (o) { if (onProgress) { try { onProgress(o) } catch (e) {} } }

    var promise = (function () {
      var mf, cache, persisted = false
      var done = 0, bytes = 0, skipped = 0
      var failures = []

      report({ phase: 'prepare', done: 0, total: 0, bytes: 0, totalBytes: 0 })

      // Persistent storage FIRST — asking after 196 MB has landed is too late
      // to protect it from an eviction that happens mid-download.
      return swReady()
        .then(function () { return persist() })
        .then(function (p) { persisted = p; return manifest(slug) })
        .then(function (m) {
          mf = m
          return caches.open(cacheName(slug))
        })
        .then(function (c) {
          cache = c
          // Resume/update: what is already in the bucket, and from WHICH version?
          return Promise.all([cache.keys(), readState(slug)])
        })
        .then(function (r) {
          var keys = r[0]
          var prev = r[1]
          var have = {}
          for (var i = 0; i < keys.length; i++) have[keys[i].url] = true
          // Per-file content hashes recorded at the last install. Presence of a
          // URL in the bucket is NOT proof the bytes are current — a file whose
          // content changed keeps its path, so a URL-only check would let
          // "Perbarui" skip it, then stamp the new manifest hash and report
          // "installed" while serving the OLD bytes. Only a matching content
          // hash may be reused.
          var prevHashes = (prev && prev.assetHashes) || null
          var sameVersion = !!(prev && prev.hash === mf.hash)

          var queue = []
          var stale = []
          for (var k = 0; k < mf.assets.length; k++) {
            var a = mf.assets[k]
            // new URL() resolves EXACTLY the way the browser resolves the
            // game's own relative references (spaces -> %20 etc.), so the cache
            // key we store is the key the game will later look up. Six film
            // fonts have spaces in their names — hand-rolled encoding got them
            // wrong, this does not.
            var url = new URL(a.p, gameBase(slug)).href
            var current = have[url] && (sameVersion || (prevHashes && prevHashes[a.p] === a.h))
            if (current) { skipped++; done++; bytes += a.s; continue }
            // Drop the outdated bytes NOW. If this download later fails, the
            // entry must be ABSENT rather than silently stale — absence is what
            // makes the next resume re-fetch it.
            if (have[url]) stale.push(url)
            queue.push({ url: url, size: a.s, p: a.p })
          }
          // Wrapper shell — a handful of KB, cached into the shared shell
          // bucket so the child can still REACH the game with no network.
          var shellJobs = SHELL_FILES.map(function (f) {
            return { url: new URL(f, gamesBase()).href, size: 0, p: f, shell: true }
          })
          shellJobs.push({ url: thumbUrl(slug), size: 0, p: 'thumb', thumb: true })

          var total = mf.assets.length
          report({
            phase: 'download', done: done, total: total, bytes: bytes,
            totalBytes: mf.bytes, skipped: skipped, failed: 0
          })

          function fetchOne(job, attempt) {
            if (cancelled) return Promise.resolve()
            return withTimeout(
              fetch(job.url, {
                cache: 'reload',
                credentials: 'same-origin',
                headers: { 'X-Dunia-Offline': '1' },
                signal: ac ? ac.signal : undefined
              }),
              60000
            )
              .then(function (res) {
                if (!res || !res.ok) throw new Error('HTTP ' + (res ? res.status : '?'))
                var target = job.shell || job.thumb
                  ? caches.open(job.shell ? SHELL_CACHE : cacheName(slug))
                  : Promise.resolve(cache)
                return target.then(function (c) { return c.put(new Request(job.url), res) })
              })
              .then(function () {
                if (job.shell || job.thumb) return
                done++
                bytes += job.size
                report({
                  phase: 'download', done: done, total: total, bytes: bytes,
                  totalBytes: mf.bytes, skipped: skipped, failed: failures.length,
                  file: job.p
                })
              })
              .catch(function (err) {
                if (cancelled) return
                if (attempt < RETRIES) return fetchOne(job, attempt + 1)
                // Shell/thumb misses are cosmetic; a game asset miss is not.
                if (job.shell || job.thumb) return
                failures.push({ p: job.p, error: String(err && err.message || err) })
                done++
                report({
                  phase: 'download', done: done, total: total, bytes: bytes,
                  totalBytes: mf.bytes, skipped: skipped, failed: failures.length,
                  file: job.p
                })
              })
          }

          var all = shellJobs.concat(queue)
          var idx = 0
          // (stale entries are purged before the first byte is written)
          var purge = stale.length
            ? Promise.all(stale.map(function (u) { return cache.delete(u) })).catch(function () {})
            : Promise.resolve()
          function lane() {
            if (cancelled || idx >= all.length) return Promise.resolve()
            var job = all[idx++]
            return fetchOne(job, 0).then(lane)
          }
          return purge.then(function () {
            var lanes = []
            for (var n = 0; n < Math.min(CONCURRENCY, all.length); n++) lanes.push(lane())
            return Promise.all(lanes)
          }).then(function () { return total })
        })
        .then(function (total) {
          if (cancelled) {
            // Leave what was downloaded in place — a cancelled install is a
            // PAUSED install; the next tap resumes instead of restarting.
          var assetHashes = {}
          for (var hi = 0; hi < mf.assets.length; hi++) assetHashes[mf.assets[hi].p] = mf.assets[hi].h
            return writeState(slug, {
              hash: mf.hash, files: mf.files, bytes: mf.bytes,
              done: done - failures.length, complete: false,
              assetHashes: assetHashes,
              persisted: persisted, at: Date.now()
            }).then(function () {
              report({ phase: 'cancelled', done: done, total: total, bytes: bytes, totalBytes: mf.bytes })
              return { cancelled: true, done: done, total: total, failed: failures.length }
            })
          }
          report({ phase: 'finalize', done: done, total: total, bytes: bytes, totalBytes: mf.bytes })
          var complete = failures.length === 0
          var assetHashes2 = {}
          for (var hj = 0; hj < mf.assets.length; hj++) assetHashes2[mf.assets[hj].p] = mf.assets[hj].h
          return writeState(slug, {
            hash: mf.hash, files: mf.files, bytes: mf.bytes,
            done: done - failures.length, complete: complete,
            assetHashes: assetHashes2,
            persisted: persisted, at: Date.now()
          }).then(function () {
            report({
              phase: complete ? 'done' : 'error', done: done, total: total,
              bytes: bytes, totalBytes: mf.bytes, failed: failures.length
            })
            if (!complete) {
              var e = new Error(failures.length + ' berkas gagal diunduh')
              e.failures = failures
              throw e
            }
            return {
              cancelled: false, done: done, total: total,
              bytes: mf.bytes, persisted: persisted, failed: 0
            }
          })
        })
        .catch(function (err) {
          if (cancelled) return { cancelled: true }
          report({ phase: 'error', error: String(err && err.message || err) })
          throw err
        })
    })()

    promise = promise.then(
      function (v) { activeJobs--; return v },
      function (e) { activeJobs--; throw e }
    )

    return {
      promise: promise,
      cancel: function () {
        cancelled = true
        if (ac) { try { ac.abort() } catch (e) {} }
      }
    }
  }

  // ── remove ───────────────────────────────────────────────────────────────
  /** Deletes the game's bucket entirely — state record included. */
  function remove(slug) {
    if (!supported) return Promise.resolve(false)
    return caches.delete(cacheName(slug))
  }

  /** Every installed slug, read straight from Cache Storage (source of truth). */
  function installed() {
    if (!supported) return Promise.resolve([])
    return caches.keys().then(function (keys) {
      var out = []
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].indexOf(PREFIX) === 0 && keys[i] !== SHELL_CACHE) {
          out.push(keys[i].slice(PREFIX.length))
        }
      }
      return out
    }).catch(function () { return [] })
  }

  global.FilmOffline = {
    supported: supported,
    PREFIX: PREFIX,
    index: index,
    manifest: manifest,
    status: status,
    statusAll: statusAll,
    install: install,
    remove: remove,
    installed: installed,
    estimate: estimate,
    persist: persist,
    swReady: swReady,
    /** True while any install is downloading — sw-reload.js defers on this. */
    busy: function () { return activeJobs > 0 },
    fmtBytes: fmtBytes
  }
})(window)
