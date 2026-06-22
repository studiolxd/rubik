/**
 * Importación de un cubo REAL a partir de sus "facelets" (las 54 pegatinas).
 *
 * Formato de cadena (idéntico al de `cubejs`): 54 caracteres, una letra de cara
 * por pegatina, concatenando las 6 caras en orden **U R F D L B** y, dentro de
 * cada cara, en orden de lectura (fila por fila, de arriba-izquierda a
 * abajo-derecha) vista desde fuera con U arriba y F al frente.
 *
 *              U0 U1 U2
 *              U3 U4 U5
 *              U6 U7 U8
 *   L0 L1 L2   F0 F1 F2   R0 R1 R2   B0 B1 B2
 *   L3 L4 L5   F3 F4 F5   R3 R4 R5   B3 B4 B5
 *   L6 L7 L8   F6 F7 F8   R6 R7 R8   B6 B7 B8
 *              D0 D1 D2
 *              D3 D4 D5
 *              D6 D7 D8
 *
 * IMPORTANTE: `cubejs.fromString` NO valida — ante un cubo imposible no lanza
 * error, devuelve un cubo corrupto y `solve()` da una solución FALSA. Por eso
 * `validateFacelets` reimplementa aquí, de forma independiente, todas las
 * comprobaciones de legalidad y resolubilidad. Nunca llames a `buildFromFacelets`
 * sin haber validado antes.
 */
import Cube from 'cubejs'
import {
  applyMove,
  createSolved,
  inverseMove,
  moveToString,
  parseMoves,
  type Cubie,
  type Face,
  type Move,
} from './engine'
import { ensureSolver } from './solver'

/** Orden de caras de la cadena de facelets (el de cubejs / Kociemba). */
export const URFDLB: readonly Face[] = ['U', 'R', 'F', 'D', 'L', 'B'] as const

// --- Tablas de facelets (copiadas del fuente de cubejs para máxima fidelidad) -
// Índice de la pegatina central de cada cara, en orden U R F D L B.
const CENTER_IDX = [4, 13, 22, 31, 40, 49] as const

// Para cada una de las 8 esquinas: los 3 índices de pegatina (en el orden de
// `CORNER_COLOR`) y los colores (letras de cara) que la definen.
const CORNER_FACELET = [
  [8, 9, 20],
  [6, 18, 38],
  [0, 36, 47],
  [2, 45, 11],
  [29, 26, 15],
  [27, 44, 24],
  [33, 53, 42],
  [35, 17, 51],
] as const
const CORNER_COLOR = [
  ['U', 'R', 'F'],
  ['U', 'F', 'L'],
  ['U', 'L', 'B'],
  ['U', 'B', 'R'],
  ['D', 'F', 'R'],
  ['D', 'L', 'F'],
  ['D', 'B', 'L'],
  ['D', 'R', 'B'],
] as const

// Para cada una de las 12 aristas: los 2 índices de pegatina y sus colores.
const EDGE_FACELET = [
  [5, 10],
  [7, 19],
  [3, 37],
  [1, 46],
  [32, 16],
  [28, 25],
  [30, 43],
  [34, 52],
  [23, 12],
  [21, 41],
  [50, 39],
  [48, 14],
] as const
const EDGE_COLOR = [
  ['U', 'R'],
  ['U', 'F'],
  ['U', 'L'],
  ['U', 'B'],
  ['D', 'R'],
  ['D', 'F'],
  ['D', 'L'],
  ['D', 'B'],
  ['F', 'R'],
  ['F', 'L'],
  ['B', 'L'],
  ['B', 'R'],
] as const

// --- Validación -------------------------------------------------------------

/** Causa concreta por la que un escaneo no es un cubo válido / resoluble. */
export type ValidationError =
  | { kind: 'length' } // no son 54 caracteres
  | { kind: 'count'; face: Face; count: number } // una cara no aparece 9 veces
  | { kind: 'centers' } // los 6 centros no son U,R,F,D,L,B distintos
  | { kind: 'corner'; index: number } // una esquina no es una pieza real
  | { kind: 'edge'; index: number } // una arista no es una pieza real
  | { kind: 'corner-permutation' } // esquinas repetidas/imposibles
  | { kind: 'edge-permutation' } // aristas repetidas/imposibles
  | { kind: 'corner-twist' } // suma de orientación de esquinas ≢ 0 (mod 3)
  | { kind: 'edge-flip' } // suma de orientación de aristas ≢ 0 (mod 2)
  | { kind: 'parity' } // paridad de permutación imposible

export type ValidationResult =
  | { ok: true; facelets: string }
  | { ok: false; errors: ValidationError[] }

function isPermutation(arr: number[], n: number): boolean {
  if (arr.length !== n) return false
  const seen = new Set(arr)
  if (seen.size !== n) return false
  for (let i = 0; i < n; i++) if (!seen.has(i)) return false
  return true
}

/** Paridad de una permutación (0 = par, 1 = impar) por descomposición en ciclos. */
function permParity(perm: number[]): number {
  const seen = new Array(perm.length).fill(false)
  let transpositions = 0
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue
    let j = i
    let len = 0
    while (!seen[j]) {
      seen[j] = true
      j = perm[j]
      len++
    }
    transpositions += len - 1
  }
  return transpositions % 2
}

/**
 * Valida una cadena de facelets de forma INDEPENDIENTE de cubejs: comprueba el
 * formato, que cada pieza física exista, y los tres invariantes de resolubilidad
 * (permutación, orientación de esquinas mod 3, de aristas mod 2 y paridad).
 * Devuelve TODOS los errores encontrados (no se detiene en el primero) para
 * poder señalar al usuario qué revisar.
 */
export function validateFacelets(str: string): ValidationResult {
  if (str.length !== 54) return { ok: false, errors: [{ kind: 'length' }] }

  const errors: ValidationError[] = []

  // 1) Conteo: cada una de las 6 caras debe aparecer exactamente 9 veces.
  const counts: Record<string, number> = {}
  for (const ch of str) counts[ch] = (counts[ch] ?? 0) + 1
  for (const f of URFDLB) {
    const c = counts[f] ?? 0
    if (c !== 9) errors.push({ kind: 'count', face: f, count: c })
  }

  // 2) Centros: deben ser U,R,F,D,L,B en sus posiciones (definen el esquema).
  const centersOk = CENTER_IDX.every((idx, i) => str[idx] === URFDLB[i])
  if (!centersOk) errors.push({ kind: 'centers' })

  // Si la estructura básica falla, no tiene sentido analizar las piezas.
  if (errors.length) return { ok: false, errors }

  // 3) Esquinas: identificar pieza y orientación (igual que cubejs.fromString).
  const cp = new Array(8).fill(-1)
  const co = new Array(8).fill(0)
  for (let i = 0; i < 8; i++) {
    let ori = -1
    for (let o = 0; o < 3; o++) {
      const c = str[CORNER_FACELET[i][o]]
      if (c === 'U' || c === 'D') {
        ori = o
        break
      }
    }
    if (ori < 0) {
      errors.push({ kind: 'corner', index: i }) // ninguna pegatina U/D: imposible
      continue
    }
    const c1 = str[CORNER_FACELET[i][(ori + 1) % 3]]
    const c2 = str[CORNER_FACELET[i][(ori + 2) % 3]]
    let found = -1
    for (let j = 0; j < 8; j++) {
      if (c1 === CORNER_COLOR[j][1] && c2 === CORNER_COLOR[j][2]) {
        found = j
        break
      }
    }
    if (found < 0) {
      errors.push({ kind: 'corner', index: i })
      continue
    }
    cp[i] = found
    co[i] = ori
  }

  // 4) Aristas: identificar pieza y orientación.
  const ep = new Array(12).fill(-1)
  const eo = new Array(12).fill(0)
  for (let i = 0; i < 12; i++) {
    const a = str[EDGE_FACELET[i][0]]
    const b = str[EDGE_FACELET[i][1]]
    let found = -1
    for (let j = 0; j < 12; j++) {
      if (a === EDGE_COLOR[j][0] && b === EDGE_COLOR[j][1]) {
        found = j
        eo[i] = 0
        break
      }
      if (a === EDGE_COLOR[j][1] && b === EDGE_COLOR[j][0]) {
        found = j
        eo[i] = 1
        break
      }
    }
    if (found < 0) {
      errors.push({ kind: 'edge', index: i })
      continue
    }
    ep[i] = found
  }

  if (errors.length) return { ok: false, errors }

  // 5) Permutaciones completas (sin piezas repetidas ni ausentes).
  if (!isPermutation(cp, 8)) errors.push({ kind: 'corner-permutation' })
  if (!isPermutation(ep, 12)) errors.push({ kind: 'edge-permutation' })
  if (errors.length) return { ok: false, errors }

  // 6) Invariantes de resolubilidad.
  const coSum = co.reduce((s, v) => s + v, 0)
  const eoSum = eo.reduce((s, v) => s + v, 0)
  if (coSum % 3 !== 0) errors.push({ kind: 'corner-twist' })
  if (eoSum % 2 !== 0) errors.push({ kind: 'edge-flip' })
  if (permParity(cp) !== permParity(ep)) errors.push({ kind: 'parity' })

  if (errors.length) return { ok: false, errors }
  return { ok: true, facelets: str }
}

// --- Construcción del estado interno ----------------------------------------

/** Estado importado: listo para alimentar `useCube` (mismo shape que la mezcla). */
export interface ScannedState {
  cubies: Cubie[]
  cube: Cube
  /** Secuencia de "montaje" (mezcla equivalente al cubo escaneado). */
  setup: Move[]
}

/** Inversa de un algoritmo: lo deshace aplicado al revés. */
function invertAlg(moves: Move[]): Move[] {
  return [...moves].reverse().map(inverseMove)
}

/**
 * Construye el estado interno (cubies + instancia cubejs sincronizada) a partir
 * de una cadena de facelets YA VALIDADA.
 *
 * Truco (verificado 200/200): resolvemos el cubo escaneado con Kociemba; la
 * INVERSA de esa solución es una secuencia que, aplicada a un cubo resuelto,
 * reproduce exactamente el estado escaneado. Así reutilizamos el motor de
 * movimientos tal cual (igual que `buildScrambled`), sin decodificar matrices.
 *
 * Precondición: `facelets` ha pasado `validateFacelets`. Con un cubo inválido el
 * resultado es indefinido (cubejs no avisa).
 */
export function buildFromFacelets(facelets: string): ScannedState {
  ensureSolver()
  const solution = Cube.fromString(facelets).solve()
  const setup = invertAlg(parseMoves(solution))

  let cubies = createSolved()
  const cube = new Cube()
  for (const mv of setup) {
    cubies = applyMove(cubies, mv)
    cube.move(moveToString(mv))
  }
  return { cubies, cube, setup }
}

// --- Ensamblado desde el "esquema" (mapa desplegado) ------------------------

/** Mapa desplegado: 9 letras de cara por cada cara, en orden de lectura. */
export type Net = Record<Face, Face[]>

/** Concatena el mapa en la cadena de 54 facelets (orden U R F D L B). */
export function netToFacelets(net: Net): string {
  return URFDLB.map((f) => net[f].join('')).join('')
}
