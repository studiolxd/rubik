import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Cube from 'cubejs'
import {
  affectedIds,
  applyMove,
  createSolved,
  expandHalfTurns,
  FACE_DEFS,
  inverseMove,
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
import { buildFromFacelets } from './facelets'
import { currentStep as lblCurrentStep, solveLBL } from './lbl'
import type { StepGroup, StepId } from './lbl'

/** Solución por capas (LBL) del estado actual, con los dobles giros expandidos
 *  a giros simples (cada movimiento = una pulsación) y agrupada por paso. */
function lblGroups(cubies: Cubie[]): StepGroup[] {
  return solveLBL(cubies).map((g) => ({ step: g.step, moves: expandHalfTurns(g.moves) }))
}

export type Mode = 'free' | 'step' | 'practice' | 'guide'

/** Resultado de intentar un giro en modo práctica. */
export type PracticeResult = 'correct' | 'wrong' | 'ignored'

/** Feedback del último intento en modo práctica (con `n` para re-disparar la UI). */
export interface PracticeFeedback {
  kind: 'correct' | 'wrong'
  n: number
}

/** Duración de un giro de 90° (segundos). */
export const ANIM_DURATION = 0.22

/** Duración de un giro durante una mezcla animada (más rápida que la normal). */
export const SCRAMBLE_ANIM_DURATION = 0.09

/** Nº de movimientos de la mezcla inicial / del botón Mezclar. */
const SCRAMBLE_LENGTH = 30

/** Estado de la animación de un giro en curso. */
export interface AnimState {
  move: Move
  ids: Set<number>
  axis: Vec3
  angle: number
  /** Duración de este giro en segundos (varía entre giro normal y mezcla). */
  duration: number
  /** ¿Es un giro hecho por el usuario? (cuenta para el cronómetro). */
  userMove?: boolean
}

/** Movimiento en la cola, con la velocidad a la que debe animarse. */
export interface QueuedMove {
  move: Move
  duration: number
  /** ¿Lo ha pedido el usuario? Por defecto false (mezcla / resolución automática). */
  userMove?: boolean
}

export interface CubeController {
  cubies: Cubie[]
  anim: AnimState | null
  mode: Mode
  solved: boolean
  /** Hay una animación, una cola pendiente o un cálculo de solución en curso. */
  busy: boolean
  solving: boolean
  /** Nº de giros completados por el usuario (no cuenta la mezcla inicial). */
  moveCount: number

  // Modo libre
  doMove: (face: Face, prime?: boolean) => void
  doScramble: () => void
  /** Resuelve el cubo automáticamente por capas (LBL): encola y anima la solución. */
  doSolve: () => void
  /** Resuelve el cubo con el algoritmo de Kociemba (cubejs): solución corta (~20 mov). */
  doSolveKociemba: () => void
  /** Nº de giros (expandidos) que tomaría resolver por capas desde el estado actual. */
  lblLength: number
  /** Nº de giros (expandidos) de la solución Kociemba; null mientras se calcula. */
  kociembaLength: number | null
  /** Reinicia el cubo a una mezcla nueva e instantánea (para empezar de cero). */
  reset: () => void

  // Modo paso a paso
  setMode: (m: Mode) => void
  solutionLength: number
  stepIndex: number
  /** Solución por capas agrupada por paso (para la guía paso a paso). */
  solutionSteps: StepGroup[]
  /** Paso del método al que pertenece el movimiento actual (null si resuelto). */
  currentStepId: StepId | null
  /**
   * (Modo guía) Lleva el cubo al INICIO del paso indicado: recalcula la solución
   * por capas desde el estado actual y anima los movimientos de los pasos previos.
   * Si ya estás en o más allá de ese paso, no hace nada.
   */
  playToStep: (step: StepId) => void
  /** Próximo movimiento que el usuario debe ejecutar (null si ya está resuelto). */
  nextMove: Move | null
  /**
   * Intenta ejecutar el giro indicado en modo paso a paso. Solo avanza si
   * coincide con el movimiento que toca. Devuelve true si se aceptó.
   */
  pressStep: (face: Face, prime: boolean) => boolean

  // Modo práctica (libre, pero comprobando contra la solución óptima)
  /**
   * Aplica un giro en modo práctica:
   *  - si coincide con el movimiento óptimo → lo anima y avanza ("correct").
   *  - si no → lo anima y lo deshace, marcando el fallo ("wrong").
   */
  practiceMove: (face: Face, prime: boolean) => PracticeResult
  /** Nivel de pista revelado: 0 = nada, 1 = solo la cara, 2 = cara y sentido. */
  hintLevel: number
  /** Revela el siguiente nivel de pista (cara → sentido). */
  revealHint: () => void
  /** Feedback del último intento (correcto / incorrecto), o null. */
  practiceFeedback: PracticeFeedback | null

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
 * El cubo arranca mezclado (mezcla fuerte de 30 movimientos, instantánea), salvo
 * que se pase `initialFacelets` (un cubo escaneado ya validado), en cuyo caso
 * arranca con ESE estado.
 */
export function useCube(initialFacelets?: string): CubeController {
  // Estado inicial, calculado una sola vez: escaneado si se pasa, si no mezclado.
  const initRef = useRef<{ cubies: Cubie[]; cube: Cube } | null>(null)
  if (!initRef.current)
    initRef.current = initialFacelets ? buildFromFacelets(initialFacelets) : buildScrambled()

  const [cubies, setCubies] = useState<Cubie[]>(initRef.current.cubies)
  const [anim, setAnim] = useState<AnimState | null>(null)
  const [queue, setQueue] = useState<QueuedMove[]>([])
  const [mode, setModeState] = useState<Mode>('free')
  const [solved, setSolved] = useState(false)
  const [solving, setSolving] = useState(false)
  const [solution, setSolution] = useState<Move[]>([])
  const [solutionGroups, setSolutionGroups] = useState<StepGroup[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  const [moveCount, setMoveCount] = useState(0)
  const [hintLevel, setHintLevel] = useState(0)
  const [practiceFeedback, setPracticeFeedback] = useState<PracticeFeedback | null>(null)
  const [kociembaLength, setKociembaLength] = useState<number | null>(null)

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
    const ids = affectedIds(cubiesRef.current, head.move.face)
    setQueue(rest)
    setAnim({
      move: head.move,
      ids: new Set(ids),
      axis: FACE_DEFS[head.move.face].axisVec,
      angle: moveAngle(head.move),
      duration: head.duration,
      userMove: head.userMove ?? false,
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
    if (a.userMove) setMoveCount((n) => n + 1)
  }, [])

  const doMove = useCallback(
    (face: Face, prime = false) => {
      if (mode !== 'free' && mode !== 'guide') return
      setQueue((q) => [
        ...q,
        { move: { face, power: prime ? 3 : 1 }, duration: ANIM_DURATION, userMove: true },
      ])
    },
    [mode],
  )

  // Mezcla animada (rápida): encola movimientos aleatorios sobre el estado actual.
  const doScramble = useCallback(() => {
    if (mode !== 'free' || busy) return
    const moves = genScramble(SCRAMBLE_LENGTH)
    setQueue((q) => [...q, ...moves.map((move) => ({ move, duration: SCRAMBLE_ANIM_DURATION }))])
  }, [mode, busy])

  // Resuelve solo por capas (LBL). Es instantáneo (~6 ms), así que se calcula y
  // encola directamente.
  const doSolve = useCallback(() => {
    if (mode !== 'free' || busy || cubeRef.current.isSolved()) return
    const sol = lblGroups(cubiesRef.current).flatMap((g) => g.moves)
    setQueue((q) => [...q, ...sol.map((move) => ({ move, duration: ANIM_DURATION }))])
  }, [mode, busy])

  // Resuelve con el algoritmo de Kociemba (cubejs): solución corta (~20 mov).
  // Diferido para que la UI pinte "resolviendo" antes del cálculo síncrono
  // (la primera inicialización del solver bloquea el hilo ~0.7s).
  const doSolveKociemba = useCallback(() => {
    if (mode !== 'free' || busy || cubeRef.current.isSolved()) return
    setSolving(true)
    setTimeout(() => {
      ensureSolver()
      const sol = expandHalfTurns(parseMoves(cubeRef.current.clone().solve()))
      setSolving(false)
      setQueue((q) => [...q, ...sol.map((move) => ({ move, duration: ANIM_DURATION }))])
    }, 20)
  }, [mode, busy])

  // Nº de pasos de la solución por capas (LBL) desde el estado actual. Barato (~6 ms).
  const lblLength = useMemo(
    () => (mode === 'free' && !solved ? lblGroups(cubies).flatMap((g) => g.moves).length : 0),
    [mode, solved, cubies],
  )

  // Nº de pasos de la solución Kociemba. Requiere el solver (init ~0.7 s la 1ª vez),
  // así que se calcula diferido y cancelable: se recalcula al asentarse cada giro y
  // se descarta si el cubo cambia antes de terminar.
  useEffect(() => {
    if (mode !== 'free' || solved) {
      setKociembaLength(solved ? 0 : null)
      return
    }
    if (busy) return // mientras anima, se recalcula al terminar
    let cancelled = false
    setKociembaLength(null)
    const id = setTimeout(() => {
      ensureSolver()
      const n = expandHalfTurns(parseMoves(cubeRef.current.clone().solve())).length
      if (!cancelled) setKociembaLength(n)
    }, 30)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [mode, solved, busy, cubies])

  const setMode = useCallback(
    (m: Mode) => {
      if (m === mode || busy) return
      if (m === 'step' || m === 'practice') {
        setModeState(m)
        setHintLevel(0)
        setPracticeFeedback(null)
        setSolving(true)
        // Diferido para que la UI pinte "calculando" antes del cálculo (síncrono).
        setTimeout(() => {
          const groups = lblGroups(cubiesRef.current)
          setSolutionGroups(groups)
          setSolution(groups.flatMap((g) => g.moves))
          setStepIndex(0)
          setSolving(false)
        }, 20)
      } else if (m === 'guide') {
        // La guía no precalcula: la solución se recalcula en vivo tras cada giro.
        setModeState('guide')
      } else {
        setModeState('free')
      }
    },
    [mode, busy],
  )

  // Reinicia a una mezcla nueva instantánea (modo cronometrado: "Reiniciar").
  const reset = useCallback(() => {
    const fresh = buildScrambled()
    cubeRef.current = fresh.cube
    cubiesRef.current = fresh.cubies
    setCubies(fresh.cubies)
    setAnim(null)
    setQueue([])
    setSolved(false)
    setSolution([])
    setSolutionGroups([])
    setStepIndex(0)
    setMoveCount(0)
    setHintLevel(0)
    setPracticeFeedback(null)
    setModeState('free')
  }, [])

  const pressStep = useCallback(
    (face: Face, prime: boolean): boolean => {
      if (mode !== 'step' || busy) return false
      const expected = stepIndex < solution.length ? solution[stepIndex] : null
      if (!expected) return false
      const power = prime ? 3 : 1
      if (face !== expected.face || power !== expected.power) return false
      setStepIndex((i) => i + 1)
      setQueue((q) => [...q, { move: expected, duration: ANIM_DURATION, userMove: true }])
      return true
    },
    [mode, busy, stepIndex, solution],
  )

  // Modo práctica: giras libremente, pero comprobamos contra la solución óptima.
  const practiceMove = useCallback(
    (face: Face, prime: boolean): PracticeResult => {
      if (mode !== 'practice' || busy) return 'ignored'
      const expected = stepIndex < solution.length ? solution[stepIndex] : null
      if (!expected) return 'ignored'
      const move: Move = { face, power: prime ? 3 : 1 }
      if (move.face === expected.face && move.power === expected.power) {
        // Correcto: anima el giro y avanza al siguiente paso de la solución.
        setStepIndex((i) => i + 1)
        setHintLevel(0)
        setQueue((q) => [...q, { move: expected, duration: ANIM_DURATION, userMove: true }])
        setPracticeFeedback((f) => ({ kind: 'correct', n: (f?.n ?? 0) + 1 }))
        return 'correct'
      }
      // Incorrecto: anima el giro y a continuación lo deshace, sin avanzar.
      setQueue((q) => [
        ...q,
        { move, duration: ANIM_DURATION, userMove: true },
        { move: inverseMove(move), duration: ANIM_DURATION },
      ])
      setPracticeFeedback((f) => ({ kind: 'wrong', n: (f?.n ?? 0) + 1 }))
      return 'wrong'
    },
    [mode, busy, stepIndex, solution],
  )

  const revealHint = useCallback(() => setHintLevel((l) => Math.min(2, l + 1)), [])

  // --- Modo guía: solución recalculada en vivo desde el estado actual ---------
  // Cada giro libre del usuario actualiza `cubies`; aquí se vuelve a resolver por
  // capas (~6 ms), de modo que la guía siempre orienta desde donde esté el cubo.
  const guideGroups = useMemo(() => (mode === 'guide' ? lblGroups(cubies) : []), [mode, cubies])
  const guideMoves = useMemo(() => guideGroups.flatMap((g) => g.moves), [guideGroups])

  // (Modo guía) Anima los giros de los pasos PREVIOS al indicado, dejando el cubo
  // al inicio de ese paso. Recalcula desde el estado real al pulsar.
  const playToStep = useCallback(
    (step: StepId) => {
      if (mode !== 'guide' || busy) return
      const prefix: Move[] = []
      for (const g of lblGroups(cubiesRef.current)) {
        if (g.step === step) break
        prefix.push(...g.moves)
      }
      if (prefix.length === 0) return
      setQueue((q) => [...q, ...prefix.map((move) => ({ move, duration: SCRAMBLE_ANIM_DURATION }))])
    },
    [mode, busy],
  )

  // Paso del método al que pertenece el movimiento actual. En modo guía se deduce
  // en vivo del estado; en guiado/práctica, del grupo que contiene `stepIndex`.
  let currentStepId: StepId | null = null
  if (mode === 'guide') {
    currentStepId = lblCurrentStep(cubies)
  } else if (mode === 'step' || mode === 'practice') {
    let acc = 0
    for (const g of solutionGroups) {
      if (stepIndex < acc + g.moves.length) {
        currentStepId = g.step
        break
      }
      acc += g.moves.length
    }
  }

  return {
    cubies,
    anim,
    mode,
    solved,
    busy,
    solving,
    moveCount,
    doMove,
    doScramble,
    doSolve,
    doSolveKociemba,
    lblLength,
    kociembaLength,
    reset,
    setMode,
    solutionLength: solution.length,
    stepIndex,
    solutionSteps: mode === 'guide' ? guideGroups : solutionGroups,
    currentStepId,
    playToStep,
    nextMove:
      mode === 'guide'
        ? (guideMoves[0] ?? null)
        : (mode === 'step' || mode === 'practice') && stepIndex < solution.length
          ? solution[stepIndex]
          : null,
    pressStep,
    practiceMove,
    hintLevel,
    revealHint,
    practiceFeedback,
    _completeAnim,
  }
}
