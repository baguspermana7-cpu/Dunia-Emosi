/* PRD-59 L23 pattern rules: [RegExp on the whole Indonesian text, function or replacement]. First match that does
   not return null wins. `this` is the i18n api, so a rule translates its parts with this.core(). A rule that joins
   parts declines (null) unless every part has an English text: half a sentence is never shown translated. */
var MON = { Jan: 'Jan', Feb: 'Feb', Mar: 'Mar', Apr: 'Apr', Mei: 'May', Jun: 'Jun', Jul: 'Jul', Agu: 'Aug', Sep: 'Sep', Okt: 'Oct', Nov: 'Nov', Des: 'Dec' }
var DATE = '(\\d{1,2}) (Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des) (\\d{4})'
function dates(s) { return s.replace(new RegExp(DATE, 'g'), function (_, d, m, y) { return d + ' ' + MON[m] + ' ' + y }) }
function all(api, parts, glue) {
  var out = []
  for (var i = 0; i < parts.length; i++) {
    var e = /[A-Za-z]/.test(parts[i]) ? api.core(parts[i]) : parts[i]   // a bare number or range needs no English
    if (e == null) return null
    out.push(e)
  }
  return out.join(glue)
}
var rules = [
  [new RegExp('^' + DATE + '$'), function (s) { return dates(s) }],
  [new RegExp('^' + DATE + ' sampai ' + DATE + '$'), function (s) { return dates(s).replace(' sampai ', ' to ') }],
  // a sentence that carries a date: the date is taken out, the rest is looked up with {tgl} in its place
  [new RegExp(DATE), function (s) {
    var ds = [], k = s.replace(new RegExp(DATE, 'g'), function (m) { ds.push(dates(m)); return '{tgl}' }), e = this.core(k)
    if (e == null) return null
    var i = 0; return e.replace(/\{tgl\}/g, function () { return ds[i++] })
  }],
  [/^Masih menunggu langkah (\d+(?:, \d+)*)$/, 'Still waiting for step $1'],
  [/^Perlu latihan: (.+)\.$/, function (s, x) { var e = this.core(x); return 'Needs practice: ' + (e == null ? x : e) + '.' }],
  [/^Perkiraan format: (.*)$/, function (s, x) { var e = this.core(x); return 'Estimated format: ' + (e == null ? x : e) }],
  [/^dikuasai (\d+) dari (\d+)(?:, (\d+)% benar)?$/, function (s, a, b, c) { return 'mastered ' + a + ' of ' + b + (c == null ? '' : ', ' + c + '% correct') }],
  [/^(\d+) dari (\d+) langkah selesai, kesiapan ujian teori (\d+) persen\.(?: Berikutnya: langkah (\d+), (.+)\.)?$/, function (s, a, b, c, n, t) {
    var e = t == null ? null : this.core(t)
    return a + ' of ' + b + ' steps done, theory test readiness ' + c + ' percent.' + (n == null ? '' : ' Next: step ' + n + ', ' + (e == null ? t : e) + '.')
  }],
  [/^Soal (\d+) dari (\d+)(?:, terjawab (\d+))?$/, function (s, a, b, c) { return 'Question ' + a + ' of ' + b + (c == null ? '' : ', answered ' + c) }],
  [/^Belum tepat\. Jawaban: (.+)$/, 'Not quite. Answer: $1'],
  [/^Jawaban Anda: (.+)$/, 'Your answer: $1'],
  [/^Jawaban benar: (.+)$/, 'Correct answer: $1'],
  [/^Biaya sendiri sekitar (.+) sampai (.+) \(kurs AED ([\d.,]+)\)\.$/, 'Own cost about $1 to $2 (AED rate $3).'],
  [/^(\d+)\. (.+)$/, function (s, n, x) { var e = this.core(x); return e == null ? null : n + '. ' + e }],
  [/^Status langkah(.*)$/, 'Step status$1'],
  [/^Penjelasan: (.+)$/, function (s, x) { var e = this.core(x); return 'Explanation: ' + (e == null ? x : e) }],
  [/^Tunggu langkah (\d+(?:, \d+)*) dulu$/, 'Wait for step $1 first'],
  [/^Tiap anak \((\d+)\), (.+)$/, function (s, n, x) { var e = this.core(x); return e == null ? null : 'Each child (' + n + '), ' + e }],
  [/^\((.+)\)$/, function (s, x) { var e = this.core(x); return e == null ? null : '(' + e + ')' }],
  [/^(.+?): (.+)$/, function (s, a, b) { return all(this, [a, b], ': ') }],
  [/, /, function (s) { return all(this, s.split(', '), ', ') }],
  [/ \+ /, function (s) { return all(this, s.split(' + '), ' + ') }]
]
