/* PRD-59: UAE road signs drawn as SVG (Vienna-convention shapes, as used in the UAE). Colours come from CSS classes
   in uae.css (.sg-*), never literal fills. UAESigns.svg(key) -> markup; UAESigns.keys -> every key drawn here. */
(function (root) {
  'use strict'
  var W = function (inner, label) { return '<svg class="u-sign" viewBox="0 0 100 100" role="img" aria-label="' + label + '">' + inner + '</svg>' }
  // shapes
  var ring = function (inner) { return '<circle class="sg-white sg-edge" cx="50" cy="50" r="44"/><circle class="sg-red-ring" cx="50" cy="50" r="38"/>' + inner }
  var bar = '<path class="sg-red-stroke" d="M23 77L77 23"/>'
  var blue = function (inner) { return '<circle class="sg-blue" cx="50" cy="50" r="44"/>' + inner }
  var tri = function (inner) { return '<path class="sg-white sg-red-edge" d="M50 10L92 86H8z"/>' + inner }
  var arrow = function (rot) { return '<g transform="rotate(' + rot + ' 50 50)"><path class="sg-ink-stroke" d="M50 72V34"/><path class="sg-ink" d="M50 22L62 38H38z"/></g>' }
  var arrowW = function (rot) { return '<g transform="rotate(' + rot + ' 50 50)"><path class="sg-white-stroke" d="M50 72V34"/><path class="sg-white" d="M50 22L62 38H38z"/></g>' }
  var person = function (x, y, s) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><circle class="sg-ink" cx="0" cy="-16" r="4"/><path class="sg-ink-stroke" d="M0 -11V3M0 3L-6 14M0 3L6 14M-7 -5H7"/></g>' }
  var car = function (x, y, cls) { return '<g transform="translate(' + x + ' ' + y + ')"><path class="' + cls + '" d="M-12 2h24v-6l-4-6h-16l-4 6z"/><circle class="' + cls + '" cx="-7" cy="3" r="3"/><circle class="' + cls + '" cx="7" cy="3" r="3"/></g>' }
  var S = {
    'stop': ['Stop', '<path class="sg-red" d="M32 6h36l26 26v36L68 94H32L6 68V32z"/><text class="sg-text-white" x="50" y="58" text-anchor="middle" font-size="22">STOP</text>'],
    'give-way': ['Give way', '<path class="sg-white sg-red-edge" d="M8 14H92L50 90z"/>'],
    'no-entry': ['No entry', '<circle class="sg-red" cx="50" cy="50" r="44"/><rect class="sg-white" x="20" y="42" width="60" height="16" rx="2"/>'],
    'no-u-turn': ['No U-turn', ring('<path class="sg-ink-stroke" d="M38 74V44a12 12 0 0124 0v12"/><path class="sg-ink" d="M62 68l-10-14h20z"/>' + bar)],
    'no-left-turn': ['No left turn', ring('<path class="sg-ink-stroke" d="M58 76V48H40"/><path class="sg-ink" d="M28 48l14-11v22z"/>' + bar)],
    'no-right-turn': ['No right turn', ring('<path class="sg-ink-stroke" d="M42 76V48h18"/><path class="sg-ink" d="M72 48L58 37v22z"/>' + bar)],
    'no-overtaking': ['No overtaking', ring(car(37, 52, 'sg-red') + car(63, 52, 'sg-ink'))],
    'no-parking': ['No parking', '<circle class="sg-blue sg-red-edge-thick" cx="50" cy="50" r="40"/><path class="sg-red-stroke" d="M24 76L76 24"/>'],
    'no-stopping': ['No stopping', '<circle class="sg-blue sg-red-edge-thick" cx="50" cy="50" r="40"/><path class="sg-red-stroke" d="M24 76L76 24M24 24l52 52"/>'],
    'no-horn': ['No horn', ring('<path class="sg-ink" d="M30 44h10l16-10v32L40 56H30z"/>' + bar)],
    'no-pedestrians': ['No pedestrians', ring(person(50, 58, 1.6) + bar)],
    'no-trucks': ['No heavy vehicles', ring('<path class="sg-ink" d="M26 38h30v22H26zM56 46h12l6 8v6H56z"/><circle class="sg-ink" cx="34" cy="63" r="4"/><circle class="sg-ink" cx="64" cy="63" r="4"/>' + bar)],
    'roundabout': ['Roundabout (mandatory)', blue('<g class="sg-white-stroke"><path d="M50 28a22 22 0 0119 11"/><path d="M71 61a22 22 0 01-19 11"/><path d="M29 61a22 22 0 01-1-22"/></g><path class="sg-white" d="M74 34l2 14-13-6zM46 78l-12-7 12-6zM24 34l10 10-13 3z"/>')],
    'keep-right': ['Keep right', blue('<g transform="rotate(135 50 50)"><path class="sg-white-stroke" d="M50 72V34"/><path class="sg-white" d="M50 22L62 38H38z"/></g>')],
    'keep-left': ['Keep left', blue('<g transform="rotate(-135 50 50)"><path class="sg-white-stroke" d="M50 72V34"/><path class="sg-white" d="M50 22L62 38H38z"/></g>')],
    'ahead-only': ['Ahead only', blue(arrowW(0))],
    'turn-right-only': ['Turn right only', blue(arrowW(90))],
    'min-speed-60': ['Minimum speed 60', blue('<text class="sg-text-white" x="50" y="62" text-anchor="middle" font-size="34">60</text>')],
    'pedestrian-crossing-ahead': ['Pedestrian crossing ahead', tri(person(50, 66, 1.4) + '<path class="sg-ink" d="M30 78h40v4H30z"/>')],
    'children': ['Children / school ahead', tri(person(42, 68, 1.1) + person(58, 70, 0.9))],
    'traffic-signals-ahead': ['Traffic signals ahead', tri('<rect class="sg-ink" x="42" y="38" width="16" height="40" rx="3"/><circle class="sg-red" cx="50" cy="46" r="4"/><circle class="sg-amber" cx="50" cy="58" r="4"/><circle class="sg-green" cx="50" cy="70" r="4"/>')],
    'roundabout-ahead': ['Roundabout ahead', tri('<g class="sg-ink-stroke"><path d="M50 46a12 12 0 0110 6"/><path d="M61 64a12 12 0 01-11 6"/><path d="M39 64a12 12 0 010-12"/></g>')],
    'slippery-road': ['Slippery road', tri(car(50, 56, 'sg-ink') + '<path class="sg-ink-stroke" d="M38 78c4-6 8 2 12-4M54 78c4-6 8 2 12-4"/>')],
    'camels': ['Camels crossing', tri('<path class="sg-ink" d="M30 74l3-14c2-8 8-10 12-4l3 4 4-8c3-4 8-3 9 2l2 8h6l1 4-6 2-3 6v6h-3v-6h-14v6h-3v-6z"/>')],
    'speed-bump': ['Speed bump ahead', tri('<path class="sg-ink" d="M28 76c8 0 12-14 22-14s14 14 22 14z"/>')],
    'two-way': ['Two-way traffic', tri('<g transform="translate(-9 6) scale(.6) translate(33 30)">' + arrow(0) + '</g><g transform="translate(9 6) scale(.6) translate(33 30)">' + arrow(180) + '</g>')],
    'road-narrows': ['Road narrows', tri('<path class="sg-ink-stroke" d="M38 80V64l6-12V40M62 80V64l-6-12V40"/>')],
    'dangerous-bend-right': ['Bend to the right', tri('<path class="sg-ink-stroke" d="M44 80V58c0-8 12-8 12-16"/><path class="sg-ink" d="M56 32l8 12H48z"/>')],
    'hospital': ['Hospital', '<rect class="sg-blue" x="8" y="8" width="84" height="84" rx="8"/><rect class="sg-white" x="22" y="22" width="56" height="56" rx="4"/><path class="sg-red" d="M44 30h12v14h14v12H56v14H44V56H30V44h14z"/>'],
    'parking': ['Parking', '<rect class="sg-blue" x="8" y="8" width="84" height="84" rx="8"/><text class="sg-text-white" x="50" y="72" text-anchor="middle" font-size="58">P</text>'],
    'one-way': ['One-way road', '<rect class="sg-blue" x="8" y="30" width="84" height="40" rx="4"/><path class="sg-white" d="M18 44h46V36l18 14-18 14v-8H18z"/>'],
    'u-turn-allowed': ['U-turn permitted', blue('<path class="sg-white-stroke" d="M62 74V44a12 12 0 00-24 0v12"/><path class="sg-white" d="M38 68l-10-14h20z"/>')]
  }
  // speed limit signs: red ring with the number
  ;[40, 60, 80, 100, 120, 140].forEach(function (n) { S['speed-' + n] = ['Speed limit ' + n, ring('<text class="sg-text-ink" x="50" y="' + (n >= 100 ? 62 : 64) + '" text-anchor="middle" font-size="' + (n >= 100 ? 30 : 36) + '">' + n + '</text>')] })
  var ID = {
    'stop': 'Berhenti', 'give-way': 'Beri jalan', 'no-entry': 'Dilarang masuk', 'no-u-turn': 'Dilarang putar balik',
    'no-left-turn': 'Dilarang belok kiri', 'no-right-turn': 'Dilarang belok kanan', 'no-overtaking': 'Dilarang menyalip',
    'no-parking': 'Dilarang parkir', 'no-stopping': 'Dilarang berhenti', 'no-horn': 'Dilarang klakson',
    'no-pedestrians': 'Pejalan kaki dilarang', 'no-trucks': 'Kendaraan berat dilarang', 'roundabout': 'Bundaran (wajib)',
    'keep-right': 'Lewat kanan', 'keep-left': 'Lewat kiri', 'ahead-only': 'Wajib lurus', 'turn-right-only': 'Wajib belok kanan',
    'min-speed-60': 'Kecepatan minimum 60', 'pedestrian-crossing-ahead': 'Penyeberangan di depan', 'children': 'Anak-anak / sekolah',
    'traffic-signals-ahead': 'Lampu lalu lintas di depan', 'roundabout-ahead': 'Bundaran di depan', 'slippery-road': 'Jalan licin',
    'camels': 'Unta menyeberang', 'speed-bump': 'Polisi tidur', 'two-way': 'Lalu lintas dua arah', 'road-narrows': 'Jalan menyempit',
    'dangerous-bend-right': 'Tikungan ke kanan', 'hospital': 'Rumah sakit', 'parking': 'Tempat parkir', 'one-way': 'Jalan satu arah',
    'u-turn-allowed': 'Boleh putar balik'
  }
  var api = {
    keys: Object.keys(S),
    label: function (k) { return S[k] ? S[k][0] : '' },
    labelId: function (k) { return ID[k] || (/^speed-(\d+)$/.test(k) ? 'Batas kecepatan ' + k.slice(6) : '') },
    // PRD-59B §8: the real UAE artwork (games/uae/signs/<code>.webp) when one exists for this key, else the drawn sign
    realCode: function (k) { var R = root.UAESignsReal, C = root.UAESignCredits; var c = R && R.keymap[k]; return c && C && C[c] ? c : '' },
    img: function (code, alt) { return '<img class="u-sign-img" src="uae/signs/' + encodeURIComponent(code) + '.webp" alt="' + String(alt).replace(/"/g, '&quot;') + '" width="160" height="160" decoding="async">' },
    // 'ae:<code>' names a real sign directly (questions about signs that exist only in the UAE set)
    // alt overrides the name: a question must not read its own answer to a screen reader (audit U-10)
    show: function (k, alt) {
      var R = root.UAESignsReal
      if (/^ae:/.test(k)) { var x = R && R.byCode[k.slice(3)]; return x ? api.img(x.code, alt || x.en) : '' }
      var c = api.realCode(k); return c ? api.img(c, alt || (S[k] ? S[k][0] : k)) : api.svg(k, alt)
    },
    svg: function (k, alt) { return S[k] ? W(S[k][1], alt || S[k][0]) : '' }
  }
  root.UAESigns = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})(typeof window !== 'undefined' ? window : globalThis)
