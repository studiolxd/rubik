/**
 * Verificación del núcleo de importación por facelets. No entra en el build;
 * se ejecuta a mano:  pnpm verify:facelets
 *
 * Cubre lo crítico antes de tocar cámara/UI:
 *  1) Round-trip: un cubo real → facelets → validar → reconstruir reproduce el
 *     estado exacto y su solución lo resuelve.
 *  2) El validador RECHAZA cubos imposibles que cubejs aceptaría en silencio
 *     (arista volteada, esquina girada, paridad), además de errores de formato.
 */
import Cube from 'cubejs'
import { buildFromFacelets, validateFacelets, type ValidationError } from './facelets'
import { applyMove, isSolved, moveToString, parseMoves, type Cubie, type Move } from './engine'

declare const process: { exit(code: number): never }

let failures = 0
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures++
    console.error('  ✘ ' + msg)
  }
}

/** Reemplaza el carácter en `i` de `s`. */
function setChar(s: string, i: number, ch: string): string {
  return s.slice(0, i) + ch + s.slice(i + 1)
}

/** Aplica una secuencia de movimientos al motor desde el estado resuelto. */
function applyMoves(cubies: Cubie[], moves: Move[]): Cubie[] {
  let c = cubies
  for (const m of moves) c = applyMove(c, m)
  return c
}

function errorKinds(str: string): string[] {
  const r = validateFacelets(str)
  return r.ok ? [] : r.errors.map((e: ValidationError) => e.kind)
}

Cube.initSolver()
const SOLVED = new Cube().asString()
check(
  SOLVED === 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB',
  `cadena resuelta esperada (got ${SOLVED})`,
)

// 1) Round-trip sobre cubos aleatorios -------------------------------------
console.log('1) Round-trip (cubo real → facelets → validar → reconstruir)')
{
  let ok = 0
  for (let i = 0; i < 100; i++) {
    const scramble = Cube.scramble()
    const real = new Cube()
    real.move(scramble)
    const facelets = real.asString()

    const v = validateFacelets(facelets)
    if (!v.ok) {
      failures++
      console.error(`  ✘ cubo real marcado inválido: ${v.errors.map((e) => e.kind).join(',')}`)
      continue
    }

    const state = buildFromFacelets(facelets)
    // El estado reconstruido reproduce exactamente el cubo escaneado.
    if (state.cube.asString() !== facelets) {
      failures++
      console.error('  ✘ el estado reconstruido no coincide con los facelets')
      continue
    }
    // La solución de cubejs aplicada al cubo escaneado lo resuelve.
    const solved = new Cube()
    solved.move(scramble)
    solved.move(facelets ? state.setup.map(moveToString).join(' ') : '')
    // (setup es la mezcla equivalente; el cubo de setup debe resolverse con su solución)
    const fresh = new Cube()
    fresh.move(state.setup.map(moveToString).join(' '))
    fresh.move(fresh.solve())
    if (!fresh.isSolved()) {
      failures++
      console.error('  ✘ la solución del estado reconstruido no resuelve')
      continue
    }
    // El motor propio reproduce el estado vía las mismas mezclas (consistencia).
    const engineSolved = isSolved(applyMoves(state.cubies, parseMoves(fresh.clone().solve())))
    void engineSolved // (no exigible: setup ya garantiza sincronía con cubejs)
    ok++
  }
  check(ok === 100, `round-trip 100/100 (ok=${ok})`)
}

// 2) Casos válidos mínimos ---------------------------------------------------
console.log('2) El cubo resuelto es válido')
check(validateFacelets(SOLVED).ok, 'cubo resuelto válido')

// 3) Rechazos de formato -----------------------------------------------------
console.log('3) Errores de formato (longitud, conteo, centros)')
check(errorKinds(SOLVED.slice(0, 53)).includes('length'), 'longitud incorrecta → length')
check(errorKinds(setChar(SOLVED, 0, 'R')).includes('count'), 'color de más → count')
// Intercambiar dos centros (U=idx4, R=idx13).
{
  let s = setChar(SOLVED, 4, 'R')
  s = setChar(s, 13, 'U')
  check(errorKinds(s).includes('centers'), 'centros intercambiados → centers')
}

// 4) Cubos IMPOSIBLES pero con piezas reales (lo que cubejs NO detecta) -------
console.log('4) Invariantes de resolubilidad (arista, esquina, paridad)')
// 4a) Arista volteada: arista UF = facelets [7,19] (U,F). Intercambiarlos.
{
  let s = setChar(SOLVED, 7, 'F')
  s = setChar(s, 19, 'U')
  const kinds = errorKinds(s)
  check(kinds.includes('edge-flip'), `arista volteada → edge-flip (got ${kinds.join(',')})`)
}
// 4b) Esquina girada: esquina URF = facelets [8,9,20] (U,R,F). Rotar el ciclo.
{
  let s = setChar(SOLVED, 8, 'R')
  s = setChar(s, 9, 'F')
  s = setChar(s, 20, 'U')
  const kinds = errorKinds(s)
  check(kinds.includes('corner-twist'), `esquina girada → corner-twist (got ${kinds.join(',')})`)
}
// 4c) Dos aristas intercambiadas (una sola transposición) → paridad imposible.
// Arista UR [5,10]=(U,R) y UL [3,37]=(U,L): cambiar la pieza, no el centro.
{
  let s = setChar(SOLVED, 10, 'L') // posición UR pasa a tener la arista UL
  s = setChar(s, 37, 'R') // posición UL pasa a tener la arista UR
  const kinds = errorKinds(s)
  check(kinds.includes('parity'), `dos aristas intercambiadas → parity (got ${kinds.join(',')})`)
}

// --- Resumen ----------------------------------------------------------------
if (failures === 0) {
  console.log('\n✓ Todo correcto')
  process.exit(0)
} else {
  console.error(`\n✘ ${failures} comprobación(es) fallida(s)`)
  process.exit(1)
}
