// Domain tests for games/data/berhitung-engine.js (PRD §16).
//
// The PRD's rule is that a screen which merely looks right is not done: the
// arithmetic has to be proven. So this runs property tests over tens of
// thousands of generated questions, not a handful of examples, and checks the
// identities that make each generator trustworthy -- a division whose divisor
// could be zero or whose answer is not whole is a bug no amount of UI polish
// fixes.
import B from '../games/data/berhitung-engine.js'

let pass = 0
const fails = []
const ok = (cond, msg) => { if (cond) pass++; else { fails.push(msg); console.log('FAIL  ' + msg) } }
const group = name => console.log('\n── ' + name)

// ── determinism ─────────────────────────────────────────────────────────────
group('determinism')
{
  const cfg = { operation: 'mixed', difficulty: 'medium', questionCount: 20, seed: 'kereta-42' }
  const a = B.buildSession(cfg), b = B.buildSession(cfg)
  ok(JSON.stringify(a.questions) === JSON.stringify(b.questions), 'same seed + config reproduces the same questions')
  const c = B.buildSession({ ...cfg, seed: 'kereta-43' })
  ok(JSON.stringify(a.questions) !== JSON.stringify(c.questions), 'a different seed gives a different worksheet')
  ok(a.generatorVersion === B.GENERATOR_VERSION, 'the session records its generator version')
}

// ── property tests over the generators ──────────────────────────────────────
group('generators (property tests)')
{
  const ops = ['add', 'subtract', 'multiply', 'divide', 'word', 'mixed']
  const diffs = ['easy', 'medium', 'hard']
  let checked = 0
  let badAnswer = 0, badDivisor = 0, negative = 0, dup = 0, nonInt = 0
  for (const operation of ops) {
    for (const difficulty of diffs) {
      for (let run = 0; run < 40; run++) {
        const s = B.buildSession({ operation, difficulty, questionCount: 20, seed: operation + difficulty + run })
        const sigs = new Set()
        for (const q of s.questions) {
          checked++
          if (sigs.has(q.signature)) dup++
          sigs.add(q.signature)
          if (!Number.isInteger(q.expected)) nonInt++
          const [x, y] = q.operands
          let truth
          const kind = q.operation === 'word' ? q.metadata.innerOp : q.operation
          if (kind === 'add') truth = q.operands.reduce((a, b) => a + b, 0)
          else if (kind === 'subtract') truth = x - y
          else if (kind === 'multiply') truth = x * y
          else if (kind === 'divide') { if (y === 0) badDivisor++; truth = x / y }
          if (truth !== q.expected) badAnswer++
          if (kind === 'divide' && x % y !== 0) badAnswer++
          if (kind === 'subtract' && q.expected < 0) negative++
        }
      }
    }
  }
  console.log(`      checked ${checked} generated questions`)
  ok(checked > 10000, `property run covers a real sample (${checked})`)
  ok(badAnswer === 0, `every stated answer is the true answer (${badAnswer} bad)`)
  ok(nonInt === 0, `every answer is an integer (${nonInt} bad)`)
  ok(badDivisor === 0, `no divisor is ever zero (${badDivisor} bad)`)
  ok(negative === 0, `subtraction never goes negative under the default policy (${negative} bad)`)
  ok(dup === 0, `no duplicate question inside one set (${dup} dups)`)
}

// ── carry / borrow constraints ──────────────────────────────────────────────
group('carry and borrow constraints')
{
  ok(B.carryColumns(18, 5).join() === '0', 'a carry out of the units column is detected')
  ok(B.carryColumns(11, 11).length === 0, 'no carry is reported when there is none')
  ok(B.carryColumns(99, 1).join() === '0,1', 'a carry chain across two columns is detected')
  ok(B.borrowColumns(52, 8).join() === '0', 'a borrow into the units column is detected')
  ok(B.borrowColumns(100, 1).join() === '0,1', 'a borrow across a zero is detected')

  let carryViolations = 0, borrowViolations = 0
  for (let run = 0; run < 60; run++) {
    const noCarry = B.buildSession({ operation: 'add', difficulty: 'easy', questionCount: 10, seed: 'nc' + run, carryPolicy: 'none' })
    for (const q of noCarry.questions) if (B.carryColumns(q.operands[0], q.operands[1]).length) carryViolations++
    const noBorrow = B.buildSession({ operation: 'subtract', difficulty: 'medium', questionCount: 10, seed: 'nb' + run, borrowPolicy: 'none' })
    for (const q of noBorrow.questions) if (B.borrowColumns(q.operands[0], q.operands[1]).length) borrowViolations++
  }
  ok(carryViolations === 0, `"tanpa menyimpan" never produces a carry (${carryViolations} violations)`)
  ok(borrowViolations === 0, `"tanpa meminjam" never produces a borrow (${borrowViolations} violations)`)

  let oneCarry = 0, wrong = 0
  for (let run = 0; run < 40; run++) {
    const s = B.buildSession({ operation: 'add', difficulty: 'medium', questionCount: 8, seed: 'oc' + run, carryPolicy: 'one' })
    for (const q of s.questions) { oneCarry++; if (B.carryColumns(q.operands[0], q.operands[1]).length !== 1) wrong++ }
  }
  ok(wrong === 0, `"satu kali menyimpan" always produces exactly one carry (${wrong}/${oneCarry} wrong)`)
}

// ── digit-length mode ───────────────────────────────────────────────────────
group('digit-length mode (the owner\'s "2 digit")')
{
  const len = n => String(Math.abs(n)).length
  let wrong = 0, checked = 0
  for (const digits of [1, 2, 3]) {
    for (const operation of ['add', 'subtract']) {
      for (let run = 0; run < 25; run++) {
        const s = B.buildSession({ operation, difficulty: 'medium', questionCount: 10, seed: 'dg' + digits + operation + run, digits })
        for (const q of s.questions) { checked++; for (const o of q.operands) if (len(o) !== digits) wrong++ }
      }
    }
  }
  ok(wrong === 0, `every operand has exactly the digits asked for (${wrong} wrong of ${checked})`)

  let mulWrong = 0, divWrong = 0, divInexact = 0
  for (let run = 0; run < 25; run++) {
    const m = B.buildSession({ operation: 'multiply', difficulty: 'medium', questionCount: 10, seed: 'md' + run, digits: 2 })
    for (const q of m.questions) if (len(q.operands[1]) !== 2) mulWrong++
    const d = B.buildSession({ operation: 'divide', difficulty: 'medium', questionCount: 10, seed: 'dd' + run, digits: 2 })
    for (const q of d.questions) {
      if (len(q.expected) !== 2) divWrong++
      if (q.operands[0] % q.operands[1] !== 0) divInexact++
    }
  }
  ok(mulWrong === 0, `2-digit multiplication multiplies a 2-digit number (${mulWrong} wrong)`)
  ok(divWrong === 0, `2-digit division ANSWERS in two digits (${divWrong} wrong)`)
  ok(divInexact === 0, `and stays exact -- no remainders sneak in with the digit constraint (${divInexact})`)

  // the digit length must not quietly cancel the other constraints
  let carried = 0
  for (let run = 0; run < 25; run++) {
    const s = B.buildSession({ operation: 'add', difficulty: 'medium', questionCount: 8, seed: 'dc' + run, digits: 2, carryPolicy: 'none' })
    for (const q of s.questions) if (B.carryColumns(q.operands[0], q.operands[1]).length) carried++
  }
  ok(carried === 0, `2 digit + "tanpa menyimpan" still never carries (${carried} violations)`)

  let three = 0
  for (let run = 0; run < 25; run++) {
    const s = B.buildSession({ operation: 'add', difficulty: 'hard', questionCount: 10, seed: 'd3' + run, digits: 2 })
    for (const q of s.questions) if (q.operands.length !== 2) three++
  }
  ok(three === 0, `a digit length turns off the three-operand flourish (${three} slipped through)`)

  ok(B.validateConfig({ operation: 'add', difficulty: 'easy', questionCount: 10, digits: 9 }).ok === false, 'an impossible digit length is refused')
  ok(B.digitRange(2).join('-') === '10-99' && B.digitRange(1).join('-') === '1-9', 'digitRange maps to the ranges a teacher would write')
}

// ── multiplication tables ───────────────────────────────────────────────────
group('multiplication tables')
{
  let outside = 0
  for (let run = 0; run < 40; run++) {
    const s = B.buildSession({ operation: 'multiply', difficulty: 'medium', questionCount: 12, seed: 'mt' + run, tables: [6, 7] })
    for (const q of s.questions) if (![6, 7].includes(q.metadata.table)) outside++
  }
  ok(outside === 0, `a chosen table set is respected (${outside} outside)`)
}

// ── answer parsing ──────────────────────────────────────────────────────────
group('answer parsing')
{
  ok(B.parseAnswer('').empty === true, 'empty input is empty, not zero')
  ok(B.parseAnswer('   ').empty === true, 'whitespace is empty, not zero')
  ok(B.parseAnswer('0').value === 0, 'a typed zero IS zero')
  ok(B.parseAnswer('1e3').ok === false, 'scientific notation is rejected')
  ok(B.parseAnswer('12.5').ok === false, 'a decimal is rejected in integer mode')
  ok(B.parseAnswer('007').value === 7, 'leading zeros are accepted')
  ok(B.parseAnswer('-5').value === -5, 'a negative is parsed')
  ok(B.parseAnswer('9'.repeat(20)).ok === false, 'an unsafe integer is rejected')
  const q = { expected: 42 }
  ok(B.grade(q, '42').correct === true && B.grade(q, '43').correct === false, 'grading compares integers')
  ok(B.grade(q, '').correct === false, 'an empty answer is never correct')
}

// ── hints ───────────────────────────────────────────────────────────────────
group('hints')
{
  const s = B.buildSession({ operation: 'add', difficulty: 'medium', questionCount: 4, seed: 'hint' })
  const q = s.questions[0]
  const levels = [0, 1, 2, 3].map(l => B.hint(q, l))
  ok(new Set(levels).size === 4, 'each hint level says something different')
  ok(!levels[0].includes(String(q.expected)), 'the first hint does not reveal the answer')
  ok(levels[3].includes(String(q.expected)), 'the last hint works the answer out')
  const d = B.buildSession({ operation: 'divide', difficulty: 'easy', questionCount: 3, seed: 'hd' }).questions[0]
  ok(B.hint(d, 1).includes(String(d.operands[1])), 'the division hint names the divisor')
}

// ── scoring and mastery ─────────────────────────────────────────────────────
group('scoring and mastery')
{
  ok(B.xpFor({ attemptNumber: 1, hintLevel: 0 }) === 10, 'a first-try answer is worth the most XP')
  ok(B.xpFor({ attemptNumber: 2, hintLevel: 0 }) === 7, 'a retry is worth less')
  ok(B.xpFor({ attemptNumber: 1, hintLevel: 2 }) === 5, 'an assisted answer is worth less again')
  ok(B.xpFor({ skipped: true }) === 0, 'a skip earns nothing, so skipping cannot be farmed')
  ok(B.xpFor({ revealed: true }) === 0, 'a revealed answer earns nothing')
  ok(B.outcomeOf({ attemptNumber: 1, hintLevel: 1 }) === 'assisted', 'a hint marks the attempt assisted even on the first try')

  const perfect = Array.from({ length: 10 }, () => ({ attemptNumber: 1, hintLevel: 0 }))
  ok(B.updateMastery(0, perfect) === 20, 'one perfect session cannot jump mastery to the top')
  let m = 0
  for (let i = 0; i < 25; i++) m = B.updateMastery(m, perfect)
  ok(m >= 95, `sustained perfect play does reach mastery (${m})`)
  ok(B.updateMastery(100, [{ skipped: true }]) === 80, 'skipping a whole session pulls mastery down but not to zero')
  ok(B.masteryLabel(10) === 'Belajar' && B.masteryLabel(50) === 'Berkembang' && B.masteryLabel(90) === 'Mantap', 'the child-facing labels bucket correctly')

  ok(B.recommendHarder({ recentWindow: Array(19).fill('first') }) === false, 'no promotion on a small sample')
  ok(B.recommendHarder({ recentWindow: Array(20).fill('first') }) === true, 'promotion is suggested on a real sample')
  ok(B.recommendHarder({ recentWindow: [...Array(16).fill('first'), ...Array(4).fill('retry')] }) === false, 'promotion needs 85% first-try, not just volume')
}

// ── config validation ───────────────────────────────────────────────────────
group('config validation')
{
  ok(B.validateConfig({ operation: 'nope', difficulty: 'easy', questionCount: 10 }).ok === false, 'an unknown operation is refused')
  ok(B.validateConfig({ operation: 'add', difficulty: 'extreme', questionCount: 10 }).ok === false, 'an unknown difficulty is refused')
  ok(B.validateConfig({ operation: 'add', difficulty: 'easy', questionCount: 0 }).ok === false, 'zero questions is refused')
  ok(B.validateConfig({ operation: 'multiply', difficulty: 'easy', questionCount: 10, tables: [] }).ok === false, 'an empty table set is refused')
  ok(B.validateConfig({ operation: 'add', difficulty: 'easy', questionCount: 10 }).ok === true, 'a sane config is accepted')
  let threw = false
  try { B.buildSession({ operation: 'add', difficulty: 'easy', questionCount: 500 }) } catch (_) { threw = true }
  ok(threw, 'an impossible request fails loudly instead of relaxing the constraint')
}

console.log(`\n${pass} passed, ${fails.length} failed`)
process.exit(fails.length ? 1 : 0)
