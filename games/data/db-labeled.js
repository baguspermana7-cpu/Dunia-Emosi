/* ============================================================================
 * db-labeled.js — curated Indonesian labels for a subset of the assets/db sprites
 * (window.DBLabeled). Turns the unlabeled A-356 art into answerable quiz content
 * for the "Tebak" (guess) games — owner: "100 hewan/buah bisa jadi question".
 *
 * Only CONFIDENT, unambiguous, kid-recognizable items are labeled (educational —
 * never teach a wrong name). Each entry: { cat, n, name }  → sprite path via
 * DBSprites.path(cat, n). Grouped by topic so distractors come from the same group.
 *
 *   DBLabeled.groups()            → ['hewan','buah','makanan','benda']
 *   DBLabeled.pick(group)         → { cat, n, name, src }  (random item)
 *   DBLabeled.question(group)     → { src, answer, choices:[4 names] }  (ready quiz)
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  if (W.DBLabeled) return

  // group → [ [spriteId, 'Nama'], ... ]  (cat is the DB category for that group)
  var DATA = {
    hewan: { cat: 'creatures', items: [
      [1,'Ayam'],[2,'Bebek'],[3,'Angsa'],[4,'Kalkun'],[5,'Burung Hantu'],[6,'Elang'],
      [7,'Flamingo'],[8,'Merak'],[9,'Burung Beo'],[10,'Penguin'],[12,'Anjing'],[13,'Kelinci'],
      [14,'Tikus'],[16,'Hamster'],[18,'Tupai'],[21,'Rubah'],[23,'Serigala'],[24,'Beruang'],
      [26,'Panda'],[27,'Koala'],[28,'Singa'],[29,'Harimau'],[30,'Macan Tutul'],[31,'Gajah'],
      [32,'Jerapah'],[33,'Zebra'],[34,'Kuda'],[37,'Sapi'],[38,'Kambing'],[40,'Domba'],
      [41,'Babi'],[42,'Monyet'],[43,'Gorila'],[44,'Kanguru'],[45,'Unta'],[46,'Landak'],
      [47,'Rusa'],[48,'Kuda Laut'],[51,'Ikan'],[52,'Hiu'],[53,'Lumba-lumba'],[54,'Gurita'],
      [55,'Kepiting'],[56,'Ubur-ubur'],[57,'Kura-kura'],[58,'Katak'],[59,'Buaya'],[60,'Siput']
    ]},
    buah: { cat: 'objects', items: [
      [1,'Apel'],[2,'Pisang'],[3,'Jeruk'],[4,'Mangga'],[5,'Anggur'],[6,'Semangka'],
      [7,'Nanas'],[8,'Stroberi'],[10,'Pir'],[11,'Ceri'],[12,'Kiwi'],[13,'Alpukat'],
      [15,'Manggis'],[16,'Kelapa'],[17,'Pepaya'],[18,'Durian']
    ]},
    makanan: { cat: 'objects', items: [
      [21,'Roti'],[22,'Kue'],[23,'Donat'],[24,'Cupcake'],[25,'Es Krim'],[26,'Permen'],
      [27,'Cokelat'],[28,'Pizza'],[29,'Burger'],[30,'Telur'],[32,'Susu'],[33,'Keju'],
      [37,'Kopi'],[39,'Salad']
    ]},
    benda: { cat: 'objects', items: [
      [41,'Bola'],[42,'Buku'],[45,'Sendok'],[46,'Jam Weker'],[47,'Lampu'],[48,'Kunci'],
      [49,'Payung'],[50,'Tas'],[51,'Topi'],[52,'Sepatu'],[53,'Baju'],[54,'Kacamata'],
      [56,'Gunting'],[57,'Pensil'],[59,'Balon'],[60,'Kado'],[63,'Kursi'],[64,'Meja'],
      [68,'Boneka Beruang'],[71,'Palu'],[73,'Gergaji'],[82,'Robot'],[92,'Bunga'],[98,'Pohon']
    ]},
    kendaraan: { cat: 'vehicles', items: [
      [4,'Taksi'],[10,'Ambulans'],[18,'Mobil Polisi'],[19,'Mobil Pemadam'],[23,'Traktor'],
      [28,'Sepeda'],[30,'Sepeda Motor'],[41,'Mobil'],[46,'Truk'],[47,'Truk Molen'],
      [50,'Ekskavator'],[51,'Kereta Api'],[54,'Perahu Layar'],[55,'Kapal'],[56,'Kapal Selam'],
      [57,'Pesawat'],[58,'Helikopter'],[59,'Balon Udara'],[60,'Roket']
    ]},
    sains: { cat: 'science', items: [
      [1,'Matahari'],[2,'Bulan'],[3,'Bintang'],[4,'Bumi'],[8,'Teleskop'],[10,'Magnet'],
      [11,'Baterai'],[16,'Gunung Berapi'],[17,'Gunung'],[18,'Pelangi'],[19,'Awan'],
      [22,'Salju'],[26,'Api'],[27,'Es'],[34,'Kaktus'],[35,'Jamur']
    ]}
  }

  var GROUP_LABEL = { hewan: 'Hewan', buah: 'Buah', makanan: 'Makanan', benda: 'Benda', kendaraan: 'Kendaraan', sains: 'Sains' }

  function groups () { var k = []; for (var g in DATA) if (DATA.hasOwnProperty(g)) k.push(g); return k }
  function label (g) { return GROUP_LABEL[g] || g }
  function _src (cat, n) {
    if (W.DBSprites && W.DBSprites.path) return W.DBSprites.path(cat, n)
    var base = (location.pathname.indexOf('/Dunia-Emosi/') === 0) ? '/Dunia-Emosi/' : '/'
    return base + 'assets/db/' + cat + '/' + ('000' + n).slice(-3) + '.webp'
  }
  function rnd (arr) { return arr[Math.floor(Math.random() * arr.length)] }

  function pick (g) {
    var grp = DATA[g]; if (!grp) return null
    var it = rnd(grp.items)
    return { cat: grp.cat, n: it[0], name: it[1], src: _src(grp.cat, it[0]) }
  }

  // ready-made 4-choice picture question for the guess games
  function question (g) {
    var grp = DATA[g]; if (!grp || grp.items.length < 4) return null
    var pool = grp.items.slice()
    var ans = rnd(pool)
    var choices = [ans[1]]
    var guard = 0
    while (choices.length < 4 && guard++ < 50) {
      var d = rnd(pool)[1]
      if (choices.indexOf(d) === -1) choices.push(d)
    }
    for (var i = choices.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = choices[i]; choices[i] = choices[j]; choices[j] = t }
    return { src: _src(grp.cat, ans[0]), answer: ans[1], choices: choices, group: g }
  }

  // flat list of every labeled item: { id, group, cat, n, name, src }
  function all () {
    var out = []
    for (var g in DATA) { if (!DATA.hasOwnProperty(g)) continue
      var grp = DATA[g]
      for (var i = 0; i < grp.items.length; i++) {
        var it = grp.items[i]
        out.push({ id: 'db-' + g + '-' + it[0], group: g, cat: grp.cat, n: it[0], name: it[1], src: _src(grp.cat, it[0]) })
      }
    }
    return out
  }

  // P7 — additive helpers (no change to existing API): name lookup, cross-group
  // search, and a shadow-flagged question for silhouette games (g12).
  function byName (g, name) {
    var grp = DATA[g]; if (!grp) return null
    for (var i = 0; i < grp.items.length; i++) if (grp.items[i][1] === name) {
      return { cat: grp.cat, n: grp.items[i][0], name: name, src: _src(grp.cat, grp.items[i][0]) }
    }
    return null
  }
  function find (name) {
    for (var g in DATA) { if (!DATA.hasOwnProperty(g)) continue
      var r = byName(g, name); if (r) { r.group = g; return r }
    }
    return null
  }
  function silhouette (g) {
    var q = question(g); if (!q) return null
    q.shadow = true; return q
  }

  W.DBLabeled = {
    groups: groups, label: label, pick: pick, question: question, all: all,
    byName: byName, find: find, silhouette: silhouette,
    count: function (g) { return DATA[g] ? DATA[g].items.length : 0 },
    total: function () { var t = 0; for (var g in DATA) if (DATA.hasOwnProperty(g)) t += DATA[g].items.length; return t },
    _data: DATA
  }
})();
