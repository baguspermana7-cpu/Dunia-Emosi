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
    _cb: {},
  }

  // Boot
  try { SessionTimer.start() } catch(_){}
})();
