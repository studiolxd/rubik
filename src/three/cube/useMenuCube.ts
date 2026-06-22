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
  movesToString,
  parseMoves,
  scramble as genScramble,
  type Cubie,
  type Move,
} from './engine'
import { ensureSolver } from './solver'
import { ANIM_DURATION, SCRAMBLE_ANIM_DURATION, type AnimState, type QueuedMove } from './useCube'

/** Movimientos de la mezcla del cubo decorativo del menú. */
const SCRAMBLE_LENGTH = 25

/** Clave de localStorage donde se guarda el estado del cubo del menú. */
const STORAGE_KEY = 'rubik.menuCube.moves'

/** Lee los movimientos guardados (string WCA), o null si nunca se inició. */
function loadSaved(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  } catch {
    return null // almacenamiento no disponible (modo privado, etc.)
  }
}

/** Persiste los movimientos aplicados desde el estado resuelto. */
function saveMoves(moves: Move[]): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, movesToString(moves))
  } catch {
    // almacenamiento no disponible: se ignora.
  }
}

/** Controlador del cubo del menú: solo lo que necesita CubeView + la interacción. */
export interface MenuCubeController {
  cubies: Cubie[]
  anim: AnimState | null
  /** El cubo está resuelto (todos los grupos de la solución ejecutados). */
  solved: boolean
  /** La solución ya está calculada y troceada (el cubo responde a la interacción). */
  ready: boolean
  /**
   * Interacción del usuario:
   *  - `hover` o `tap` mientras está mezclado → ejecuta el siguiente grupo de giros.
   *  - `tap` cuando está resuelto → vuelve a mezclar (el `hover` no hace nada).
   */
  interact: (kind: 'hover' | 'tap') => void
  _completeAnim: () => void
}

/**
 * Estado inicial del cubo del menú. Si hay un estado guardado (el usuario ya lo
 * había iniciado), reconstruye esa posición replicando los movimientos sobre un
 * cubo resuelto. Si no, arranca resuelto.
 */
function buildInitial(): { cubies: Cubie[]; cube: Cube; moves: Move[]; started: boolean } {
  const cube = new Cube()
  let cubies = createSolved()
  const saved = loadSaved()
  const moves = saved !== null ? parseMoves(saved) : []
  for (const mv of moves) {
    cubies = applyMove(cubies, mv)
    cube.move(moveToString(mv))
  }
  return { cubies, cube, moves, started: saved !== null }
}

/** Trocea la solución en grupos de 3-4 giros; el último grupo recoge el saldo (1-4). */
function chunkSolution(moves: Move[]): Move[][] {
  const chunks: Move[][] = []
  for (let i = 0; i < moves.length; ) {
    const size = 3 + Math.floor(Math.random() * 2) // 3 o 4
    chunks.push(moves.slice(i, i + size))
    i += size
  }
  return chunks
}

export function useMenuCube(): MenuCubeController {
  const initRef = useRef<ReturnType<typeof buildInitial> | null>(null)
  if (!initRef.current) initRef.current = buildInitial()

  const [cubies, setCubies] = useState<Cubie[]>(initRef.current.cubies)
  const [anim, setAnim] = useState<AnimState | null>(null)
  const [queue, setQueue] = useState<QueuedMove[]>([])
  const [solved, setSolved] = useState(initRef.current.cube.isSolved())
  const [ready, setReady] = useState(false)

  const cubeRef = useRef<Cube>(initRef.current.cube)
  const cubiesRef = useRef(cubies)
  const animRef = useRef(anim)
  // Movimientos aplicados desde el estado resuelto (se persisten en localStorage).
  const movesRef = useRef<Move[]>(initRef.current.moves)
  // ¿El usuario ya había iniciado el cubo en una visita anterior?
  const startedRef = useRef(initRef.current.started)
  const chunksRef = useRef<Move[][]>([])
  const chunkIndexRef = useRef(0)
  // Tras una remezcla animada hay que recalcular los grupos cuando termine.
  const needPrepareRef = useRef(false)
  cubiesRef.current = cubies
  animRef.current = anim

  const busy = anim !== null || queue.length > 0

  /** Calcula la solución del estado actual y la trocea en grupos. */
  const prepareChunks = useCallback(() => {
    const sol = expandHalfTurns(parseMoves(cubeRef.current.clone().solve()))
    chunksRef.current = chunkSolution(sol)
    chunkIndexRef.current = 0
  }, [])

  // Bombea la cola de giros: encadena un movimiento tras otro mientras haya.
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
    })
  }, [anim, queue])

  const _completeAnim = useCallback(() => {
    const a = animRef.current
    if (!a) return
    const updated = applyMove(cubiesRef.current, a.move)
    cubiesRef.current = updated
    cubeRef.current.move(moveToString(a.move))
    const isSolved = cubeRef.current.isSolved()
    // Registra el movimiento y persiste el estado. Al resolverse, la base vuelve
    // a ser el cubo resuelto, así el registro no crece sin límite.
    movesRef.current = isSolved ? [] : [...movesRef.current, a.move]
    saveMoves(movesRef.current)
    setCubies(updated)
    setSolved(isSolved)
    setAnim(null)
  }, [])

  // Cuando termina una remezcla animada (cola vacía), recalcula los grupos.
  useEffect(() => {
    if (busy || !needPrepareRef.current) return
    needPrepareRef.current = false
    ensureSolver() // ya inicializado; resolver es rápido a partir de aquí
    prepareChunks()
    setReady(true)
  }, [busy, prepareChunks])

  // Remezcla animada (rápida): encola movimientos aleatorios sobre el estado actual.
  const rescramble = useCallback(() => {
    const moves = genScramble(SCRAMBLE_LENGTH)
    setReady(false) // no responde a la resolución mientras se mezcla
    setSolved(false)
    needPrepareRef.current = true
    setQueue((q) => [...q, ...moves.map((move) => ({ move, duration: SCRAMBLE_ANIM_DURATION }))])
  }, [])

  // Al cargar hay dos casos:
  //  - Ya iniciado en una visita anterior: el cubo se reconstruye en su posición
  //    guardada; solo preparamos la interacción (sin esperar ni remezclar).
  //  - Primera vez: aparece RESUELTO y, tras 3 segundos, se mezcla de forma animada.
  // El solver de Kociemba se inicializa pronto (bloquea ~0.7 s la primera vez),
  // mientras el cubo está quieto, para que no haya tirón al interactuar/mezclar.
  useEffect(() => {
    let cancelled = false
    if (startedRef.current) {
      const t = setTimeout(() => {
        if (cancelled) return
        ensureSolver()
        prepareChunks()
        setSolved(cubeRef.current.isSolved())
        setReady(true)
      }, 60)
      return () => {
        cancelled = true
        clearTimeout(t)
      }
    }
    const tInit = setTimeout(() => {
      if (!cancelled) ensureSolver()
    }, 60)
    const tScramble = setTimeout(() => {
      if (!cancelled) rescramble()
    }, 3000)
    return () => {
      cancelled = true
      clearTimeout(tInit)
      clearTimeout(tScramble)
    }
  }, [rescramble, prepareChunks])

  const interact = useCallback(
    (kind: 'hover' | 'tap') => {
      if (busy || !ready) return
      if (solved) {
        if (kind === 'tap') rescramble() // resuelto: solo la pulsación remezcla
        return
      }
      const next = chunksRef.current[chunkIndexRef.current]
      if (!next) return
      chunkIndexRef.current += 1
      setQueue((q) => [...q, ...next.map((move) => ({ move, duration: ANIM_DURATION }))])
    },
    [busy, ready, solved, rescramble],
  )

  return { cubies, anim, solved, ready, interact, _completeAnim }
}
