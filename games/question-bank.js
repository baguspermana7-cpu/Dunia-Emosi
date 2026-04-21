/**
 * QuestionBank — shared quiz question source for Dunia Emosi games.
 *
 * Consumers: G22 Monster Candy (primary), and any future game that
 * needs a cached pool of kid-appropriate questions across categories.
 *
 * Usage:
 *   QuestionBank.pick('math')         // random question from math pool
 *   QuestionBank.get('warna', 5)       // 5 random questions (no repeat in same call)
 *   QuestionBank.wrongAnswers('warna', correct, 3)   // 3 plausible wrong answers
 *   QuestionBank.categories             // ['math','warna','hewan','buah']
 *
 * Every question: { q: string, a: string|number }
 *
 * Extensible: call `QuestionBank.extend('math', [...])` to append at runtime.
 */
(function(global){
  'use strict'

  const POOLS = {
    math: [
      {q:'1+1',a:2},{q:'2+1',a:3},{q:'1+3',a:4},{q:'2+2',a:4},{q:'3+1',a:4},
      {q:'2+3',a:5},{q:'4+1',a:5},{q:'3+2',a:5},{q:'5-2',a:3},{q:'4-1',a:3},
      {q:'3+3',a:6},{q:'5+1',a:6},{q:'4+2',a:6},{q:'6-3',a:3},{q:'5-3',a:2},
      {q:'4+3',a:7},{q:'5+2',a:7},{q:'6+1',a:7},{q:'7-2',a:5},{q:'6-2',a:4},
      {q:'4+4',a:8},{q:'5+3',a:8},{q:'6+2',a:8},{q:'8-3',a:5},{q:'7-3',a:4},
      {q:'5+4',a:9},{q:'6+3',a:9},{q:'7+2',a:9},{q:'9-4',a:5},{q:'8-5',a:3},
      {q:'5+5',a:10},{q:'6+4',a:10},{q:'7+3',a:10},{q:'10-3',a:7},{q:'10-4',a:6},
      {q:'7+4',a:11},{q:'8+3',a:11},{q:'9+2',a:11},{q:'11-5',a:6},{q:'11-3',a:8},
      {q:'7+5',a:12},{q:'8+4',a:12},{q:'6+6',a:12},{q:'12-5',a:7},{q:'12-4',a:8},
      {q:'8+5',a:13},{q:'9+4',a:13},{q:'7+6',a:13},{q:'13-6',a:7},{q:'13-5',a:8},
    ],
    warna: [
      {q:'Warna langit?',a:'Biru'},{q:'Warna daun?',a:'Hijau'},{q:'Warna matahari?',a:'Kuning'},
      {q:'Warna darah?',a:'Merah'},{q:'Warna awan?',a:'Putih'},{q:'Warna batu bara?',a:'Hitam'},
      {q:'Warna jeruk?',a:'Oranye'},{q:'Warna terong?',a:'Ungu'},{q:'Warna cokelat?',a:'Cokelat'},
    ],
    hewan: [
      {q:'Suara kucing?',a:'Meong'},{q:'Suara anjing?',a:'Guk-guk'},{q:'Suara sapi?',a:'Moo'},
      {q:'Suara ayam?',a:'Kukuruyuk'},{q:'Suara bebek?',a:'Kwek'},{q:'Suara kambing?',a:'Mbee'},
      {q:'Hewan terbesar?',a:'Paus Biru'},{q:'Burung tak bisa terbang?',a:'Penguin'},{q:'Raja hutan?',a:'Singa'},
    ],
    buah: [
      {q:'Buah kuning panjang?',a:'Pisang'},{q:'Buah merah kecil?',a:'Ceri'},{q:'Buah hijau besar?',a:'Semangka'},
      {q:'Buah oranye bulat?',a:'Jeruk'},{q:'Buah ungu kecil?',a:'Anggur'},{q:'Buah merah hati?',a:'Stroberi'},
    ],
  }

  function normCat(cat){
    if (!cat) return 'math'
    const k = String(cat).toLowerCase()
    // Accept both Indonesian and English aliases.
    const aliases = {
      matematika:'math', math:'math',
      warna:'warna', color:'warna', colour:'warna',
      hewan:'hewan', animal:'hewan', binatang:'hewan',
      buah:'buah', fruit:'buah',
    }
    return aliases[k] || (POOLS[k] ? k : 'math')
  }

  function pick(cat){
    const pool = POOLS[normCat(cat)]
    return pool[Math.floor(Math.random() * pool.length)]
  }

  function get(cat, count){
    const pool = POOLS[normCat(cat)]
    const n = Math.min(Math.max(1, count|0 || 1), pool.length)
    const shuffled = pool.slice().sort(() => Math.random() - 0.5)
    return shuffled.slice(0, n)
  }

  function wrongAnswers(cat, correct, count){
    const pool = POOLS[normCat(cat)]
    const n = Math.max(1, count|0 || 3)
    const others = pool
      .map(e => e.a)
      .filter(a => a !== correct)
    const shuffled = others.slice().sort(() => Math.random() - 0.5)
    return shuffled.slice(0, n)
  }

  function extend(cat, items){
    const key = normCat(cat)
    if (!Array.isArray(items)) return
    POOLS[key] = (POOLS[key] || []).concat(items.filter(x => x && 'q' in x && 'a' in x))
  }

  const QuestionBank = {
    pick,
    get,
    wrongAnswers,
    extend,
    get categories(){ return Object.keys(POOLS) },
    _pools: POOLS, // escape hatch for legacy code
  }

  global.QuestionBank = QuestionBank
  if (typeof module !== 'undefined' && module.exports) module.exports = QuestionBank
})(typeof window !== 'undefined' ? window : globalThis);
