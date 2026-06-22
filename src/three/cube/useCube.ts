import { useCallback, useEffect, useRef, useState } from 'react'
import Cube from 'cubejs'
import {
  affectedIds,
  applyMove,
  createSolved,
  expandHalfTurns,
  FACE_DEFS,
  moveAngle,
  moveToString,
  parseMoves,
  scramble as genScramble,
  type Cubie,
  type Face,
  type Move,
  type Vec3,
} from './engine'
import { ensureSolver } from './solver'

export type Mode = 'free' | 'step'

/** Duración de un giro de 90° (segundos). */
export const ANIM_DURATION = 0.22

/** Nº de movimientos de la mezcla inicial / del botón Mezclar. */
const SCRAMBLE_LENGTH = 30

/** Estado de la animación de un giro en curso. */
export interface AnimState {
  move: Move
  ids: Set<number>
  axis: Vec3
  angle: number
}

export interface CubeController {
  cubies: Cubie[]
  anim: AnimState | null
  mode: Mode
  solved: boolean
  /** Hay una animación, una cola pendiente o un cálculo de solución en curso. */
  busy: boolean
  solving: boolean

  // Modo libre
  doMove: (face: Face, prime?: boolean) => void
  doScramble: () => void

  // Modo paso a paso
  setMode: (m: Mode) => void
  solutionLength: number
  stepIndex: number
  /** Próximo movimiento que el usuario debe ejecutar (null si ya está resuelto). */
  nextMove: Move | null
  /**
   * Intenta ejecutar el giro indicado en modo paso a paso. Solo avanza si
   * coincide con el movimiento que toca. Devuelve true si se aceptó.
   */
  pressStep: (face: Face, prime: boolean) => boolean

  /** Uso interno del componente 3D para confirmar el fin de una animación. */
  _completeAnim: () => void
}

/** Construye un estado mezclado (cubies + instancia cubejs sincronizada). */
function buildScrambled(): { cubies: Cubie[]; cube: Cube } {
  const moves = genScramble(SCRAMBLE_LENGTH)
  let cubies = createSolved()
  const cube = new Cube()
  for (const mv of moves) {
    cubies = applyMove(cubies, mv)
    cube.move(moveToString(mv))
  }
  return { cubies, cube }
}

/**
 * Controlador del cubo. Mantiene en paralelo:
 *  - el estado geométrico (`cubies`) que renderiza React Three Fiber, y
 *  - una instancia de `cubejs` (`cubeRef`) que es la fuente de verdad lógica
 *    y la que resuelve.
 * Ambos reciben exactamente los mismos movimientos, así que nunca se desincronizan.
 *
 * El cubo arranca SIEMPRE mezclado (mezcla fuerte de 30 movimientos, aplicada
 * de forma instantánea).
 */
export function useCube(): CubeController {
  // Estado inicial mezclado, calculado una sola vez.
  const initRef = useRef<{ cubies: Cubie[]; cube: Cube } | null>(null)
  if (!initRef.current) initRef.current = buildScrambled()

  const [cubies, setCubies] = useState<Cubie[]>(initRef.current.cubies)
  const [anim, setAnim] = useState<AnimState | null>(null)
  const [queue, setQueue] = useState<Move[]>([])
  const [mode, setModeState] = useState<Mode>('free')
  const [solved, setSolved] = useState(false)
  const [solving, setSolving] = useState(false)
  const [solution, setSolution] = useState<Move[]>([])
  const [stepIndex, setStepIndex] = useState(0)

  const cubeRef = useRef<Cube>(initRef.current.cube)
  const cubiesRef = useRef(cubies)
  const animRef = useRef(anim)
  cubiesRef.current = cubies
  animRef.current = anim

  const busy = anim !== null || queue.length > 0 || solving

  // Bombea la cola: cuando no hay animación y hay movimientos pendientes,
  // arranca el siguiente. Cada giro confirmado vacía `anim`, lo que re-dispara
  // este efecto y encadena la secuencia.
  useEffect(() => {
    if (anim || queue.length === 0) return
    const [head, ...rest] = queue
    const ids = affectedIds(cubiesRef.current, head.face)
    setQueue(rest)
    setAnim({
      move: head,
      ids: new Set(ids),
      axis: FACE_DEFS[head.face].axisVec,
      angle: moveAngle(head),
    })
  }, [anim, queue])

  const _completeAnim = useCallback(() => {
    const a = animRef.current
    if (!a) return
    const updated = applyMove(cubiesRef.current, a.move)
    cubiesRef.current = updated
    cubeRef.current.move(moveToString(a.move))
    setCubies(updated)
    setSolved(cubeRef.current.isSolved())
    setAnim(null)
  }, [])

  const doMove = useCallback(
    (face: Face, prime = false) => {
      if (mode !== 'free') return
      setQueue((q) => [...q, { face, power: prime ? 3 : 1 }])
    },
    [mode],
  )

  // Mezcla instantánea (sin animar). Disponible en modo libre.
  const doScramble = useCallback(() => {
    if (mode !== 'free' || busy) return
    const { cubies: c, cube } = buildScrambled()
    cubeRef.current = cube
    cubiesRef.current = c
    setCubies(c)
    setSolved(false)
  }, [mode, busy])

  const setMode = useCallback(
    (m: Mode) => {
      if (m === mode || busy) return
      if (m === 'step') {
        setModeState('step')
        setSolving(true)
        // Diferido para que la UI pinte "calculando" antes del cálculo síncrono
        // (que bloquea el hilo ~0.7s la primera vez).
        setTimeout(() => {
          ensureSolver()
          const sol = expandHalfTurns(parseMoves(cubeRef.current.clone().solve()))
          setSolution(sol)
          setStepIndex(0)
          setSolving(false)
        }, 20)
      } else {
        setModeState('free')
      }
    },
    [mode, busy],
  )

  const pressStep = useCallback(
    (face: Face, prime: boolean): boolean => {
      if (mode !== 'step' || busy) return false
      const expected = stepIndex < solution.length ? solution[stepIndex] : null
      if (!expected) return false
      const power = prime ? 3 : 1
      if (face !== expected.face || power !== expected.power) return false
      setStepIndex((i) => i + 1)
      setQueue((q) => [...q, expected])
      return true
    },
    [mode, busy, stepIndex, solution],
  )

  return {
    cubies,
    anim,
    mode,
    solved,
    busy,
    solving,
    doMove,
    doScramble,
    setMode,
    solutionLength: solution.length,
    stepIndex,
    nextMove: mode === 'step' && stepIndex < solution.length ? solution[stepIndex] : null,
    pressStep,
    _completeAnim,
  }
}
