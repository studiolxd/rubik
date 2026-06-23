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
  dragToMove,
  isSolved,
  IDENTITY,
  matMul,
  moveMatrix,
  movesToString,
  parseMoves,
  scramble,
  FACES,
  type Cubie,
  type Face,
  type Move,
  type Vec3,
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

// 4) Gesto de arrastre → giro de capa (dragToMove).
// Con la base de cámara igual a los ejes de mundo (camRight=+X, camUp=+Y), un
// arrastre 2D (dx,dy) se vuelve world [dx,-dy,0]. Los (face,prime) esperados se
// derivaron a mano y se contrastan con la intuición física del cubo.
console.log('4) Gesto de arrastre (dragToMove)')
const CAM_R: Vec3 = [1, 0, 0]
const CAM_U: Vec3 = [0, 1, 0]
const drags: {
  desc: string
  normal: Vec3
  pos: Vec3
  dx: number
  dy: number
  expect: { face: Face; prime: boolean } | null
}[] = [
  // Cara de arriba (U), arista frontal (z=+1): arrastrar a los lados gira F.
  {
    desc: 'U front, →',
    normal: [0, 1, 0],
    pos: [0, 1, 1],
    dx: 50,
    dy: 0,
    expect: { face: 'F', prime: false },
  },
  {
    desc: 'U front, ←',
    normal: [0, 1, 0],
    pos: [0, 1, 1],
    dx: -50,
    dy: 0,
    expect: { face: 'F', prime: true },
  },
  // Cara de arriba, arista trasera (z=-1): gira B (sentido opuesto al frontal).
  {
    desc: 'U back, →',
    normal: [0, 1, 0],
    pos: [0, 1, -1],
    dx: 50,
    dy: 0,
    expect: { face: 'B', prime: true },
  },
  // Cara frontal (F), columna derecha (x=+1): arrastrar arriba gira R.
  {
    desc: 'F right, ↑',
    normal: [0, 0, 1],
    pos: [1, 0, 1],
    dx: 0,
    dy: -50,
    expect: { face: 'R', prime: false },
  },
  // Cara derecha (R), franja frontal (z=+1): arrastrar arriba gira F'.
  {
    desc: 'R front, ↑',
    normal: [1, 0, 0],
    pos: [1, 0, 1],
    dx: 0,
    dy: -50,
    expect: { face: 'F', prime: true },
  },
  // Tocar el centro de U (z=0) y arrastrar a los lados sería un slice → null.
  { desc: 'U centro (slice)', normal: [0, 1, 0], pos: [0, 1, 0], dx: 50, dy: 0, expect: null },
]
for (const d of drags) {
  const got = dragToMove(d.normal, d.pos, d.dx, d.dy, CAM_R, CAM_U)
  const ok =
    (got === null && d.expect === null) ||
    (got !== null &&
      d.expect !== null &&
      got.face === d.expect.face &&
      got.prime === d.expect.prime)
  check(
    ok,
    `${d.desc}: esperado ${d.expect ? d.expect.face + (d.expect.prime ? "'" : '') : 'null'}, got ${
      got ? got.face + (got.prime ? "'" : '') : 'null'
    }`,
  )
}

if (failures === 0) {
  console.log('\n✓ TODO OK — el motor coincide con cubejs.')
  process.exit(0)
} else {
  console.error(`\n✘ ${failures} comprobaciones fallaron.`)
  process.exit(1)
}
