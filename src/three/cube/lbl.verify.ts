/**
 * Verificación del solucionador por capas (LBL). No forma parte del build;
 * se ejecuta a mano:  pnpm verify:lbl
 *
 * Fase 0: comprueba los helpers de localización de piezas y los predicados de
 * "paso resuelto" sobre estados conocidos (resuelto, giros sueltos, mezclas).
 */
import { applyMove, createSolved, parseMoves, scramble, type Cubie, type Move } from './engine'
import {
  corners,
  crossSolved,
  currentStep,
  edges,
  findCorner,
  findEdge,
  firstLayerSolved,
  homeColors,
  isHome,
  lastCornersPlaced,
  lastCrossSolved,
  lastFaceSolved,
  secondLayerSolved,
  solveLBL,
  solved,
  stickersOf,
} from './lbl'

declare const Date: { now(): number }

declare const process: { exit(code: number): never }

let failures = 0
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures++
    console.error('  ✘ ' + msg)
  }
}

function apply(cubies: Cubie[], alg: string): Cubie[] {
  let out = cubies
  for (const mv of parseMoves(alg)) out = applyMove(out, mv)
  return out
}

// 1) Conteo de piezas.
console.log('1) Conteo de piezas (resuelto)')
{
  const s = createSolved()
  check(edges(s).length === 12, `debería haber 12 aristas, hay ${edges(s).length}`)
  check(corners(s).length === 8, `debería haber 8 esquinas, hay ${corners(s).length}`)
}

// 2) En el cubo resuelto: todos los predicados true y currentStep === null.
console.log('2) Predicados sobre el cubo resuelto')
{
  const s = createSolved()
  check(crossSolved(s), 'cruz debería estar resuelta')
  check(firstLayerSolved(s), 'primera capa debería estar resuelta')
  check(secondLayerSolved(s), 'segunda capa debería estar resuelta')
  check(lastCrossSolved(s), 'cruz última debería estar resuelta')
  check(lastFaceSolved(s), 'cara última debería estar resuelta')
  check(lastCornersPlaced(s), 'esquinas última deberían estar colocadas')
  check(solved(s), 'el cubo debería estar resuelto')
  check(currentStep(s) === null, `currentStep debería ser null, es ${currentStep(s)}`)
}

// 3) Pegatinas: en el resuelto, color y orientación coinciden.
console.log('3) Pegatinas sobre el cubo resuelto')
{
  const s = createSolved()
  for (const c of [...edges(s), ...corners(s)])
    for (const st of stickersOf(c))
      check(st.color === st.facing, `pegatina ${st.color} debería apuntar a su cara`)
}

// 4) Localización de piezas (round-trip): en el resuelto la pieza está en casa.
console.log('4) Localización de piezas (resuelto)')
{
  const s = createSolved()
  check(isHome(findEdge(s, 'U', 'F')), 'arista UF debería estar en casa')
  check(isHome(findCorner(s, 'U', 'R', 'F')), 'esquina URF debería estar en casa')
  // homeColors coherente con lo buscado.
  check(
    homeColors(findEdge(s, 'U', 'F'))
      .sort()
      .join('') === 'FU',
    'colores de UF',
  )
}

// 5) Un giro U desde resuelto rompe la primera capa → paso 'cruz'.
console.log('5) Giro U desde resuelto')
{
  const s = apply(createSolved(), 'U')
  check(!crossSolved(s), 'U debería romper la cruz blanca (arriba)')
  check(!firstLayerSolved(s), 'U debería romper la primera capa')
  check(currentStep(s) === 'cross', `currentStep debería ser 'cross', es ${currentStep(s)}`)
}

// 6) Un giro D desde resuelto: primera y segunda capa intactas, última capa no.
console.log('6) Giro D desde resuelto')
{
  const s = apply(createSolved(), 'D')
  check(firstLayerSolved(s), 'D no debería tocar la primera capa (arriba)')
  check(secondLayerSolved(s), 'D no debería tocar la segunda capa')
  check(lastCrossSolved(s), 'D mantiene las aristas amarillas mirando abajo')
  check(lastFaceSolved(s), 'D mantiene la cara amarilla orientada')
  check(!lastCornersPlaced(s), 'D mueve las esquinas de la última capa de su sitio')
  check(
    currentStep(s) === 'permute-corners',
    `currentStep debería ser 'permute-corners', es ${currentStep(s)}`,
  )
  check(!solved(s), 'D no deja el cubo resuelto')
}

// 7) Mezclas: nunca "resuelto" y currentStep nunca null.
console.log('7) Mezclas aleatorias')
{
  const TRIALS = 100
  for (let i = 0; i < TRIALS; i++) {
    let cubies: Cubie[] = createSolved()
    const scr: Move[] = scramble(25)
    for (const mv of scr) cubies = applyMove(cubies, mv)
    check(!solved(cubies), `mezcla ${i} no debería estar resuelta`)
    check(currentStep(cubies) !== null, `mezcla ${i}: currentStep no debería ser null`)
  }
  console.log(`   ${TRIALS} mezclas comprobadas`)
}

// 8) Resolución COMPLETA por capas, comprobando cada paso, en muchas mezclas.
console.log('8) Resolución completa por capas (Fases 1–3)')
{
  const PREDS: Record<string, (cs: Cubie[]) => boolean> = {
    cross: crossSolved,
    'first-corners': firstLayerSolved,
    'middle-layer': secondLayerSolved,
    'last-cross': lastCrossSolved,
    'last-face': lastFaceSolved,
    'permute-corners': lastCornersPlaced,
    'permute-edges': solved,
  }
  const TRIALS = 1000
  let totalMoves = 0
  const t0 = Date.now()
  for (let i = 0; i < TRIALS; i++) {
    let cubies: Cubie[] = createSolved()
    for (const mv of scramble(25)) cubies = applyMove(cubies, mv)
    const groups = solveLBL(cubies)
    for (const g of groups) {
      totalMoves += g.moves.length
      for (const mv of g.moves) cubies = applyMove(cubies, mv)
      check(PREDS[g.step](cubies), `mezcla ${i}: el paso '${g.step}' no quedó correcto`)
    }
    check(solved(cubies), `mezcla ${i}: el cubo no quedó resuelto`)
  }
  const ms = Date.now() - t0
  console.log(
    `   ${TRIALS} mezclas · media ${(totalMoves / TRIALS).toFixed(1)} mov/solución · ${ms} ms (${(ms / TRIALS).toFixed(1)} ms/mezcla)`,
  )
}

if (failures === 0) {
  console.log('\n✓ SOLVER LBL COMPLETO OK — resuelve por capas en todas las mezclas.')
  process.exit(0)
} else {
  console.error(`\n✘ ${failures} comprobaciones fallaron.`)
  process.exit(1)
}
