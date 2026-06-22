/**
 * Motor lógico del cubo de Rubik 3×3×3. Puro (sin dependencias externas).
 *
 * Convención de coordenadas:
 *   +X = derecha (R)   -X = izquierda (L)
 *   +Y = arriba  (U)   -Y = abajo     (D)
 *   +Z = frente  (F)   -Z = atrás     (B)
 *
 * Cada cubie guarda su posición de rejilla actual (`pos`, componentes en {-1,0,1}),
 * su orientación (`rot`, matriz 3×3 de enteros) y su posición resuelta (`home`,
 * que fija los colores de las pegatinas y permite comprobar si está resuelto).
 *
 * Los giros usan notación WCA estándar (giro horario mirando la cara de frente),
 * idéntica a la de `cubejs`, de modo que ambos motores se mantienen sincronizados.
 */

export type Vec3 = [number, number, number]
/** Matriz 3×3 en orden por filas. */
export type Mat3 = [number, number, number, number, number, number, number, number, number]

export const FACES = ['U', 'D', 'L', 'R', 'F', 'B'] as const
export type Face = (typeof FACES)[number]

/** 1 = horario (CW), 2 = 180°, 3 = antihorario (CCW / prima). */
export type Power = 1 | 2 | 3

export interface Move {
  face: Face
  power: Power
}

export interface Cubie {
  id: number
  pos: Vec3
  rot: Mat3
  home: Vec3
}

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]

// --- Álgebra de matrices 3×3 con enteros -----------------------------------

export function matMul(a: Mat3, b: Mat3): Mat3 {
  const r = new Array(9).fill(0) as number[]
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j]
  return r as Mat3
}

export function matApply(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ]
}

function matEq(a: Mat3, b: Mat3): boolean {
  for (let i = 0; i < 9; i++) if (a[i] !== b[i]) return false
  return true
}

// Rotaciones de 90° (regla de la mano derecha) sobre los ejes principales.
const RX_POS: Mat3 = [1, 0, 0, 0, 0, -1, 0, 1, 0] // +90° sobre X
const RX_NEG: Mat3 = [1, 0, 0, 0, 0, 1, 0, -1, 0] // -90° sobre X
const RY_POS: Mat3 = [0, 0, 1, 0, 1, 0, -1, 0, 0] // +90° sobre Y
const RY_NEG: Mat3 = [0, 0, -1, 0, 1, 0, 1, 0, 0] // -90° sobre Y
const RZ_POS: Mat3 = [0, -1, 0, 1, 0, 0, 0, 0, 1] // +90° sobre Z
const RZ_NEG: Mat3 = [0, 1, 0, -1, 0, 0, 0, 0, 1] // -90° sobre Z

/** Definición geométrica de cada cara: eje, valor de capa y matriz del giro horario. */
interface FaceDef {
  axis: 'x' | 'y' | 'z'
  /** Índice del componente de `pos` que selecciona la capa (0=x,1=y,2=z). */
  axisIndex: 0 | 1 | 2
  /** Valor de la capa: +1 o -1. */
  layer: 1 | -1
  /** Matriz del giro horario (potencia 1) mirando la cara desde fuera. */
  cw: Mat3
  /** Vector del eje principal para la animación. */
  axisVec: Vec3
  /** Signo del ángulo del giro horario alrededor del eje principal (radianes). */
  cwAngleSign: 1 | -1
}

// Caras "positivas" (R,U,F): horario = -90° sobre el eje. Negativas (L,D,B): +90°.
export const FACE_DEFS: Record<Face, FaceDef> = {
  R: { axis: 'x', axisIndex: 0, layer: 1, cw: RX_NEG, axisVec: [1, 0, 0], cwAngleSign: -1 },
  L: { axis: 'x', axisIndex: 0, layer: -1, cw: RX_POS, axisVec: [1, 0, 0], cwAngleSign: 1 },
  U: { axis: 'y', axisIndex: 1, layer: 1, cw: RY_NEG, axisVec: [0, 1, 0], cwAngleSign: -1 },
  D: { axis: 'y', axisIndex: 1, layer: -1, cw: RY_POS, axisVec: [0, 1, 0], cwAngleSign: 1 },
  F: { axis: 'z', axisIndex: 2, layer: 1, cw: RZ_NEG, axisVec: [0, 0, 1], cwAngleSign: -1 },
  B: { axis: 'z', axisIndex: 2, layer: -1, cw: RZ_POS, axisVec: [0, 0, 1], cwAngleSign: 1 },
}

/** Matriz total de un movimiento (cara + potencia). */
export function moveMatrix(move: Move): Mat3 {
  const cw = FACE_DEFS[move.face].cw
  let m = cw
  for (let i = 1; i < move.power; i++) m = matMul(cw, m)
  return m
}

/** Ángulo (radianes) que debe rotar el pivote de animación para este movimiento. */
export function moveAngle(move: Move): number {
  const def = FACE_DEFS[move.face]
  // potencia 3 = sentido contrario; potencia 2 = 180°.
  const turns = move.power === 3 ? -1 : move.power === 2 ? 2 : 1
  return def.cwAngleSign * (Math.PI / 2) * turns
}

// --- Estado y movimientos ---------------------------------------------------

/** Construye el cubo resuelto: 26 cubies (sin el núcleo invisible). */
export function createSolved(): Cubie[] {
  const cubies: Cubie[] = []
  let id = 0
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue // núcleo: no se renderiza
        cubies.push({ id: id++, pos: [x, y, z], rot: [...IDENTITY] as Mat3, home: [x, y, z] })
      }
  return cubies
}

/** ¿Pertenece el cubie a la capa de esta cara, según su posición actual? */
function inLayer(cubie: Cubie, face: Face): boolean {
  const def = FACE_DEFS[face]
  return cubie.pos[def.axisIndex] === def.layer
}

/**
 * Aplica un movimiento al estado (inmutable: devuelve un array nuevo).
 * Solo recalcula los cubies de la capa afectada.
 */
export function applyMove(cubies: Cubie[], move: Move): Cubie[] {
  const m = moveMatrix(move)
  return cubies.map((c) => {
    if (!inLayer(c, move.face)) return c
    return { ...c, pos: matApply(m, c.pos), rot: matMul(m, c.rot) }
  })
}

/** IDs de los cubies afectados por el movimiento (para la animación). */
export function affectedIds(cubies: Cubie[], face: Face): number[] {
  return cubies.filter((c) => inLayer(c, face)).map((c) => c.id)
}

/** Inverso de un movimiento. */
export function inverseMove(move: Move): Move {
  return { face: move.face, power: (4 - move.power) as Power }
}

/**
 * Expande los giros dobles (potencia 2) en dos giros simples de la misma cara.
 * Así cada movimiento de una secuencia corresponde a una sola pulsación de tecla.
 */
export function expandHalfTurns(moves: Move[]): Move[] {
  const out: Move[] = []
  for (const m of moves) {
    if (m.power === 2) out.push({ face: m.face, power: 1 }, { face: m.face, power: 1 })
    else out.push(m)
  }
  return out
}

// --- Notación WCA -----------------------------------------------------------

const SUFFIX: Record<Power, string> = { 1: '', 2: '2', 3: "'" }

export function moveToString(move: Move): string {
  return move.face + SUFFIX[move.power]
}

export function movesToString(moves: Move[]): string {
  return moves.map(moveToString).join(' ')
}

export function parseMove(token: string): Move {
  const face = token[0] as Face
  const power: Power = token.endsWith('2') ? 2 : token.endsWith("'") ? 3 : 1
  return { face, power }
}

export function parseMoves(alg: string): Move[] {
  return alg
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(parseMove)
}

// --- Mezcla y comprobación de resuelto --------------------------------------

/** ¿Está el cubo resuelto? Ignora la orientación de los centros de cara. */
export function isSolved(cubies: Cubie[]): boolean {
  for (const c of cubies) {
    if (c.pos[0] !== c.home[0] || c.pos[1] !== c.home[1] || c.pos[2] !== c.home[2]) return false
    const nonZero = c.home.filter((v) => v !== 0).length
    if (nonZero >= 2 && !matEq(c.rot, IDENTITY)) return false // aristas y esquinas
  }
  return true
}

/**
 * Genera una mezcla de `count` movimientos sin cancelaciones triviales
 * (no repite la misma cara dos veces seguidas).
 * `rng` debe devolver un float en [0,1) — inyectable para tests deterministas.
 */
export function scramble(count = 25, rng: () => number = Math.random): Move[] {
  const moves: Move[] = []
  let last: Face | null = null
  while (moves.length < count) {
    const face = FACES[Math.floor(rng() * FACES.length)]
    if (face === last) continue
    last = face
    const power = ((Math.floor(rng() * 3) + 1) as Power)
    moves.push({ face, power })
  }
  return moves
}
