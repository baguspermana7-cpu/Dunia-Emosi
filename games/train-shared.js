/* =============================================================================
 * Train Shared — v54.24 cross-cutting infrastructure for all 4 train games.
 *
 * Modules included (one file to ease cross-game adoption):
 *   - G1 Train Passport (sticker album per game per train)
 *   - G2 Universal Codex (Wikipedia-for-kids; tap any train → 2-page entry)
 *   - G3 Universal Settings + Parental Controls (drawer)
 *   - G4 Universal Pause Menu (big buttons, ≥64px)
 *   - G5 Pak Stasiun mascot (single station-master, NOT a train)
 *   - G6 Train Stats Card (pre-level loading)
 *   - G7 Distance/visit counter per train per game
 *   - G8 Whistle greeting when switching games (signature horn)
 *   - G9 Weather + TIME_OF_DAY sync (session storage handoff)
 *   - G10 Character train idle anim polish (centralized config)
 *   - G11 Shared horn / SFX library (playHorn/Chuff/Whistle per train)
 *   - G12 Character voice-line library (EN/ID)
 *   - G13 Bilingual word-of-the-day banner
 *   - G14 Soft session timer with wind-down
 *
 * Loads as a plain <script src="train-shared.js"> — no module bundler.
 * Exposes window.TrainShared = { passport, codex, settings, ... }.
 * ===========================================================================*/

(function() {
  'use strict'

  // ── Storage helpers (all keys namespaced "dunia-ts-*") ──────────────────────
  const KEY = {
    passport:   'dunia-ts-passport',      // {gameKey:{trainKey:{visits, distance, lastSeen}}}
    settings:   'dunia-ts-settings',      // {sfx, music, motion, lang, sessionLimit}
    lastTrain:  'dunia-ts-last-train',    // {gameKey: trainKey}
    lastGame:   'dunia-ts-last-game',     // 'g14' | 'g15' | ...
    timePhase:  'dunia-ts-time-phase',    // {phase, lerp, at}
    wod:        'dunia-ts-wod',           // {date, en, id, audio}
    sessionStart: 'dunia-ts-session-start', // ms
  }
  function rd(k, fb) { try { return JSON.parse(localStorage.getItem(k)) ?? fb } catch(_){ return fb } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch(_){} }

  // ── Default settings ────────────────────────────────────────────────────────
  const defaultSettings = {
    sfx: 1.0, music: 0.7, voice: 0.85,
    motion: 'full',         // 'full' | 'reduced'
    colorblind: 'none',     // 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
    lang: 'id',             // 'en' | 'id'
    sessionLimit: 0,        // minutes, 0 = unlimited
    haptics: true,
    parentalLock: false,
  }
  function getSettings() { return Object.assign({}, defaultSettings, rd(KEY.settings, {})) }
  function saveSettings(patch) { wr(KEY.settings, Object.assign(getSettings(), patch || {})) }

  // ── G1 PASSPORT ─────────────────────────────────────────────────────────────
  const Passport = {
    stamp(gameKey, trainKey, distance) {
      const all = rd(KEY.passport, {})
      const g = (all[gameKey] = all[gameKey] || {})
      const t = (g[trainKey] = g[trainKey] || { visits: 0, distance: 0, lastSeen: 0 })
      t.visits += 1
      t.distance += (distance || 0)
      t.lastSeen = Date.now()
      wr(KEY.passport, all)
    },
    get() { return rd(KEY.passport, {}) },
    totalStamps() {
      const all = this.get(); let n = 0
      for (const g of Object.keys(all)) n += Object.keys(all[g] || {}).length
      return n
    },
    forTrain(trainKey) {
      const all = this.get(); const out = {}
      for (const g of Object.keys(all)) if (all[g][trainKey]) out[g] = all[g][trainKey]
      return out
    },
  }

  // ── G2 CODEX (mini Wikipedia-for-kids) ──────────────────────────────────────
  // Caller passes a train DB; we just provide a render+open API.
  const Codex = {
    open(train, opts) {
      opts = opts || {}
      let ov = document.getElementById('ts-codex')
      if (!ov) {
        ov = document.createElement('div')
        ov.id = 'ts-codex'
        ov.style.cssText = 'position:fixed;inset:0;z-index:9050;background:linear-gradient(180deg,#0c0a22,#1a1028);color:#fff;display:flex;flex-direction:column;padding:18px;font-family:Inter,system-ui,sans-serif'
        document.body.appendChild(ov)
      }
      const flag = train.flag || train.country || '🚂'
      const facts = (train.facts || (train.fact ? [train.fact] : ['Lokomotif istimewa!'])).slice(0, 3)
      const games = (train.games || ['G14','G15','G16','G18']).join(' · ')
      const visits = Passport.forTrain(train.key || train.id || '')
      const visitTotal = Object.values(visits).reduce((s, v) => s + (v.visits || 0), 0)
      ov.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <span style="font-family:Fredoka One,cursive;font-size:18px;color:#fde68a">📖 Codex Kereta</span>
          <button onclick="document.getElementById('ts-codex').remove()" style="padding:8px 14px;border-radius:10px;border:0;background:#fbbf24;color:#451a03;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer">Tutup ✕</button>
        </div>
        <div style="flex:1;overflow-y:auto">
          <div style="text-align:center;margin-bottom:14px"><div style="font-size:48px">${flag}</div><h2 style="font-family:Fredoka One,cursive;margin:6px 0 4px;color:#fde68a">${train.name || 'Kereta'}</h2><div style="opacity:0.7;font-size:12px">${train.country || ''} ${train.year ? '· ' + train.year : ''}</div></div>
          <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:12px;margin-bottom:10px">
            <div style="font-size:11px;color:#fbbf24;letter-spacing:1px;margin-bottom:6px">⚡ KECEPATAN MAX</div>
            <div style="font-size:18px;font-family:Fredoka One,cursive">${train.speed || '?'} km/j</div>
          </div>
          <ul style="background:rgba(255,255,255,0.05);border-radius:12px;padding:14px 14px 14px 30px;margin-bottom:10px;line-height:1.6;font-size:13px">${facts.map(f => '<li>' + f + '</li>').join('')}</ul>
          <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:12px;margin-bottom:10px;font-size:12px"><b style="color:#fde68a">🎮 Bermain di:</b> ${games}</div>
          <div style="background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.35);border-radius:12px;padding:12px;font-size:12px"><b style="color:#22d3ee">🛂 Stempel paspormu:</b> ${visitTotal}× kunjungan</div>
          <div style="margin-top:14px;display:flex;justify-content:center;gap:10px"><button onclick="TrainShared.audio.playHorn('${(train.key || '').replace(/'/g,"\\'")}')" style="padding:10px 18px;border-radius:12px;border:0;background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer">🔔 Dengar Klakson</button></div>
        </div>`
    },
  }

  // ── G3 + G4 SETTINGS + PAUSE DRAWER ─────────────────────────────────────────
  const UI = {
    showSettings(opts) {
      opts = opts || {}
      let ov = document.getElementById('ts-settings'); if (!ov) {
        ov = document.createElement('div')
        ov.id = 'ts-settings'
        ov.style.cssText = 'position:fixed;inset:0;z-index:9070;background:rgba(15,23,42,0.92);backdrop-filter:blur(6px);color:#fff;display:flex;flex-direction:column;padding:18px;font-family:Inter,system-ui,sans-serif'
        document.body.appendChild(ov)
      }
      const s = getSettings()
      ov.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <span style="font-family:Fredoka One,cursive;font-size:18px;color:#fde68a">⚙️ Pengaturan</span>
          <button onclick="document.getElementById('ts-settings').remove()" style="padding:8px 14px;border-radius:10px;border:0;background:#fbbf24;color:#451a03;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer">Tutup ✕</button>
        </div>
        <div style="flex:1;overflow-y:auto;max-width:520px;margin:0 auto;width:100%">
          ${this._slider('🔊 SFX', 'sfx', s.sfx)}
          ${this._slider('🎵 Musik', 'music', s.music)}
          ${this._slider('🗣️ Suara', 'voice', s.voice)}
          ${this._radio('🎬 Animasi', 'motion', s.motion, [['full','Penuh'],['reduced','Tenang']])}
          ${this._radio('🌐 Bahasa', 'lang', s.lang, [['id','Indonesia'],['en','English']])}
          ${this._toggle('📳 Haptik', 'haptics', s.haptics)}
          ${this._slider('⏰ Batas Sesi (menit)', 'sessionLimit', s.sessionLimit, 60)}
          <div style="background:rgba(0,0,0,0.4);border-radius:12px;padding:14px;margin-top:10px;font-size:12px;line-height:1.5"><b style="color:#fbbf24">🛡️ Kontrol Orang Tua:</b> Setel batas waktu untuk mengaktifkan timer + wind-down otomatis.</div>
        </div>`
      ov.querySelectorAll('[data-ts-key]').forEach(el => {
        el.oninput = el.onchange = (e) => {
          const key = e.target.dataset.tsKey
          let v = e.target.type === 'checkbox' ? !!e.target.checked
                : e.target.type === 'range' ? parseFloat(e.target.value)
                : e.target.value
          saveSettings({ [key]: v })
        }
      })
    },
    _slider(label, key, value, max=1) { return `<label style="display:block;margin-bottom:12px"><div style="font-size:12px;color:#fde68a;margin-bottom:4px">${label}</div><input type="range" min="0" max="${max}" step="${max < 2 ? 0.05 : 1}" value="${value}" data-ts-key="${key}" style="width:100%"></label>` },
    _radio(label, key, value, opts) { return `<div style="margin-bottom:12px"><div style="font-size:12px;color:#fde68a;margin-bottom:4px">${label}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${opts.map(([v,t]) => `<label style="flex:1;min-width:80px;background:${v===value?'#fbbf24':'rgba(255,255,255,0.06)'};color:${v===value?'#451a03':'#fff'};border-radius:10px;padding:8px;text-align:center;cursor:pointer;font-size:12px"><input type="radio" name="ts-${key}" value="${v}" data-ts-key="${key}" ${v===value?'checked':''} style="display:none">${t}</label>`).join('')}</div></div>` },
    _toggle(label, key, value) { return `<label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:10px;background:rgba(255,255,255,0.04);border-radius:10px"><span style="font-size:13px;color:#fff">${label}</span><input type="checkbox" data-ts-key="${key}" ${value?'checked':''}></label>` },

    showPause(opts) {
      opts = opts || {}
      let ov = document.getElementById('ts-pause'); if (!ov) {
        ov = document.createElement('div')
        ov.id = 'ts-pause'
        ov.style.cssText = 'position:fixed;inset:0;z-index:9075;background:rgba(15,23,42,0.92);backdrop-filter:blur(8px);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;font-family:Fredoka One,cursive'
        document.body.appendChild(ov)
      }
      const btn = (icon, label, onclick) => `<button onclick="${onclick}" style="width:min(280px,80vw);min-height:64px;padding:18px;border-radius:18px;border:0;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#451a03;font-family:Fredoka One,cursive;font-size:18px;font-weight:900;cursor:pointer;box-shadow:0 6px 0 #92400e;display:flex;align-items:center;justify-content:center;gap:10px">${icon} ${label}</button>`
      ov.innerHTML = `
        <h2 style="font-size:30px;color:#fde68a;text-shadow:0 0 18px rgba(251,191,36,0.6);margin:0 0 14px">⏸ ISTIRAHAT</h2>
        ${btn('▶', 'Lanjut', (opts.onResume ? 'TrainShared._cb.resume();document.getElementById(\'ts-pause\').remove()' : 'document.getElementById(\'ts-pause\').remove()'))}
        ${btn('🔁', 'Mulai Ulang', (opts.onRestart ? 'TrainShared._cb.restart();document.getElementById(\'ts-pause\').remove()' : 'location.reload()'))}
        ${btn('🚂', 'Ganti Kereta', (opts.onGarage ? 'TrainShared._cb.garage();document.getElementById(\'ts-pause\').remove()' : 'history.back()'))}
        ${btn('⚙️', 'Pengaturan', 'TrainShared.ui.showSettings()')}
        ${btn('🏠', 'Keluar', (opts.onQuit ? 'TrainShared._cb.quit()' : 'history.back()'))}`
      TrainShared._cb = { resume: opts.onResume, restart: opts.onRestart, garage: opts.onGarage, quit: opts.onQuit }
    },
  }

  // ── G5 PAK STASIUN MASCOT ───────────────────────────────────────────────────
  const Mascot = {
    show(message, opts) {
      opts = opts || {}
      let el = document.getElementById('ts-pak-stasiun')
      if (!el) {
        el = document.createElement('div')
        el.id = 'ts-pak-stasiun'
        el.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:62;display:flex;align-items:flex-end;gap:8px;pointer-events:none;max-width:90vw'
        document.body.appendChild(el)
      }
      el.innerHTML = `
        <div style="font-size:48px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4));animation:tsMascotBob 1.8s ease-in-out infinite">👨‍✈️</div>
        ${message ? '<div style="background:#fff;color:#1f2937;font-family:Fredoka One,cursive;font-size:13px;padding:10px 14px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,0.4);max-width:260px;line-height:1.4">' + message + '</div>' : ''}`
      if (!document.getElementById('ts-mascot-kf')) {
        const s = document.createElement('style'); s.id = 'ts-mascot-kf'
        s.textContent = '@keyframes tsMascotBob{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-4px) rotate(3deg)}}'
        document.head.appendChild(s)
      }
      if (opts.duration) setTimeout(() => el.remove(), opts.duration)
    },
    hide() { const el = document.getElementById('ts-pak-stasiun'); if (el) el.remove() },
  }

  // ── G6 TRAIN STATS CARD (pre-level) ─────────────────────────────────────────
  const StatsCard = {
    show(train, gameKey, opts) {
      opts = opts || {}
      let ov = document.getElementById('ts-statscard'); if (!ov) {
        ov = document.createElement('div')
        ov.id = 'ts-statscard'
        ov.style.cssText = 'position:fixed;inset:0;z-index:9020;background:radial-gradient(circle,rgba(15,23,42,0.7),rgba(15,23,42,0.95));display:flex;align-items:center;justify-content:center;padding:18px'
        document.body.appendChild(ov)
      }
      const visits = Passport.forTrain(train.key || '')
      const totalVisits = Object.values(visits).reduce((s, v) => s + (v.visits || 0), 0)
      const totalDist = Object.values(visits).reduce((s, v) => s + (v.distance || 0), 0)
      ov.innerHTML = `
        <div style="background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#451a03;border-radius:18px;padding:18px;max-width:340px;width:100%;font-family:Fredoka One,cursive;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,0.4);animation:tsStatsCardIn 500ms cubic-bezier(.34,1.56,.64,1)">
          <div style="font-size:42px;margin-bottom:6px">${train.flag || '🚂'}</div>
          <h2 style="font-size:22px;margin:0 0 4px">${train.name || 'Kereta'}</h2>
          <div style="font-size:12px;opacity:0.75;margin-bottom:12px">${train.country || ''} ${train.year ? '· ' + train.year : ''}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px">
            <div style="background:rgba(0,0,0,0.18);border-radius:10px;padding:8px"><div style="font-size:10px;opacity:0.7">⚡ KECEPATAN</div><div style="font-size:14px">${train.speed || '?'} km/j</div></div>
            <div style="background:rgba(0,0,0,0.18);border-radius:10px;padding:8px"><div style="font-size:10px;opacity:0.7">⛽ BAHAN BAKAR</div><div style="font-size:14px">${train.fuel || 'Uap'}</div></div>
          </div>
          ${totalVisits > 0 ? `<div style="background:rgba(255,255,255,0.35);border-radius:10px;padding:8px;font-size:12px;margin-bottom:12px">🤝 Sudah dimainkan ${totalVisits}× · ${Math.round(totalDist)}m</div>` : ''}
          <button onclick="document.getElementById('ts-statscard').remove();TrainShared._cb.statsContinue&&TrainShared._cb.statsContinue()" style="width:100%;padding:14px;border-radius:14px;border:0;background:#fff;color:#451a03;font-family:Fredoka One,cursive;font-size:16px;font-weight:900;cursor:pointer;box-shadow:0 4px 0 #b45309">▶ MULAI!</button>
        </div>`
      if (!document.getElementById('ts-statscard-kf')) {
        const s = document.createElement('style'); s.id = 'ts-statscard-kf'
        s.textContent = '@keyframes tsStatsCardIn{0%{opacity:0;transform:scale(0.4) rotate(-3deg)}60%{opacity:1;transform:scale(1.08) rotate(2deg)}100%{opacity:1;transform:scale(1) rotate(0)}}'
        document.head.appendChild(s)
      }
      TrainShared._cb.statsContinue = opts.onContinue
    },
  }

  // ── G8 + G11 AUDIO (signature horns + chuff + whistle) ──────────────────────
  function _playTone(freq, dur, type, vol) {
    try {
      const ctx = window._tsAudio || (window._tsAudio = new (window.AudioContext || window.webkitAudioContext)())
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = type || 'sine'
      osc.frequency.value = freq
      g.gain.setValueAtTime((vol == null ? 0.18 : vol) * getSettings().sfx, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + dur)
    } catch(_){}
  }
  // v54.27 I6: expose globally so G16 (and any other standalone game that uses
  // bare `playTone(...)`) gets a real audio backend. Was silently throwing
  // ReferenceError → caught and swallowed → countdown/whistle/tap-tick were
  // ALL inaudible for owner. Fixed.
  if (typeof window.playTone === 'undefined') window.playTone = _playTone
  const HORN_PROFILES = {
    caseyjr_character: [[660, 0.20, 'sine'], [880, 0.16, 'sine'], [1100, 0.14, 'sine']],
    linus_brave:       [[440, 0.30, 'sine'], [550, 0.24, 'sine']],
    jz711_dragutin:    [[880, 0.10, 'triangle'], [1100, 0.10, 'triangle'], [1320, 0.10, 'triangle']],
    jz62_malivlak:     [[330, 0.40, 'sine'], [440, 0.30, 'sine']],
    default_steam:     [[1100, 0.30, 'sine'], [880, 0.22, 'sine']],
    default_diesel:    [[330, 0.36, 'sawtooth'], [220, 0.30, 'sawtooth']],
    default_hsr:       [[1320, 0.18, 'sine'], [1760, 0.20, 'sine']],
    default_emu:       [[660, 0.16, 'triangle'], [990, 0.20, 'triangle']],
    default_maglev:    [[440, 0.10, 'triangle'], [660, 0.10, 'triangle'], [990, 0.10, 'triangle'], [1320, 0.18, 'triangle']],
  }
  const Audio = {
    playHorn(trainKey) {
      const prof = HORN_PROFILES[trainKey] || HORN_PROFILES.default_steam
      prof.forEach((n, i) => setTimeout(() => _playTone(n[0], n[1], n[2], 0.18), i * 140))
    },
    playChuff(speed) {
      let count = 0
      const interval = Math.max(180, 600 - (speed || 60) * 1.0)
      const fire = () => {
        _playTone(140 + (count % 2) * 20, 0.06, 'square', 0.10)
        _playTone(80, 0.06, 'sawtooth', 0.07)
        count++
        if (count < 6) setTimeout(fire, interval)
      }
      fire()
    },
    playWhistle() {
      _playTone(1100, 0.30, 'sine', 0.16)
      setTimeout(() => _playTone(880, 0.40, 'sine', 0.14), 280)
      setTimeout(() => _playTone(660, 0.30, 'sine', 0.12), 650)
    },
  }

  // ── G7 COUNTER (delegate to Passport.stamp) ─────────────────────────────────
  // (Counter mechanics covered by Passport.stamp)

  // ── G8 WHISTLE GREETING (call on game-switch detection) ─────────────────────
  const Greeting = {
    onEnterGame(gameKey, trainKey) {
      const prev = rd(KEY.lastGame, null)
      wr(KEY.lastGame, gameKey)
      if (prev && prev !== gameKey) {
        // game switched — play signature horn
        if (trainKey) Audio.playHorn(trainKey)
      }
      wr(KEY.lastTrain, Object.assign(rd(KEY.lastTrain, {}), { [gameKey]: trainKey }))
    },
    suggestedTrain(gameKey) { return (rd(KEY.lastTrain, {}) || {})[gameKey] || null },
  }

  // ── G9 TIME-OF-DAY SYNC ─────────────────────────────────────────────────────
  const TimeSync = {
    set(phase, lerp) { wr(KEY.timePhase, { phase: phase, lerp: lerp || 0, at: Date.now() }) },
    get() {
      const cur = rd(KEY.timePhase, null)
      if (!cur) return null
      // expire after 10 minutes
      if (Date.now() - (cur.at || 0) > 600000) return null
      return cur
    },
  }

  // ── G10 IDLE ANIM CONFIG (centralized) ──────────────────────────────────────
  const CharIdle = {
    PROTECTED: ['caseyjr_character', 'linus_brave', 'jz711_dragutin', 'jz62_malivlak'],
    isProtected(key) { return this.PROTECTED.includes(key) },
    // Each game pulls its own idle hook; this just exposes timing constants.
    BLINK_INTERVAL: [3000, 5000],
    SMILE_INTERVAL: [7000, 10000],
  }

  // ── G12 VOICE-LINE LIBRARY ──────────────────────────────────────────────────
  const VOICE_LINES = {
    caseyjr_character: {
      start_id: 'Ayo berangkat, sirkus menunggu!',
      start_en: "Let's roll, the circus awaits!",
      win_id: 'Hore, kita sampai!',
      win_en: 'Hooray, we made it!',
      nearmiss_id: 'Hampir kena!',
      nearmiss_en: 'Close call!',
    },
    linus_brave: {
      start_id: 'Berani maju! Aku siap!',
      start_en: "Brave forward! I'm ready!",
      win_id: 'Misi selesai dengan sukses!',
      win_en: 'Mission accomplished!',
    },
    jz711_dragutin: {
      start_id: 'Tram listrik berangkat tepat waktu!',
      start_en: 'Electric tram departing on time!',
      win_id: 'Tepat waktu, seperti biasa.',
      win_en: 'On time, as always.',
    },
    jz62_malivlak: {
      start_id: 'Tiga gerbong siap berangkat!',
      start_en: 'Three carriages ready to depart!',
      win_id: 'Sukses besar! Bravo!',
      win_en: 'Big success! Bravo!',
    },
  }
  const Voice = {
    speak(trainKey, event) {
      const lang = getSettings().lang || 'id'
      const lines = VOICE_LINES[trainKey] || {}
      const text = lines[event + '_' + lang] || lines[event + '_id'] || ''
      if (!text || !window.speechSynthesis) return
      try {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(text)
        u.lang = lang === 'en' ? 'en-US' : 'id-ID'
        u.rate = 0.95; u.pitch = 1.15
        u.volume = (getSettings().voice || 0.85)
        window.speechSynthesis.speak(u)
      } catch(_){}
    },
    line(trainKey, event) {
      const lang = getSettings().lang || 'id'
      const lines = VOICE_LINES[trainKey] || {}
      return lines[event + '_' + lang] || lines[event + '_id'] || ''
    },
  }

  // ── G13 WORD OF THE DAY ─────────────────────────────────────────────────────
  const WOD_LIST = [
    { id: 'lokomotif', en: 'locomotive' },
    { id: 'gerbong',   en: 'carriage' },
    { id: 'rel',        en: 'rail' },
    { id: 'sinyal',    en: 'signal' },
    { id: 'masinis',   en: 'engineer' },
    { id: 'stasiun',   en: 'station' },
    { id: 'peluit',    en: 'whistle' },
    { id: 'pengangkut', en: 'shipper' },
    { id: 'pertukaran', en: 'switch' },
    { id: 'kabin',     en: 'cabin' },
  ]
  const WordOfDay = {
    today() {
      const cached = rd(KEY.wod, null)
      const today = new Date().toDateString()
      if (cached && cached.date === today) return cached
      // Deterministic by date
      let h = 0; for (let i = 0; i < today.length; i++) h = (h * 31 + today.charCodeAt(i)) >>> 0
      const w = WOD_LIST[h % WOD_LIST.length]
      const out = { date: today, id: w.id, en: w.en }
      wr(KEY.wod, out)
      return out
    },
    showBanner(opts) {
      opts = opts || {}
      const w = this.today()
      let banner = document.getElementById('ts-wod')
      if (!banner) {
        banner = document.createElement('div')
        banner.id = 'ts-wod'
        banner.style.cssText = 'position:fixed;left:50%;top:max(8px,env(safe-area-inset-top));transform:translateX(-50%);z-index:58;background:linear-gradient(135deg,#a855f7,#6366f1);color:#fff;padding:6px 14px;border-radius:100px;font-family:Fredoka One,cursive;font-size:11px;cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,0.5);text-shadow:0 1px 2px rgba(0,0,0,0.4)'
        banner.onclick = () => Voice.speak(null, '_wod_' + getSettings().lang)
        document.body.appendChild(banner)
      }
      banner.textContent = `📚 Kata Hari Ini: ${w.id} = ${w.en}`
      banner.onclick = () => {
        try {
          const u = new SpeechSynthesisUtterance(w.id + '. ' + w.en)
          u.lang = 'id-ID'; window.speechSynthesis.speak(u)
        } catch(_){}
      }
    },
  }

  // ── G14 SOFT SESSION TIMER ──────────────────────────────────────────────────
  const SessionTimer = {
    start() { wr(KEY.sessionStart, Date.now()) },
    elapsedMinutes() {
      const start = rd(KEY.sessionStart, 0)
      if (!start) return 0
      return (Date.now() - start) / 60000
    },
    checkWindDown(opts) {
      opts = opts || {}
      const s = getSettings()
      if (!s.sessionLimit) return false
      const remaining = s.sessionLimit - this.elapsedMinutes()
      if (remaining <= 2 && remaining > 0) {
        if (!SessionTimer._warned) {
          SessionTimer._warned = true
          Mascot.show('Hampir waktunya istirahat! 2 menit lagi ya 🚂', { duration: 5000 })
        }
        return false
      }
      if (remaining <= 0) {
        Mascot.show('Waktu bermain selesai. Sampai besok!', { duration: 8000 })
        if (opts.onLimit) opts.onLimit()
        return true
      }
      return false
    },
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //  v54.25 — Big Features (H1-H13)
  // ═════════════════════════════════════════════════════════════════════════════

  const KEY25 = {
    ach:        'dunia-ts-ach',             // {badgeId: ts}
    daily:      'dunia-ts-daily',           // {date, missionId, progress, claimed}
    streak:     'dunia-ts-streak',          // {days, lastDate}
    sensor:     'dunia-ts-sensor',          // {gameKey:{fails, perfects, mode}}
    birthday:   'dunia-ts-birthday',        // 'MM-DD'
    ghost14:    'dunia-ts-ghost-g14',       // {level: { time, samples }}
    cosmetic:   'dunia-ts-cosmetic',        // {owned:[ids], equipped:{trainKey:id}}
    photoframe: 'dunia-ts-photoframe',      // [{gameKey,trainKey,thumb,when,score}]
  }

  // ── H1: ACHIEVEMENT BADGE WALL ──────────────────────────────────────────────
  const BADGES = [
    // PROTECTED-train-keyed (12)
    { id:'casey_first_race',    icon:'🥇', label:'Balapan pertama Casey JR',  hint:'Selesaikan 1 balapan G14 dengan Casey JR' },
    { id:'linus_brave_finish',  icon:'🛡️', label:'Misi pertama Linus Brave',  hint:'Selesaikan 1 level G15 dengan Linus Brave' },
    { id:'dragutin_on_time',    icon:'⏱️', label:'Tepat waktu, Dragutin!',    hint:'Selesaikan stasiun G16 dengan JZ 711 tanpa salah' },
    { id:'malivlak_three_cars', icon:'🚃', label:'Tiga gerbong Malivlak',     hint:'Mainkan 3 game berbeda dengan Malivlak' },
    // Progress (cross-game)
    { id:'first_whistle',       icon:'🔔', label:'Bunyi pertama',             hint:'Dengar klakson kereta pertamamu' },
    { id:'passport_5',          icon:'🛂', label:'Passport: 5 Kereta',        hint:'Kunjungi 5 kereta berbeda' },
    { id:'passport_15',         icon:'🛂', label:'Passport: 15 Kereta',       hint:'Kunjungi 15 kereta berbeda' },
    { id:'visit_10_exhibits',   icon:'🏛️', label:'Pengunjung Museum',         hint:'Lihat detail 10 kereta di Museum (G18)' },
    { id:'visit_all_museum',    icon:'🏆', label:'Ahli Museum',                hint:'Lihat detail semua kereta di Museum' },
    // Speed/skill
    { id:'race_1st_g14',        icon:'🥇', label:'Juara 1 G14',               hint:'Finish posisi 1 di G14' },
    { id:'word_10_in_row',      icon:'📚', label:'10 huruf beruntun',         hint:'Combo 10 huruf benar di G15' },
    { id:'station_perfect',     icon:'⭐', label:'Stasiun Sempurna',          hint:'Selesai stasiun G16 tanpa salah' },
    { id:'museum_8_of_8',       icon:'🎓', label:'8 dari 8',                   hint:'Skor sempurna kuis G18' },
    // v54.40 end-game mastery — fires only when L30 + perfect score on each train game
    { id:'masinis_profesional_g14', icon:'🎓', label:'Masinis Profesional',    hint:'Lulus L30 G14 dengan 5 bintang + Juara 1' },
    { id:'lulus_akademi_g15',       icon:'🎓', label:'Lulus Akademi Lokomotif', hint:'Lulus L30 G15 dengan 5 bintang + 0 salah' },
    { id:'lulus_akademi_g16',       icon:'🎓', label:'Lulus Akademi Penyelamat',hint:'Lulus L30 G16 dengan 5 bintang' },
    { id:'sarjana_museum_g18',      icon:'🎓', label:'Sarjana Museum',          hint:'Kunjungi semua kereta DAN raih 8/8 kuis G18 di sesi yang sama' },
    // v54.44 meta-mastery — only unlocks when all 4 individual Lulus badges are owned
    { id:'guru_kereta',             icon:'🏆', label:'GURU KERETA',              hint:'Raih ke-empat Lulus Akademi (G14, G15, G16, G18)' },
    // Streak
    { id:'streak_3',            icon:'🔥', label:'Streak 3 hari',             hint:'Main 3 hari berturut' },
    { id:'streak_7',            icon:'🔥', label:'Streak seminggu',           hint:'Main 7 hari berturut' },
    // Birthday + comeback
    { id:'birthday',            icon:'🎂', label:'Selamat Ulang Tahun!',       hint:'Main di hari ulang tahunmu' },
    { id:'comeback',            icon:'👋', label:'Selamat Datang Kembali',     hint:'Kembali main setelah lebih dari 3 hari' },
  ]
  const Achievements = {
    unlock(id) {
      if (!BADGES.find(b => b.id === id)) return false
      const owned = rd(KEY25.ach, {})
      if (owned[id]) return false
      owned[id] = Date.now()
      wr(KEY25.ach, owned)
      // toast
      const b = BADGES.find(x => x.id === id)
      const el = document.createElement('div')
      el.style.cssText = 'position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);z-index:9095;background:linear-gradient(135deg,#fde047,#f59e0b);color:#451a03;font-family:Fredoka One,cursive;padding:14px 22px;border-radius:18px;box-shadow:0 16px 48px rgba(251,191,36,0.5);text-align:center;pointer-events:none;animation:tsBadgeIn 600ms cubic-bezier(.34,1.56,.64,1) forwards'
      el.innerHTML = `<div style="font-size:38px">${b.icon}</div><div style="font-size:14px;letter-spacing:1px;margin-top:6px">${b.label}</div><div style="font-size:11px;opacity:0.7;margin-top:4px">${b.hint}</div>`
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 2400)
      if (!document.getElementById('ts-badge-kf')) {
        const s = document.createElement('style'); s.id = 'ts-badge-kf'
        s.textContent = '@keyframes tsBadgeIn{0%{opacity:0;transform:translate(-50%,-50%) scale(0.3)}60%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}'
        document.head.appendChild(s)
      }
      try { Audio.playWhistle() } catch(_){}
      // v54.44 meta-mastery: after any individual unlock, check whether the
      // 4 Lulus Akademi badges are now all owned and auto-unlock the meta.
      // The recursive call early-returns on the next pass because guru_kereta
      // is then in `owned`, so no infinite loop.
      try {
        if (id !== 'guru_kereta') {
          const LULUS = ['masinis_profesional_g14','lulus_akademi_g15','lulus_akademi_g16','sarjana_museum_g18']
          if (LULUS.every(k => owned[k])) this.unlock('guru_kereta')
        }
      } catch(_){}
      return true
    },
    owned() { return rd(KEY25.ach, {}) },
    showWall() {
      let ov = document.getElementById('ts-badge-wall')
      if (!ov) {
        ov = document.createElement('div')
        ov.id = 'ts-badge-wall'
        ov.style.cssText = 'position:fixed;inset:0;z-index:9080;background:linear-gradient(180deg,#0c0a22,#1a1028);color:#fff;display:flex;flex-direction:column;padding:18px'
        document.body.appendChild(ov)
      }
      const owned = this.owned()
      const total = BADGES.length
      const ownedN = BADGES.filter(b => owned[b.id]).length
      const grid = BADGES.map(b => {
        const got = !!owned[b.id]
        return `<div style="background:${got?'linear-gradient(135deg,rgba(251,191,36,0.18),rgba(245,158,11,0.10))':'rgba(255,255,255,0.04)'};border:1.5px solid ${got?'#fbbf24':'rgba(255,255,255,0.1)'};border-radius:14px;padding:10px;text-align:center;cursor:pointer" title="${b.hint}"><div style="font-size:32px;${got?'':'filter:grayscale(1);opacity:0.35'}">${b.icon}</div><div style="font-size:10px;font-weight:900;margin-top:4px;color:${got?'#fde68a':'rgba(255,255,255,0.6)'}">${b.label}</div></div>`
      }).join('')
      ov.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div><span style="font-family:Fredoka One,cursive;font-size:18px;color:#fde68a">🏆 Achievement Wall</span><div style="opacity:0.7;font-size:12px;margin-top:2px">${ownedN} / ${total} terbuka</div></div>
          <button onclick="document.getElementById('ts-badge-wall').remove()" style="padding:8px 14px;border-radius:10px;border:0;background:#fbbf24;color:#451a03;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer">Tutup ✕</button>
        </div>
        <div style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px">${grid}</div>`
    },
    BADGES,
  }

  // ── H2: DAILY CONDUCTOR CHALLENGE ───────────────────────────────────────────
  const MISSIONS = [
    { id:'race_g14_x1', label:'Selesaikan 1 balapan G14',  game:'g14',  target:1 },
    { id:'words_g15_x2', label:'Selesaikan 2 kata di G15',  game:'g15',  target:2 },
    { id:'station_g16_x2', label:'Bersihkan 2 stasiun G16', game:'g16',  target:2 },
    { id:'museum_quiz_5', label:'Jawab 5 kuis museum benar', game:'g18', target:5 },
    { id:'casey_x1',    label:'Main 1 game dengan Casey JR', game:'any', target:1 },
  ]
  const DailyChallenge = {
    today() {
      const today = new Date().toDateString()
      const cur = rd(KEY25.daily, null)
      if (cur && cur.date === today) return cur
      let h = 0; for (let i = 0; i < today.length; i++) h = (h * 31 + today.charCodeAt(i)) >>> 0
      const m = MISSIONS[h % MISSIONS.length]
      const out = { date: today, missionId: m.id, progress: 0, claimed: false, target: m.target, label: m.label, game: m.game }
      wr(KEY25.daily, out)
      return out
    },
    progress(gameKey, amount) {
      const cur = this.today()
      if (cur.claimed) return
      if (cur.game !== 'any' && cur.game !== gameKey) return
      cur.progress = Math.min(cur.target, (cur.progress || 0) + (amount || 1))
      wr(KEY25.daily, cur)
      if (cur.progress >= cur.target && !cur.claimed) {
        cur.claimed = true
        wr(KEY25.daily, cur)
        try { Mascot.show('🎯 Misi Harian selesai! Stiker harian +1', { duration: 4000 }) } catch(_){}
        Achievements.unlock('first_whistle')
      }
    },
    show() {
      const cur = this.today()
      try { Mascot.show(`🎯 Misi Hari Ini:\n${cur.label}\n(${cur.progress}/${cur.target})`, { duration: 5000 }) } catch(_){}
    },
  }

  // ── H3: STREAK + COMEBACK ──────────────────────────────────────────────────
  const Comeback = {
    pingToday() {
      const cur = rd(KEY25.streak, { days: 0, lastDate: null })
      const today = new Date().toDateString()
      if (cur.lastDate === today) return cur
      const yesterday = new Date(Date.now() - 86400000).toDateString()
      if (cur.lastDate === yesterday) cur.days++
      else if (cur.lastDate) { // gap > 1 day → comeback
        try { Mascot.show('Selamat datang kembali! 👋', { duration: 4000 }) } catch(_){}
        Achievements.unlock('comeback')
        cur.days = 1
      } else cur.days = 1
      cur.lastDate = today
      wr(KEY25.streak, cur)
      if (cur.days >= 3) Achievements.unlock('streak_3')
      if (cur.days >= 7) Achievements.unlock('streak_7')
      return cur
    },
    get() { return rd(KEY25.streak, { days: 0, lastDate: null }) },
  }

  // ── H4: ADAPTIVE FRUSTRATION & FLOW SENSOR ─────────────────────────────────
  const Sensor = {
    failed(gameKey) {
      const cur = rd(KEY25.sensor, {})
      const g = (cur[gameKey] = cur[gameKey] || { fails: 0, perfects: 0, mode: 'normal' })
      g.fails++; g.perfects = 0
      if (g.fails >= 3 && g.mode !== 'hint') {
        g.mode = 'hint'
        try { Mascot.show('Tenang aja, aku bantu ya 💡', { duration: 4000 }) } catch(_){}
      }
      wr(KEY25.sensor, cur)
      return g
    },
    perfected(gameKey) {
      const cur = rd(KEY25.sensor, {})
      const g = (cur[gameKey] = cur[gameKey] || { fails: 0, perfects: 0, mode: 'normal' })
      g.perfects++; g.fails = 0
      if (g.perfects >= 3 && g.mode !== 'speedstar') {
        g.mode = 'speedstar'
        try { Mascot.show('⭐ Hebat! Mode lebih sulit terbuka.', { duration: 4500 }) } catch(_){}
      }
      wr(KEY25.sensor, cur)
      return g
    },
    mode(gameKey) {
      const cur = rd(KEY25.sensor, {})
      return (cur[gameKey] && cur[gameKey].mode) || 'normal'
    },
  }

  // ── H5: DYNAMIC MUSIC TEMPO ─────────────────────────────────────────────────
  const MusicTempo = {
    apply(speedRatio) {
      // speedRatio 0..1 maps to playbackRate 0.85..1.25
      const rate = 0.85 + Math.max(0, Math.min(1, speedRatio)) * 0.40
      try {
        const bgm = document.getElementById('game-bgm')
        if (bgm) { bgm.playbackRate = rate; bgm.preservesPitch = false }
      } catch(_){}
    },
    reset() {
      try {
        const bgm = document.getElementById('game-bgm')
        if (bgm) bgm.playbackRate = 1.0
      } catch(_){}
    },
  }

  // ── H6: BIRTHDAY TRAIN MODE ─────────────────────────────────────────────────
  const Birthday = {
    set(mmdd) { wr(KEY25.birthday, mmdd) },
    get() { return rd(KEY25.birthday, null) },
    isToday() {
      const set = this.get(); if (!set) return false
      const d = new Date()
      const mmdd = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
      return mmdd === set
    },
    celebrate() {
      if (!this.isToday()) return false
      Achievements.unlock('birthday')
      try { Mascot.show('🎂 Selamat Ulang Tahun! Hari ini semua kereta pakai topi pesta! 🎉', { duration: 6000 }) } catch(_){}
      // simple confetti
      for (let i = 0; i < 36; i++) {
        const c = document.createElement('span')
        c.style.cssText = 'position:fixed;top:-20px;left:' + (Math.random() * 100) + 'vw;width:8px;height:14px;background:hsl(' + (Math.random() * 360) + ',80%,55%);z-index:9085;pointer-events:none;border-radius:50%;animation:tsBdayFall 2.4s linear forwards'
        c.style.animationDelay = (i * 0.05) + 's'
        document.body.appendChild(c)
        setTimeout(() => c.remove(), 5000 + i * 30)
      }
      if (!document.getElementById('ts-bday-kf')) {
        const s = document.createElement('style'); s.id = 'ts-bday-kf'
        s.textContent = '@keyframes tsBdayFall{0%{transform:translateY(-30px) rotate(0)}100%{transform:translateY(110vh) rotate(720deg);opacity:0.5}}'
        document.head.appendChild(s)
      }
      return true
    },
    promptSet() {
      if (this.get()) return
      const mmdd = prompt('Atur ulang tahun (MM-DD), kosongkan untuk lewati:')
      if (mmdd && /^\d{2}-\d{2}$/.test(mmdd.trim())) this.set(mmdd.trim())
    },
  }

  // ── H7: GHOST REPLAY (G14) ──────────────────────────────────────────────────
  const Ghost14 = {
    record(level, time, samples) {
      const all = rd(KEY25.ghost14, {})
      const cur = all[level]
      if (!cur || time < cur.time) all[level] = { time, samples: samples || [] }
      wr(KEY25.ghost14, all)
    },
    forLevel(level) { return (rd(KEY25.ghost14, {}) || {})[level] || null },
  }

  // ── H8: COSMETIC UNLOCK SYSTEM ──────────────────────────────────────────────
  const COSMETICS = [
    { id:'hat_birthday', label:'Topi Pesta',   emoji:'🎩' },
    { id:'scarf_red',    label:'Syal Merah',   emoji:'🧣' },
    { id:'lantern',      label:'Lentera',      emoji:'🏮' },
    { id:'star_crown',   label:'Mahkota Bintang', emoji:'⭐' },
    { id:'rainbow',      label:'Pelangi',      emoji:'🌈' },
  ]
  const Cosmetics = {
    unlock(id) {
      const cur = rd(KEY25.cosmetic, { owned: [], equipped: {} })
      if (!cur.owned.includes(id)) {
        cur.owned.push(id); wr(KEY25.cosmetic, cur)
        try { Mascot.show('🎁 Aksesoris baru terbuka: ' + (COSMETICS.find(c => c.id === id) || {}).label, { duration: 4000 }) } catch(_){}
      }
    },
    equip(trainKey, id) {
      const cur = rd(KEY25.cosmetic, { owned: [], equipped: {} })
      cur.equipped[trainKey] = id; wr(KEY25.cosmetic, cur)
    },
    equipped(trainKey) {
      const cur = rd(KEY25.cosmetic, { owned: [], equipped: {} })
      return cur.equipped[trainKey] || null
    },
    show() {
      let ov = document.getElementById('ts-cosmetic'); if (!ov) {
        ov = document.createElement('div')
        ov.id = 'ts-cosmetic'
        ov.style.cssText = 'position:fixed;inset:0;z-index:9080;background:linear-gradient(180deg,#1a1028,#0c0a22);color:#fff;padding:18px;display:flex;flex-direction:column'
        document.body.appendChild(ov)
      }
      const cur = rd(KEY25.cosmetic, { owned: [], equipped: {} })
      const grid = COSMETICS.map(c => {
        const owned = cur.owned.includes(c.id)
        return `<div style="background:${owned?'rgba(168,85,247,0.18)':'rgba(255,255,255,0.04)'};border:1.5px solid ${owned?'#a855f7':'rgba(255,255,255,0.1)'};border-radius:14px;padding:14px;text-align:center"><div style="font-size:42px;${owned?'':'filter:grayscale(1);opacity:0.35'}">${c.emoji}</div><div style="font-size:11px;margin-top:6px;color:${owned?'#e9d5ff':'rgba(255,255,255,0.5)'}">${c.label}</div></div>`
      }).join('')
      ov.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><span style="font-family:Fredoka One,cursive;font-size:18px;color:#e9d5ff">🎁 Koleksi Aksesoris</span><button onclick="document.getElementById('ts-cosmetic').remove()" style="padding:8px 14px;border-radius:10px;border:0;background:#fbbf24;color:#451a03;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer">Tutup ✕</button></div>
        <div style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px">${grid}</div>`
    },
    overlayFor(trainKey) {
      // returns emoji for the equipped cosmetic; caller can render as Pixi Text or DOM
      const id = this.equipped(trainKey)
      if (!id) return null
      const c = COSMETICS.find(x => x.id === id)
      return c ? c.emoji : null
    },
    COSMETICS,
  }

  // ── H9: TRAIN GARAGE — Pre-Game Hub ─────────────────────────────────────────
  const Garage = {
    show(onPick) {
      let ov = document.getElementById('ts-garage'); if (!ov) {
        ov = document.createElement('div')
        ov.id = 'ts-garage'
        ov.style.cssText = 'position:fixed;inset:0;z-index:9078;background:linear-gradient(180deg,#0c0a22,#3b0764);color:#fff;padding:18px;display:flex;flex-direction:column'
        document.body.appendChild(ov)
      }
      const trains = [
        { key:'caseyjr_character', emoji:'🚂', name:'Casey JR ⭐' },
        { key:'linus_brave',       emoji:'🚂', name:'Linus Brave ⭐' },
        { key:'jz711_dragutin',    emoji:'🚆', name:'JZ 711 Dragutin ⭐' },
        { key:'jz62_malivlak',     emoji:'🚂', name:'Malivlak ⭐' },
      ]
      const games = [
        { key:'g14', label:'Balapan Kereta', path:'games/g14.html' },
        { key:'g15', label:'Lokomotif Pemberani', path:'games/g15-pixi.html' },
        { key:'g16', label:'Selamatkan Kereta', path:'games/g16-pixi.html' },
      ]
      const trainCards = trains.map(t => `<div onclick="TrainShared._cb.garagePick&&TrainShared._cb.garagePick('${t.key}');document.querySelectorAll('.ts-grg-train').forEach(e=>e.style.borderColor='rgba(255,255,255,0.15)');this.style.borderColor='#fde047';TrainShared._cb._chosen='${t.key}';TrainShared.audio.playHorn('${t.key}')" class="ts-grg-train" style="background:rgba(255,255,255,0.06);border:2px solid rgba(255,255,255,0.15);border-radius:14px;padding:14px;text-align:center;cursor:pointer;transition:all 200ms"><div style="font-size:36px">${t.emoji}</div><div style="font-size:11px;margin-top:6px;color:#fde68a">${t.name}</div></div>`).join('')
      const gameCards = games.map(g => `<button onclick="if(TrainShared._cb._chosen){sessionStorage.setItem('garageTrainKey',TrainShared._cb._chosen);location.href='${g.path}'}else{alert('Pilih kereta dulu!')}" style="background:linear-gradient(135deg,#a855f7,#6366f1);color:#fff;border:0;border-radius:14px;padding:14px;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer">🎮 ${g.label}</button>`).join('')
      ov.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><span style="font-family:Fredoka One,cursive;font-size:18px;color:#fde68a">🏠 Garasi Kereta</span><button onclick="document.getElementById('ts-garage').remove()" style="padding:8px 14px;border-radius:10px;border:0;background:#fbbf24;color:#451a03;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer">Tutup ✕</button></div>
        <div style="opacity:0.7;font-size:13px;margin-bottom:14px">1. Pilih kereta favoritmu (klakson akan berbunyi). 2. Pilih game untuk dimainkan.</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-bottom:18px">${trainCards}</div>
        <div style="display:flex;flex-direction:column;gap:10px">${gameCards}</div>`
      TrainShared._cb.garagePick = onPick
    },
  }

  // ── H10: PHOTO FRAME (G18 Memory Hall) ──────────────────────────────────────
  const PhotoFrame = {
    capture(gameKey, trainKey, dataUrl, score) {
      const arr = rd(KEY25.photoframe, [])
      arr.push({ gameKey, trainKey, thumb: dataUrl, when: Date.now(), score: score || 0 })
      while (arr.length > 12) arr.shift()
      wr(KEY25.photoframe, arr)
    },
    show() {
      let ov = document.getElementById('ts-photoframe'); if (!ov) {
        ov = document.createElement('div')
        ov.id = 'ts-photoframe'
        ov.style.cssText = 'position:fixed;inset:0;z-index:9080;background:linear-gradient(180deg,#0c0a22,#1a1028);color:#fff;padding:18px;display:flex;flex-direction:column'
        document.body.appendChild(ov)
      }
      const arr = rd(KEY25.photoframe, [])
      const cards = arr.length ? arr.slice().reverse().map(p => `<div style="background:#fdf6e3;border:6px solid #8d6e63;border-radius:8px;padding:6px;text-align:center"><img src="${p.thumb || ''}" style="width:100%;border-radius:4px;background:rgba(0,0,0,0.2)" onerror="this.style.display='none'"><div style="font-size:10px;color:#3e2723;margin-top:4px">${p.gameKey} · ${new Date(p.when).toLocaleDateString()}</div></div>`).join('') : '<div style="opacity:0.6;text-align:center;margin:20vh auto">Belum ada foto. Main game dan tekan 📸 untuk menyimpan!</div>'
      ov.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><span style="font-family:Fredoka One,cursive;font-size:18px;color:#fde68a">🖼️ Lorong Kenangan</span><button onclick="document.getElementById('ts-photoframe').remove()" style="padding:8px 14px;border-radius:10px;border:0;background:#fbbf24;color:#451a03;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer">Tutup ✕</button></div>
        <div style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">${cards}</div>`
    },
  }

  // ── H11: G14 COOP SPLIT-SCREEN (MVP — toggle stub) ──────────────────────────
  const Coop14 = {
    show() {
      try { Mascot.show('Co-op split-screen ada di v54.25.x — beritahu owner kalau mau prioritaskan.', { duration: 6000 }) } catch(_){}
    },
  }

  // ── H12: AR-style "Lihat ukuran asli" (G18) ─────────────────────────────────
  const ARMode = {
    async start(train) {
      let ov = document.getElementById('ts-ar'); if (!ov) {
        ov = document.createElement('div')
        ov.id = 'ts-ar'
        ov.style.cssText = 'position:fixed;inset:0;z-index:9090;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;padding:14px'
        document.body.appendChild(ov)
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        const v = document.createElement('video')
        v.srcObject = stream; v.autoplay = true; v.playsInline = true
        v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover'
        ov.appendChild(v)
        const overlay = document.createElement('div')
        overlay.style.cssText = 'position:absolute;left:50%;bottom:14%;transform:translateX(-50%);font-size:48px;opacity:0.65;filter:drop-shadow(0 0 18px rgba(255,255,255,0.7));pointer-events:none'
        overlay.textContent = '🚂'
        ov.appendChild(overlay)
        const info = document.createElement('div')
        info.style.cssText = 'position:absolute;left:50%;top:18%;transform:translateX(-50%);background:rgba(0,0,0,0.6);padding:10px 16px;border-radius:14px;font-family:Fredoka One,cursive;font-size:14px;text-align:center;max-width:80vw'
        info.innerHTML = `📏 Ukuran asli ${train.name || 'kereta ini'}<br><span style="opacity:0.7;font-size:12px">≈ ${train.length || '?'}m panjang · ${train.height || '?'}m tinggi</span>`
        ov.appendChild(info)
        const close = document.createElement('button')
        close.textContent = '✕'
        close.style.cssText = 'position:absolute;top:14px;right:14px;width:44px;height:44px;border-radius:50%;border:0;background:rgba(0,0,0,0.7);color:#fff;font-size:18px;cursor:pointer'
        close.onclick = () => { stream.getTracks().forEach(t => t.stop()); ov.remove() }
        ov.appendChild(close)
      } catch (err) {
        ov.innerHTML = `<div style="text-align:center;padding:30px"><div style="font-size:42px;margin-bottom:10px">📷</div><div>Aktifkan izin kamera untuk melihat ukuran asli.</div><button onclick="document.getElementById('ts-ar').remove()" style="margin-top:18px;padding:10px 22px;border-radius:12px;border:0;background:#fbbf24;color:#451a03;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer">Tutup</button></div>`
      }
    },
  }

  // ── H13: G18 HOT-SEAT COOP (Pemandu Museum) ─────────────────────────────────
  const Hotseat18 = {
    state: { active: false, p1Score: 0, p2Score: 0, turn: 0 },
    start() {
      this.state = { active: true, p1Score: 0, p2Score: 0, turn: 0 }
      try { Mascot.show('Mode 2-pemain: P1 ungu, P2 oranye. Bergiliran jawab kuis!', { duration: 5000 }) } catch(_){}
    },
    nextTurn() { this.state.turn = 1 - this.state.turn; return this.state.turn === 0 ? 'P1' : 'P2' },
    score(correct) {
      if (!this.state.active) return
      if (this.state.turn === 0) this.state.p1Score += correct ? 1 : 0
      else this.state.p2Score += correct ? 1 : 0
    },
    end() {
      if (!this.state.active) return null
      const s = this.state; this.state.active = false
      return s
    },
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  window.TrainShared = {
    passport: Passport,
    codex: Codex,
    ui: UI,
    mascot: Mascot,
    statsCard: StatsCard,
    audio: Audio,
    greeting: Greeting,
    timeSync: TimeSync,
    charIdle: CharIdle,
    voice: Voice,
    wordOfDay: WordOfDay,
    sessionTimer: SessionTimer,
    settings: { get: getSettings, save: saveSettings },
    // v54.25 Big Features
    achievements: Achievements,
    dailyChallenge: DailyChallenge,
    comeback: Comeback,
    sensor: Sensor,
    musicTempo: MusicTempo,
    birthday: Birthday,
    ghost14: Ghost14,
    cosmetics: Cosmetics,
    garage: Garage,
    photoframe: PhotoFrame,
    coop14: Coop14,
    arMode: ARMode,
    hotseat18: Hotseat18,
    _cb: {},
  }

  // Boot
  try { SessionTimer.start() } catch(_){}
  // v54.25 boot hooks: ping comeback streak + birthday detection on every page load
  try { Comeback.pingToday() } catch(_){}
  try { if (Birthday.isToday()) Birthday.celebrate() } catch(_){}
})();
