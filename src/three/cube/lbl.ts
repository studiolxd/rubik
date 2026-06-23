/**
 * Solucionador por capas (Layer-By-Layer, método de principiante).
 *
 * A diferencia de `cubejs` (Kociemba, ~20 movimientos óptimos pero imposibles de
 * explicar), este solucionador resuelve el cubo en el MISMO orden que una persona
 * y devuelve los movimientos AGRUPADOS POR PASO. Eso permite:
 *   - una guía paso a paso que enseña un método memorizable, y
 *   - detectar en qué paso está un cubo cualquiera (el primer grupo no vacío).
 *
 * Es puro: trabaja sobre el modelo `Cubie[]` de `engine.ts` (cada pieza conoce su
 * `home`, su `pos` actual y su orientación `rot`), sin tocar `cubejs`.
 *
 * Marco de resolución (decisión de producto: "cruz blanca primero"):
 *   - Primera capa = U (blanco, arriba).
 *   - Última capa  = D (amarillo, abajo).
 * Los helpers son agnósticos a la cara; las constantes FIRST_FACE/LAST_FACE fijan
 * el marco concreto.
 *
 * NOTA: este fichero contiene de momento la Fase 0 (andamiaje, localización de
 * piezas y predicados de "paso resuelto"). La lógica de resolución se añade por
 * fases posteriores.
 */

import {
  applyMove,
  FACE_DEFS,
  FACES,
  IDENTITY,
  matApply,
  parseMoves,
  type Cubie,
  type Face,
  type Mat3,
  type Move,
  type Power,
  type Vec3,
} from './engine'

// --- Marco de resolución ----------------------------------------------------

/** Cara cuya capa se resuelve primero (blanco, arriba). */
export const FIRST_FACE: Face = 'U'
/** Cara de la última capa (amarillo, abajo). */
export const LAST_FACE: Face = 'D'

/** Cara opuesta a cada cara. */
export const OPPOSITE: Record<Face, Face> = {
  U: 'D',
  D: 'U',
  L: 'R',
  R: 'L',
  F: 'B',
  B: 'F',
}

// --- Pasos del método -------------------------------------------------------

export type StepId =
  | 'cross' // cruz de la primera capa
  | 'first-corners' // esquinas de la primera capa (capa completa)
  | 'middle-layer' // aristas de la capa media
  | 'last-cross' // cruz de la última capa (aristas orientadas)
  | 'last-face' // cara de la última capa completa (esquinas orientadas)
  | 'permute-corners' // esquinas de la última capa en su sitio
  | 'permute-edges' // aristas de la última capa en su sitio (cubo resuelto)

/** Orden canónico de los pasos. */
export const STEPS: StepId[] = [
  'cross',
  'first-corners',
  'middle-layer',
  'last-cross',
  'last-face',
  'permute-corners',
  'permute-edges',
]

/** Movimientos que resuelven un paso concreto. */
export interface StepGroup {
  step: StepId
  moves: Move[]
}

// --- Geometría: caras ↔ ejes ------------------------------------------------

/** Vector unitario del eje que apunta hacia fuera de cada cara. */
export const FACE_AXIS: Record<Face, Vec3> = {
  R: [1, 0, 0],
  L: [-1, 0, 0],
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
}

/** Cara hacia la que apunta un eje unitario (inverso de FACE_AXIS). */
export function axisToFace(a: Vec3): Face {
  if (a[0] === 1) return 'R'
  if (a[0] === -1) return 'L'
  if (a[1] === 1) return 'U'
  if (a[1] === -1) return 'D'
  if (a[2] === 1) return 'F'
  return 'B' // a[2] === -1
}

// --- Helpers de piezas ------------------------------------------------------

function isIdentity(m: Mat3): boolean {
  for (let i = 0; i < 9; i++) if (m[i] !== IDENTITY[i]) return false
  return true
}

/** ¿Está la pieza en su sitio resuelto (posición Y orientación)? */
export function isHome(c: Cubie): boolean {
  return (
    c.pos[0] === c.home[0] && c.pos[1] === c.home[1] && c.pos[2] === c.home[2] && isIdentity(c.rot)
  )
}

/** Ejes unitarios de las componentes no nulas de un vector (las "pegatinas"). */
function nonZeroAxes(v: Vec3): Vec3[] {
  const out: Vec3[] = []
  if (v[0] !== 0) out.push([Math.sign(v[0]), 0, 0])
  if (v[1] !== 0) out.push([0, Math.sign(v[1]), 0])
  if (v[2] !== 0) out.push([0, 0, Math.sign(v[2])])
  return out
}

/** Nº de pegatinas: 1 = centro, 2 = arista, 3 = esquina. */
function stickerCount(c: Cubie): number {
  return nonZeroAxes(c.home).length
}

export function isEdge(c: Cubie): boolean {
  return stickerCount(c) === 2
}

export function isCorner(c: Cubie): boolean {
  return stickerCount(c) === 3
}

/** Colores (caras) de una pieza en su estado resuelto, derivados de `home`. */
export function homeColors(c: Cubie): Face[] {
  return nonZeroAxes(c.home).map(axisToFace)
}

/** Pegatina: el color que muestra y la cara hacia la que apunta AHORA. */
export interface Sticker {
  color: Face
  facing: Face
}

/** Pegatinas de una pieza en su estado actual (color fijo por `home`, orientación por `rot`). */
export function stickersOf(c: Cubie): Sticker[] {
  return nonZeroAxes(c.home).map((axis) => ({
    color: axisToFace(axis),
    facing: axisToFace(matApply(c.rot, axis)),
  }))
}

/** ¿Está la pieza, por su posición ACTUAL, en la capa de esta cara? */
export function inLayer(c: Cubie, face: Face): boolean {
  const def = FACE_DEFS[face]
  return c.pos[def.axisIndex] === def.layer
}

/** Aristas y esquinas (descarta centros). */
export function edges(cubies: Cubie[]): Cubie[] {
  return cubies.filter(isEdge)
}
export function corners(cubies: Cubie[]): Cubie[] {
  return cubies.filter(isCorner)
}

/** Compara dos conjuntos de caras sin importar el orden. */
function sameColors(a: Face[], b: Face[]): boolean {
  if (a.length !== b.length) return false
  return a.every((f) => b.includes(f))
}

/** Localiza la arista cuyos dos colores son exactamente {a, b}. */
export function findEdge(cubies: Cubie[], a: Face, b: Face): Cubie {
  const found = edges(cubies).find((c) => sameColors(homeColors(c), [a, b]))
  if (!found) throw new Error(`Arista ${a}${b} no encontrada`)
  return found
}

/** Localiza la esquina cuyos tres colores son exactamente {a, b, c}. */
export function findCorner(cubies: Cubie[], a: Face, b: Face, c: Face): Cubie {
  const found = corners(cubies).find((x) => sameColors(homeColors(x), [a, b, c]))
  if (!found) throw new Error(`Esquina ${a}${b}${c} no encontrada`)
  return found
}

// --- Predicados de "paso resuelto" ------------------------------------------
//
// Se usan para (a) saber cuándo parar cada paso al resolver y (b) detectar en qué
// paso está un cubo cualquiera. Parametrizados por `first` (primera capa) y
// `last` (última capa) para dejar el marco explícito; por defecto, el de la app.

/** Las piezas que PERTENECEN a una cara (su color está entre los de la pieza). */
function piecesOfFace(cubies: Cubie[], face: Face): Cubie[] {
  return cubies.filter((c) => homeColors(c).includes(face))
}

/** Cruz de la primera capa: sus 4 aristas colocadas y orientadas. */
export function crossSolved(cubies: Cubie[], first: Face = FIRST_FACE): boolean {
  return piecesOfFace(edges(cubies), first).every(isHome)
}

/** Primera capa completa: todas las aristas y esquinas de esa capa en su sitio. */
export function firstLayerSolved(cubies: Cubie[], first: Face = FIRST_FACE): boolean {
  const def = FACE_DEFS[first]
  const belongs = (c: Cubie) => c.home[def.axisIndex] === def.layer
  return cubies.filter((c) => (isEdge(c) || isCorner(c)) && belongs(c)).every(isHome)
}

/** Segunda capa: primera capa + las 4 aristas de la capa media colocadas. */
export function secondLayerSolved(cubies: Cubie[], first: Face = FIRST_FACE): boolean {
  if (!firstLayerSolved(cubies, first)) return false
  const axisIndex = FACE_DEFS[first].axisIndex
  const middleEdges = edges(cubies).filter((c) => c.home[axisIndex] === 0)
  return middleEdges.every(isHome)
}

/** Cruz de la última capa: las 4 aristas de `last` con su color de cara hacia `last`. */
export function lastCrossSolved(cubies: Cubie[], last: Face = LAST_FACE): boolean {
  return piecesOfFace(edges(cubies), last).every((c) => {
    if (!inLayer(c, last)) return false
    const sticker = stickersOf(c).find((s) => s.color === last)
    return sticker?.facing === last
  })
}

/** Cara de la última capa completa: TODAS las piezas de `last` con su color hacia `last` (OLL). */
export function lastFaceSolved(cubies: Cubie[], last: Face = LAST_FACE): boolean {
  return piecesOfFace(cubies, last)
    .filter((c) => isEdge(c) || isCorner(c))
    .every((c) => {
      if (!inLayer(c, last)) return false
      const sticker = stickersOf(c).find((s) => s.color === last)
      return sticker?.facing === last
    })
}

/** Esquinas de la última capa en su posición (no necesariamente toda la pieza orientada). */
export function lastCornersPlaced(cubies: Cubie[], last: Face = LAST_FACE): boolean {
  return piecesOfFace(corners(cubies), last).every(
    (c) => c.pos[0] === c.home[0] && c.pos[1] === c.home[1] && c.pos[2] === c.home[2],
  )
}

/** Cubo resuelto: toda pieza (arista/esquina) en su sitio y orientada. */
export function solved(cubies: Cubie[]): boolean {
  return cubies.filter((c) => isEdge(c) || isCorner(c)).every(isHome)
}

/**
 * Primer paso del método que AÚN no está resuelto, para el estado dado.
 * Es la base de la guía interactiva: el paso "en curso" de un cubo cualquiera.
 * Devuelve null si el cubo ya está resuelto.
 */
export function currentStep(cubies: Cubie[]): StepId | null {
  if (!crossSolved(cubies)) return 'cross'
  if (!firstLayerSolved(cubies)) return 'first-corners'
  if (!secondLayerSolved(cubies)) return 'middle-layer'
  if (!lastCrossSolved(cubies)) return 'last-cross'
  if (!lastFaceSolved(cubies)) return 'last-face'
  if (!lastCornersPlaced(cubies)) return 'permute-corners'
  if (!solved(cubies)) return 'permute-edges'
  return null
}

// ===========================================================================
// Resolución por capas
// ===========================================================================
//
// Cada paso trabaja sobre un "Work" mutable (estado + lista de movimientos
// acumulados). Los pasos no tocan lo ya resuelto por pasos anteriores.

interface Work {
  cubies: Cubie[]
  moves: Move[]
}

/** Aplica una secuencia (string en notación WCA o lista de Move) al Work. */
function applyAlg(w: Work, alg: string | Move[]): void {
  const moves = typeof alg === 'string' ? parseMoves(alg) : alg
  for (const mv of moves) {
    w.cubies = applyMove(w.cubies, mv)
    w.moves.push(mv)
  }
}

/** Todos los movimientos posibles (6 caras × 3 potencias). */
const ALL_MOVES: Move[] = FACES.flatMap((face) =>
  ([1, 2, 3] as Power[]).map((power) => ({ face, power })),
)

// --- Fase 1A: cruz de la primera capa ---------------------------------------

/** Las 4 aristas que llevan el color de la primera capa (blanco). */
function whiteEdges(cubies: Cubie[]): Cubie[] {
  return piecesOfFace(edges(cubies), FIRST_FACE)
}

/** Pegatina blanca de una arista (la del color de la primera capa). */
function whiteSticker(c: Cubie): Sticker {
  return stickersOf(c).find((s) => s.color === FIRST_FACE)!
}

/** Pétalo correcto de la margarita: en la cara D con el blanco mirando hacia D. */
function isPetal(c: Cubie): boolean {
  return (
    c.pos[FACE_DEFS[LAST_FACE].axisIndex] === FACE_DEFS[LAST_FACE].layer &&
    whiteSticker(c).facing === LAST_FACE
  )
}

/** Clave de la configuración de las 4 aristas blancas (para deduplicar en la BFS). */
function whiteKey(cubies: Cubie[]): string {
  return whiteEdges(cubies)
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((c) => `${c.id}:${c.pos.join(',')}:${whiteSticker(c).facing}`)
    .join('|')
}

/**
 * Busca (BFS) una secuencia que convierta la arista `targetId` en pétalo,
 * dejando además como pétalos todas las aristas de `locked`. El espacio de
 * estados (solo las 4 aristas blancas) es pequeño, así que es exacta y rápida.
 */
function searchPetal(start: Cubie[], targetId: number, locked: Set<number>): Move[] {
  const goal = (cs: Cubie[]): boolean => {
    const t = cs.find((c) => c.id === targetId)!
    if (!isPetal(t)) return false
    for (const id of locked) if (!isPetal(cs.find((c) => c.id === id)!)) return false
    return true
  }
  if (goal(start)) return []
  const visited = new Set<string>([whiteKey(start)])
  let frontier: { cubies: Cubie[]; path: Move[] }[] = [{ cubies: start, path: [] }]
  for (let depth = 0; depth < 14 && frontier.length; depth++) {
    const next: typeof frontier = []
    for (const node of frontier) {
      for (const mv of ALL_MOVES) {
        const cubies = applyMove(node.cubies, mv)
        const key = whiteKey(cubies)
        if (visited.has(key)) continue
        visited.add(key)
        const path = [...node.path, mv]
        if (goal(cubies)) return path
        next.push({ cubies, path })
      }
    }
    frontier = next
  }
  throw new Error('searchPetal: sin solución (cruz)')
}

/** Construye la margarita: las 4 aristas blancas como pétalos en la cara D. */
function buildDaisy(w: Work): void {
  const locked = new Set<number>()
  while (locked.size < 4) {
    const pending = whiteEdges(w.cubies).filter((c) => !locked.has(c.id))
    // Si alguna ya es pétalo, fíjala sin gastar movimientos.
    const ready = pending.find(isPetal)
    if (ready) {
      locked.add(ready.id)
      continue
    }
    const target = pending[0]
    applyAlg(w, searchPetal(w.cubies, target.id, locked))
    locked.add(target.id)
  }
}

/** Sube cada pétalo a su sitio: alinea D para que su color lateral case y gira X2. */
function insertCross(w: Work): void {
  const sides: Face[] = ['F', 'R', 'B', 'L']
  for (const x of sides) {
    let guard = 0
    // Alinea D hasta que la pegatina lateral del pétalo de color `x` apunte a `x`.
    while (true) {
      const c = whiteEdges(w.cubies).find((e) => homeColors(e).includes(x))!
      const side = stickersOf(c).find((s) => s.color !== FIRST_FACE)!
      if (isPetal(c) && side.facing === x) break
      applyAlg(w, 'D')
      if (++guard > 4) throw new Error(`insertCross: no se pudo alinear ${x}`)
    }
    applyAlg(w, x + '2')
  }
}

/** Resuelve la cruz de la primera capa. */
function solveCross(w: Work): Move[] {
  const before = w.moves.length
  buildDaisy(w)
  insertCross(w)
  return w.moves.slice(before)
}

// --- Fase 1B: esquinas de la primera capa -----------------------------------

/** Rotación de cara alrededor del eje vertical (y): F→R→B→L→F; U,D fijas. */
const Y_MAP: Record<Face, Face> = { F: 'R', R: 'B', B: 'L', L: 'F', U: 'U', D: 'D' }

/** Aplica `k` rotaciones en Y a una cara. */
function rotFaceY(face: Face, k: number): Face {
  let f = face
  for (let i = 0; i < k; i++) f = Y_MAP[f]
  return f
}

/** Reetiqueta un algoritmo (string WCA) rotándolo `k` veces alrededor de Y. */
function rotateAlgY(alg: string, k: number): Move[] {
  return parseMoves(alg).map((m) => ({ face: rotFaceY(m.face, k), power: m.power }))
}

/** Las 4 esquinas que llevan el color de la primera capa (blanco). */
function whiteCorners(cubies: Cubie[]): Cubie[] {
  return piecesOfFace(corners(cubies), FIRST_FACE)
}

/** Índice de slot (0=URF, 1=URB, 2=ULB, 3=ULF) de una posición de la capa superior. */
function topSlotIndex(p: Vec3): number {
  if (p[0] === 1 && p[2] === 1) return 0
  if (p[0] === 1 && p[2] === -1) return 1
  if (p[0] === -1 && p[2] === -1) return 2
  return 3 // [-1, 1, 1]
}

/** Posición D bajo cada slot superior (índice = slot). */
const SLOT_BELOW: Vec3[] = [
  [1, -1, 1],
  [1, -1, -1],
  [-1, -1, -1],
  [-1, -1, 1],
]

/** Caras laterales de cada slot: [y^k(R), y^k(F)] (las dos que toca la esquina). */
const SLOT_SIDES: [Face, Face][] = [
  ['R', 'F'],
  ['B', 'R'],
  ['L', 'B'],
  ['F', 'L'],
]

/** Resuelve las 4 esquinas de la primera capa (completa la capa). */
function solveFirstLayerCorners(w: Work): Move[] {
  const before = w.moves.length
  const firstLayer = FACE_DEFS[FIRST_FACE].layer
  for (let k = 0; k < 4; k++) {
    let guard = 0
    while (true) {
      const c = whiteCorners(w.cubies).find((x) => topSlotIndex(x.home) === k)!
      if (isHome(c)) break
      if (++guard > 12) throw new Error(`esquina slot ${k} no converge`)
      if (c.pos[1] === firstLayer) {
        // En la capa superior pero mal: extráela a D con el gatillo de su slot actual.
        applyAlg(w, rotateAlgY("R' D R", topSlotIndex(c.pos)))
        continue
      }
      // En la capa D: alinéala bajo su slot k.
      const below = SLOT_BELOW[k]
      if (c.pos[0] !== below[0] || c.pos[2] !== below[2]) {
        applyAlg(w, 'D')
        continue
      }
      // Bajo su slot: inserta según hacia dónde mira el blanco.
      const wf = whiteSticker(c).facing
      const [sideP, sideQ] = SLOT_SIDES[k]
      if (wf === LAST_FACE) applyAlg(w, rotateAlgY("R2 U' B2 U R2", k))
      else if (wf === sideP) applyAlg(w, rotateAlgY("R' D' R", k))
      else if (wf === sideQ) applyAlg(w, rotateAlgY("F D F'", k))
      else throw new Error(`orientación de esquina inesperada: ${wf}`)
    }
  }
  return w.moves.slice(before)
}

// --- Fase 2: segunda capa (aristas de la capa media) ------------------------

/** Inserción a la derecha: arista en DF → slot FR. */
const SL_RIGHT = "D' R' D R D F D' F'"
/** Inserción a la izquierda: arista en DF → slot FL. */
const SL_LEFT = "D L D' L' D' F' D F"

/** Las 4 aristas de la capa media (sin color de primera ni última capa). */
function middleEdges(cubies: Cubie[]): Cubie[] {
  const mid = FACE_DEFS[FIRST_FACE].axisIndex
  return edges(cubies).filter((e) => e.home[mid] === 0)
}

/** Cara frontal → índice de rotación Y (k tal que y^k(F) = cara). */
const FRONT_K: Record<Face, number> = { F: 0, R: 1, B: 2, L: 3, U: -1, D: -1 }

/** Índice de slot medio (0=FR, 1=RB, 2=BL, 3=LF) de una posición de la capa media. */
function middleSlotIndex(p: Vec3): number {
  if (p[0] === 1 && p[2] === 1) return 0
  if (p[0] === 1 && p[2] === -1) return 1
  if (p[0] === -1 && p[2] === -1) return 2
  return 3 // [-1, 0, 1]
}

/** Resuelve la segunda capa: inserta las 4 aristas medias desde la última capa. */
function solveSecondLayer(w: Work): Move[] {
  const before = w.moves.length
  const lastLayer = FACE_DEFS[LAST_FACE].layer
  let guard = 0
  while (!secondLayerSolved(w.cubies)) {
    if (++guard > 40) throw new Error('segunda capa no converge')
    // ¿Hay una arista media disponible en la última capa (D)?
    const avail = middleEdges(w.cubies).find((e) => e.pos[1] === lastLayer)
    if (avail) {
      const id = avail.id
      // Alinea D hasta que la pegatina lateral case con su centro.
      let g2 = 0
      while (true) {
        const e = w.cubies.find((c) => c.id === id)!
        const side = stickersOf(e).find((s) => s.facing !== LAST_FACE)!
        if (side.facing === side.color) break
        applyAlg(w, 'D')
        if (++g2 > 4) throw new Error('segunda capa: no se pudo alinear')
      }
      const e = w.cubies.find((c) => c.id === id)!
      const side = stickersOf(e).find((s) => s.facing !== LAST_FACE)!
      const k = FRONT_K[side.facing]
      const downColor = stickersOf(e).find((s) => s.facing === LAST_FACE)!.color
      if (downColor === rotFaceY('R', k)) applyAlg(w, rotateAlgY(SL_RIGHT, k))
      else applyAlg(w, rotateAlgY(SL_LEFT, k))
    } else {
      // Las pendientes están atascadas en su capa, mal colocadas: expulsa una a D.
      const stuck = middleEdges(w.cubies).find((e) => !isHome(e))!
      applyAlg(w, rotateAlgY(SL_RIGHT, middleSlotIndex(stuck.pos)))
    }
  }
  return w.moves.slice(before)
}

// --- Fase 3: última capa ----------------------------------------------------
//
// Cada paso se resuelve con una BFS sobre "macro-movimientos": rotaciones de la
// última capa (D) más el algoritmo del paso. La BFS deduplica sobre el estado de
// las piezas de la última capa (espacio pequeño), así que es exacta y rápida, y
// encuentra automáticamente la colocación (AUF) y el nº de repeticiones de cada
// caso. Cada algoritmo preserva lo ya conseguido por los pasos anteriores.

const LL_CROSS = "F L D L' D' F'" // orienta las aristas (cruz de la última capa)
const LL_SUNE = "L D L' D L D2 L'" // orienta las esquinas (mantiene la cruz)
const LL_CORNER = "L' F L' B2 L F' L' B2 L2" // ciclo de 3 esquinas (no toca aristas)
const LL_EDGE = "L D' L D L D L D' L' D' L2" // ciclo de 3 aristas (no toca esquinas)

/** Rotaciones de la última capa, como macro-movimientos. */
const D_MACROS: Move[][] = [parseMoves('D'), parseMoves('D2'), parseMoves("D'")]

function llEdges(cs: Cubie[]): Cubie[] {
  return piecesOfFace(edges(cs), LAST_FACE)
}
function llCorners(cs: Cubie[]): Cubie[] {
  return piecesOfFace(corners(cs), LAST_FACE)
}
/** Pegatina del color de la última capa (amarillo) de una pieza. */
function lastSticker(c: Cubie): Sticker {
  return stickersOf(c).find((s) => s.color === LAST_FACE)!
}
function keyPieces(list: Cubie[]): string {
  return list
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((c) => `${c.id}:${c.pos.join(',')}:${lastSticker(c).facing}`)
    .join('|')
}
const keyEdges = (cs: Cubie[]): string => keyPieces(llEdges(cs))
const keyCorners = (cs: Cubie[]): string => keyPieces(llCorners(cs))
const keyLL = (cs: Cubie[]): string => keyCorners(cs) + '#' + keyEdges(cs)

/** BFS sobre macros hasta cumplir `goal`, deduplicando con `key`. */
function macroSolve(
  start: Cubie[],
  macros: Move[][],
  goal: (cs: Cubie[]) => boolean,
  key: (cs: Cubie[]) => string,
): Move[] {
  if (goal(start)) return []
  const visited = new Set<string>([key(start)])
  let frontier: { cubies: Cubie[]; path: Move[] }[] = [{ cubies: start, path: [] }]
  for (let depth = 0; depth < 20 && frontier.length; depth++) {
    const next: typeof frontier = []
    for (const node of frontier) {
      for (const macro of macros) {
        let cubies = node.cubies
        for (const mv of macro) cubies = applyMove(cubies, mv)
        const k = key(cubies)
        if (visited.has(k)) continue
        visited.add(k)
        const path = [...node.path, ...macro]
        if (goal(cubies)) return path
        next.push({ cubies, path })
      }
    }
    frontier = next
  }
  throw new Error('macroSolve: sin solución (última capa)')
}

function solveStepMacro(
  w: Work,
  alg: string,
  goal: (cs: Cubie[]) => boolean,
  key: (cs: Cubie[]) => string,
): Move[] {
  const before = w.moves.length
  applyAlg(w, macroSolve(w.cubies, [parseMoves(alg), ...D_MACROS], goal, key))
  return w.moves.slice(before)
}

/**
 * Resuelve el cubo por capas y devuelve los movimientos agrupados por paso.
 */
export function solveLBL(cubies: Cubie[]): StepGroup[] {
  const w: Work = { cubies, moves: [] }
  return [
    { step: 'cross', moves: solveCross(w) },
    { step: 'first-corners', moves: solveFirstLayerCorners(w) },
    { step: 'middle-layer', moves: solveSecondLayer(w) },
    { step: 'last-cross', moves: solveStepMacro(w, LL_CROSS, lastCrossSolved, keyEdges) },
    { step: 'last-face', moves: solveStepMacro(w, LL_SUNE, lastFaceSolved, keyCorners) },
    {
      step: 'permute-corners',
      moves: solveStepMacro(w, LL_CORNER, lastCornersPlaced, keyCorners),
    },
    { step: 'permute-edges', moves: solveStepMacro(w, LL_EDGE, solved, keyLL) },
  ]
}
