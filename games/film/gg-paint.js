/* =============================================================================
 * gg-paint.js — cat sungguhan untuk Batwheels Gotham Getaway
 * =============================================================================
 * Kenapa ini ada.
 *
 * Kustom warna yang lama memakai `skeleton.color` milik Spine. Itu **multiply
 * murni** — terkonfirmasi di tiga jalur render runtime-nya. Multiply hanya bisa
 * MENGGELAPKAN: bodi Bam yang biru-gelap tidak akan pernah bisa jadi kuning,
 * berapa pun warna yang dipilih anak. Karena itu kustomnya selalu terasa tipis;
 * bukan pilihannya yang kurang, mekanismenya yang memang tidak mampu.
 *
 * Atlas gotham juga tidak punya satu pun region stiker, dan tiap slot skin hero
 * memetakan tepat satu attachment. Jadi tidak ada jalan lewat data Spine.
 *
 * Yang dilakukan di sini: mengecat ulang PIKSEL region bodi hero di halaman
 * atlas, sebelum Spine memuatnya. Semua UV tetap sah, villain di halaman yang
 * sama tidak tersentuh, dan tidak ada bedah Spine saat runtime.
 *
 * Dipakai DUA KALI dari satu implementasi: untuk pratinjau di layar pilih, dan
 * untuk tekstur yang benar-benar dipakai balapan. Anak melihat persis apa yang
 * akan dia dapat.
 * ========================================================================== */
;(function (W) {
  'use strict'

  // Nama region bodi hero di tiap berkas pasangan. `redbird` TIDAK memakai
  // region bernama "redbird" — namanya "redwing". Menebak akan meleset.
  var HERO_REGION = {
    bam: { pair: 'bam-prank', region: 'bam' },
    bibi: { pair: 'bibi-jestah', region: 'bibi' },
    redbird: { pair: 'redbird-ducky', region: 'redwing' },
    buff: { pair: 'buff-snowy', region: 'buff' },
    batwing: { pair: 'batwing-quizz', region: 'batwing' }
  }

  // Palet cat. Diambil dari daftar warna stiker Batwheels by You
  // (js/globalvar.js) supaya warnanya memang warna keluarga game ini,
  // bukan palet karangan.
  var PAINTS = [
    { name: 'Asli', hex: null },
    { name: 'Kuning', hex: 'fed52f' },
    { name: 'Jingga', hex: 'fb8e0d' },
    { name: 'Merah', hex: 'e72323' },
    { name: 'Magenta', hex: 'db13d4' },
    { name: 'Ungu', hex: 'a71ad5' },
    { name: 'Biru', hex: '4566d1' },
    { name: 'Toska', hex: '07bbcc' },
    { name: 'Hijau', hex: '16ba04' },
    { name: 'Hijau Muda', hex: 'c5ea29' },
    { name: 'Langit', hex: '417acf' },
    { name: 'Pink', hex: 'ff7ab8' }
  ]

  function clamp01 (x) { return x < 0 ? 0 : x > 1 ? 1 : x }

  // 0 di bawah lo, 1 di atas hi, mulus di antaranya. Ambang keras sempat
  // membuat bagian gelap Batwing berbintik: satu piksel lolos ambang lalu
  // berubah total sementara tetangganya tidak.
  function smooth (x, lo, hi) {
    if (x <= lo) return 0
    if (x >= hi) return 1
    var t = (x - lo) / (hi - lo)
    return t * t * (3 - 2 * t)
  }

  function rgb2hsv (r, g, b) {
    r /= 255; g /= 255; b /= 255
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
    var h = 0
    if (d) {
      if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      else if (mx === g) h = ((b - r) / d + 2) / 6
      else h = ((r - g) / d + 4) / 6
    }
    return [h, mx ? d / mx : 0, mx]
  }

  function hsv2rgb (h, s, v) {
    var i = Math.floor(h * 6), f = h * 6 - i
    var p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s)
    switch (i % 6) {
      case 0: return [v, t, p]
      case 1: return [q, v, p]
      case 2: return [p, v, t]
      case 3: return [p, q, v]
      case 4: return [t, p, v]
      default: return [v, p, q]
    }
  }

  // ── atlas ──────────────────────────────────────────────────────────────────
  // Format libgdx biasa. `rotate: true` berarti region disimpan diputar 90°,
  // jadi rect di halaman tertukar lebar dan tingginya.
  function parseAtlas (text) {
    var out = {}, cur = null
    text.split('\n').forEach(function (raw) {
      var line = raw.replace(/\r$/, '')
      if (!line.trim()) return
      if (line[0] !== ' ' && line.indexOf(':') < 0) { cur = line.trim(); out[cur] = {} }
      else if (cur && line.indexOf(':') > 0) {
        var i = line.indexOf(':')
        out[cur][line.slice(0, i).trim()] = line.slice(i + 1).trim()
      }
    })
    return out
  }

  function rectOf (reg) {
    var xy = reg.xy.split(','), sz = reg.size.split(',')
    var w = parseInt(sz[0], 10), h = parseInt(sz[1], 10)
    if (reg.rotate === 'true') { var t = w; w = h; h = t }
    return { x: parseInt(xy[0], 10), y: parseInt(xy[1], 10), w: w, h: h, rotated: reg.rotate === 'true' }
  }

  // Hue bodi = puncak histogram piksel yang cukup jenuh dan cukup terang.
  // Dipakai supaya yang dicat hanya bodinya: kaca dan trim punya saturasi atau
  // hue lain, jadi lolos dengan sendirinya tanpa perlu masker digambar tangan.
  function dominantHue (data) {
    var bins = new Float64Array(36)
    for (var i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue
      var c = rgb2hsv(data[i], data[i + 1], data[i + 2])
      if (c[1] < 0.18 || c[2] < 0.12) continue
      bins[(Math.floor(c[0] * 36) % 36 + 36) % 36] += c[1]
    }
    var best = 0
    for (var k = 1; k < 36; k++) if (bins[k] > bins[best]) best = k
    return (best + 0.5) / 36
  }

  function repaintPixels (data, hex, keepHue, tol) {
    tol = tol || 0.16
    var tr = parseInt(hex.slice(0, 2), 16) / 255
    var tg = parseInt(hex.slice(2, 4), 16) / 255
    var tb = parseInt(hex.slice(4, 6), 16) / 255
    var t = rgb2hsv(tr * 255, tg * 255, tb * 255)
    var th = t[0], ts = t[1], tv = t[2]
    var touched = 0
    for (var i = 0; i < data.length; i += 4) {
      var a = data[i + 3]
      if (a === 0) continue
      var c = rgb2hsv(data[i], data[i + 1], data[i + 2])
      var d = Math.abs(c[0] - keepHue)
      d = Math.min(d, 1 - d)
      var wt = (1 - smooth(d, tol * 0.55, tol)) * smooth(c[1], 0.12, 0.28)
      if (wt <= 0.01) continue
      // Bayangan dibawa oleh value; angkat dari lantai supaya bodi yang nyaris
      // hitam pun bisa menjadi warna terang — persis yang tidak bisa multiply.
      var nv = Math.min(1, 0.30 + 0.85 * c[2]) * (0.55 + 0.45 * tv)
      var ns = Math.min(1, ts * (0.55 + 0.75 * c[1]))
      var o = hsv2rgb(th, ns, nv)
      data[i] = (o[0] * 255) * wt + data[i] * (1 - wt)
      data[i + 1] = (o[1] * 255) * wt + data[i + 1] * (1 - wt)
      data[i + 2] = (o[2] * 255) * wt + data[i + 2] * (1 - wt)
      touched += wt
    }
    return touched
  }

  function loadImage (url) {
    return new Promise(function (res, rej) {
      var im = new Image()
      im.onload = function () { res(im) }
      im.onerror = function () { rej(new Error('gagal memuat ' + url)) }
      im.src = url
    })
  }

  var atlasCache = {}
  function loadAtlas (base, pair) {
    if (atlasCache[pair]) return atlasCache[pair]
    atlasCache[pair] = fetch(base + pair + '.atlas').then(function (r) {
      if (!r.ok) throw new Error('atlas ' + r.status)
      return r.text()
    }).then(parseAtlas)
    return atlasCache[pair]
  }

  /**
   * Kembalikan {canvas, rect, keepHue} untuk halaman atlas hero yang sudah
   * dicat. `hex` null = tanpa cat (halaman asli apa adanya).
   */
  function paintPage (base, hero, hex, sticker) {
    var meta = HERO_REGION[hero]
    if (!meta) return Promise.reject(new Error('hero tak dikenal: ' + hero))
    return Promise.all([
      loadAtlas(base, meta.pair),
      loadImage(base + meta.pair + '-0.png'),
      sticker ? loadImage(sticker.url).catch(function () { return null }) : null
    ]).then(function (r) {
      var regions = r[0], page = r[1], decal = r[2]
      var reg = regions[meta.region]
      if (!reg) throw new Error('region ' + meta.region + ' tidak ada di ' + meta.pair)
      var rect = rectOf(reg)

      var cv = document.createElement('canvas')
      cv.width = page.width; cv.height = page.height
      var ctx = cv.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(page, 0, 0)

      var keepHue = null
      if (hex || decal) {
        var img = ctx.getImageData(rect.x, rect.y, rect.w, rect.h)
        keepHue = dominantHue(img.data)
        if (hex) repaintPixels(img.data, hex, keepHue)
        ctx.putImageData(img, rect.x, rect.y)
      }

      if (decal) drawSticker(ctx, rect, decal, sticker)
      return { canvas: cv, rect: rect, keepHue: keepHue, pair: meta.pair, region: meta.region }
    })
  }

  // Stiker ditempel DI DALAM rect bodi, dan digambar dengan orientasi yang sama
  // seperti region itu disimpan — kalau region diputar 90°, stikernya ikut,
  // supaya di layar ia tampak tegak di badan mobil.
  function drawSticker (ctx, rect, decal, opt) {
    // Semua koordinat di sini dipikirkan di RUANG TAMPILAN — mobil tegak,
    // menghadap kanan — lalu dipetakan ke ruang penyimpanan. Menghitung
    // langsung di ruang penyimpanan sempat menaruh stiker di ambang badan
    // mobil dan membuatnya kekecilan, karena untuk region yang tersimpan
    // miring lebar dan tinggi tertukar.
    var dispW = rect.rotated ? rect.h : rect.w
    var dispH = rect.rotated ? rect.w : rect.h
    // Ukuran diambil dari PANJANG mobil; memakai sisi terpendek membuat decal
    // menyusut jadi noda kecil.
    var box = dispW * (opt.size == null ? 0.30 : opt.size)
    var sc = Math.min(box / decal.width, box / decal.height)
    var dw = decal.width * sc, dh = decal.height * sc
    var u = opt.u == null ? 0.46 : opt.u          // sepanjang badan, 0 depan
    var v = opt.v == null ? 0.56 : opt.v          // dari atap ke bawah
    ctx.save()
    ctx.beginPath()
    ctx.rect(rect.x, rect.y, rect.w, rect.h)   // jangan sampai meluber ke region tetangga
    ctx.clip()
    if (rect.rotated) {
      // tampilan (dx,dy) = (rect.h - sy, sx)  =>  sx = dy, sy = rect.h - dx
      ctx.translate(rect.x + v * rect.w, rect.y + (1 - u) * rect.h)
      ctx.rotate(-Math.PI / 2)
    } else {
      ctx.translate(rect.x + u * rect.w, rect.y + v * rect.h)
    }
    if (opt.tint) {
      var tmp = document.createElement('canvas')
      tmp.width = decal.width; tmp.height = decal.height
      var tc = tmp.getContext('2d')
      tc.drawImage(decal, 0, 0)
      tc.globalCompositeOperation = 'source-in'
      tc.fillStyle = '#' + opt.tint
      tc.fillRect(0, 0, tmp.width, tmp.height)
      ctx.drawImage(tmp, -dw / 2, -dh / 2, dw, dh)
    } else {
      ctx.drawImage(decal, -dw / 2, -dh / 2, dw, dh)
    }
    ctx.restore()
  }

  /** Potong bodi hero saja, untuk pratinjau di layar pilih. */
  function cropBody (res, maxW) {
    var r = res.rect
    var out = document.createElement('canvas')
    var w = r.rotated ? r.h : r.w, h = r.rotated ? r.w : r.h
    var sc = maxW ? Math.min(1, maxW / w) : 1
    out.width = Math.round(w * sc); out.height = Math.round(h * sc)
    var c = out.getContext('2d')
    c.imageSmoothingQuality = 'high'
    c.save()
    c.scale(sc, sc)
    if (r.rotated) {
      // Region tersimpan miring; tegakkan supaya anak melihat mobilnya, bukan
      // gambar yang rebah. Arahnya SEARAH jarum jam — memutar ke arah
      // sebaliknya menghasilkan mobil terbalik, roda di atas.
      c.translate(w, 0)
      c.rotate(Math.PI / 2)
      c.drawImage(res.canvas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h)
    } else {
      c.drawImage(res.canvas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h)
    }
    c.restore()
    return out
  }

  /**
   * Halaman atlas hasil cat sebagai blob URL, siap dipakai loader Spine.
   * Kelima rig dimuat dengan preMultipliedAlpha, tapi PNG yang kita hasilkan
   * TIDAK dipremultiply di berkasnya — sama seperti PNG aslinya. Yang penting
   * formatnya identik dengan yang digantikan.
   */
  function pageBlobURL (res) {
    return new Promise(function (resolve, reject) {
      res.canvas.toBlob(function (b) {
        if (!b) return reject(new Error('toBlob gagal'))
        resolve(URL.createObjectURL(b))
      }, 'image/png')
    })
  }

  W.GGPaint = {
    HERO_REGION: HERO_REGION,
    PAINTS: PAINTS,
    parseAtlas: parseAtlas,
    rectOf: rectOf,
    dominantHue: dominantHue,
    repaintPixels: repaintPixels,
    paintPage: paintPage,
    cropBody: cropBody,
    pageBlobURL: pageBlobURL
  }
})(typeof window !== 'undefined' ? window : this)
