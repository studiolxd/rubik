import { useCallback, useEffect, useRef, useState } from 'react'
import {
  affectedIds,
  applyMove,
  createSolved,
  FACE_DEFS,
  moveAngle,
  type Cubie,
  type Face,
  type Move,
} from './engine'
import { ANIM_DURATION, type AnimState, type QueuedMove } from './useCube'

/** Controlador sencillo para practicar giros: arranca RESUELTO y anima cada movimiento. */
export interface MovesCubeController {
  cubies: Cubie[]
  anim: AnimState | null
  busy: boolean
  /** Encola un giro (cara + sentido) que se animará. */
  doMove: (face: Face, prime?: boolean) => void
  /** Devuelve el cubo a su estado resuelto. */
  reset: () => void
  _completeAnim: () => void
}

export function useMovesCube(): MovesCubeController {
  const [cubies, setCubies] = useState<Cubie[]>(() => createSolved())
  const [anim, setAnim] = useState<AnimState | null>(null)
  const [queue, setQueue] = useState<QueuedMove[]>([])

  const cubiesRef = useRef(cubies)
  const animRef = useRef(anim)
  cubiesRef.current = cubies
  animRef.current = anim

  const busy = anim !== null || queue.length > 0

  // Bombea la cola: arranca el siguiente giro cuando no hay animación en curso.
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
    setCubies(updated)
    setAnim(null)
  }, [])

  const doMove = useCallback((face: Face, prime = false) => {
    const move: Move = { face, power: prime ? 3 : 1 }
    setQueue((q) => [...q, { move, duration: ANIM_DURATION }])
  }, [])

  const reset = useCallback(() => {
    const fresh = createSolved()
    cubiesRef.current = fresh
    setCubies(fresh)
    setAnim(null)
    setQueue([])
  }, [])

  return { cubies, anim, busy, doMove, reset, _completeAnim }
}
