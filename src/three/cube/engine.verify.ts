/**
 * Verificación del motor contra cubejs. No forma parte del build de la app;
 * se ejecuta a mano:  pnpm verify:cube
 *
 * Idea: si mi motor implementa los MISMOS movimientos que cubejs, entonces la
 * solución que devuelve cubejs para una mezcla dada debe resolver también mi
 * cubo. Esto valida la convención de giros sin necesidad de mapear "facelets".
 */
import Cube from 'cubejs'

declare const process: { exit(code: number): never }
import {
  applyMove,
  createSolved,
  isSolved,
  IDENTITY,
  matMul,
  moveMatrix,
  movesToString,
  parseMoves,
  scramble,
  FACES,
  type Cubie,
  type Move,
} from './engine'

let failures = 0
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures++
    console.error('  ✘ ' + msg)
  }
}

// 1) Propiedades de grupo del motor (sin cubejs).
console.log('1) Propiedades de grupo del motor')
for (const face of FACES) {
  // Una cara aplicada 4 veces = identidad.
  let m = moveMatrix({ face, power: 1 })
  m = matMul(moveMatrix({ face, power: 1 }), m)
  m = matMul(moveMatrix({ face, power: 1 }), m)
  m = matMul(moveMatrix({ face, power: 1 }), m)
  check(
    m.every((v, i) => v === IDENTITY[i]),
    `${face}^4 debería ser identidad`,
  )
}
// (R U R' U')^6 = identidad
{
  let cubies = createSolved()
  const seq = parseMoves("R U R' U'")
  for (let i = 0; i < 6; i++) for (const mv of seq) cubies = applyMove(cubies, mv)
  check(isSolved(cubies), "(R U R' U')^6 debería dejar el cubo resuelto")
}

// 2) Comprobación cruzada contra cubejs.
console.log('2) Comprobación cruzada motor ⇄ cubejs (solver de Kociemba)')
console.log('   inicializando solver de cubejs…')
const t0 = Date.now()
Cube.initSolver()
console.log(`   solver listo en ${Date.now() - t0} ms`)

const TRIALS = 50
let totalSolutionMoves = 0
for (let i = 0; i < TRIALS; i++) {
  const scr: Move[] = scramble(25)

  // cubejs: aplica la mezcla y resuelve.
  const cube = new Cube()
  cube.move(movesToString(scr))
  const solutionStr: string = cube.solve()
  totalSolutionMoves += solutionStr.trim() ? solutionStr.trim().split(/\s+/).length : 0

  // cubejs debe quedar resuelto tras su propia solución.
  const cube2 = new Cube()
  cube2.move(movesToString(scr))
  cube2.move(solutionStr)
  check(cube2.isSolved(), `cubejs no se resolvió con su solución (trial ${i})`)

  // Mi motor: aplica mezcla + solución de cubejs y debe quedar resuelto.
  let cubies: Cubie[] = createSolved()
  for (const mv of scr) cubies = applyMove(cubies, mv)
  check(!isSolved(cubies), `la mezcla no debería dejar resuelto el motor (trial ${i})`)
  for (const mv of parseMoves(solutionStr)) cubies = applyMove(cubies, mv)
  check(isSolved(cubies), `el motor NO se resolvió con la solución de cubejs (trial ${i})`)
}

console.log(
  `   ${TRIALS} mezclas probadas · media ${(totalSolutionMoves / TRIALS).toFixed(1)} mov/solución`,
)

if (failures === 0) {
  console.log('\n✓ TODO OK — el motor coincide con cubejs.')
  process.exit(0)
} else {
  console.error(`\n✘ ${failures} comprobaciones fallaron.`)
  process.exit(1)
}
