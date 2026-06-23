import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { Cubie } from './Cubie'
import { dragToMove, type Cubie as CubieData, type Face, type Vec3 } from './engine'
import { type AnimState, type CubeController } from './useCube'
import type { ViewControlsHandle } from '../../ViewControls'

/** CubeView solo necesita estos campos del controlador (cualquier modo). */
type RenderController = Pick<CubeController, 'cubies' | 'anim' | '_completeAnim'>

/** Píxeles de arrastre a partir de los cuales se confirma un giro de capa. */
const DRAG_THRESHOLD = 14

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

/**
 * Renderiza el cubo dentro del <Canvas> y anima los giros.
 *
 * Los cubies de la capa que gira se renderizan dentro de un grupo "pivote" que
 * rota sobre el eje del movimiento; el resto se renderiza en su sitio. Al acabar
 * la animación se confirma el giro (actualiza el estado lógico) y los cubies
 * pasan a su nueva posición sin salto visual.
 */
export function CubeView({
  controller,
  hideColors = false,
  onTurn,
  controlsRef,
}: {
  controller: RenderController
  hideColors?: boolean
  /** Si se pasa, se puede girar una capa arrastrando sobre el cubo (ratón/táctil). */
  onTurn?: (face: Face, prime: boolean) => void
  /** Controles de cámara: se desactivan mientras dura un arrastre de giro. */
  controlsRef?: RefObject<ViewControlsHandle | null>
}) {
  const { cubies, anim, _completeAnim } = controller
  const pivotRef = useRef<Group>(null)
  const elapsed = useRef(0)
  const currentAnim = useRef<AnimState | null>(null)
  const completed = useRef(false)
  const camera = useThree((s) => s.camera)

  // Arrastre en curso sobre el cubo: cara tocada, cubie y punto de inicio.
  const dragRef = useRef<{
    normal: Vec3
    pos: Vec3
    x0: number
    y0: number
    committed: boolean
  } | null>(null)

  // Inicio del gesto (en el pointerdown sobre una pieza): registra el arrastre y
  // desactiva el orbitado de la vista para que TrackballControls no lo capture.
  const onTurnStart = useMemo(
    () =>
      onTurn
        ? (cubie: CubieData, normal: Vec3, e: ThreeEvent<PointerEvent>) => {
            if (controlsRef?.current) controlsRef.current.enabled = false
            dragRef.current = {
              normal,
              pos: cubie.pos,
              x0: e.nativeEvent.clientX,
              y0: e.nativeEvent.clientY,
              committed: false,
            }
          }
        : undefined,
    [onTurn, controlsRef],
  )

  // Move/up a nivel window: el dedo puede salirse de la pieza al arrastrar.
  useEffect(() => {
    if (!onTurn) return
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || d.committed) return
      const dx = e.clientX - d.x0
      const dy = e.clientY - d.y0
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      // Ejes de pantalla de la cámara (columnas 0 y 1 de su matrixWorld).
      const m = camera.matrixWorld.elements
      const camRight: Vec3 = [m[0], m[1], m[2]]
      const camUp: Vec3 = [m[4], m[5], m[6]]
      const mv = dragToMove(d.normal, d.pos, dx, dy, camRight, camUp)
      if (mv) onTurn(mv.face, mv.prime)
      d.committed = true // un giro por gesto
    }
    const onEnd = () => {
      if (!dragRef.current) return
      dragRef.current = null
      if (controlsRef?.current) controlsRef.current.enabled = true
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  }, [onTurn, camera, controlsRef])

  const axisV3 = useMemo(
    () => (anim ? new Vector3(anim.axis[0], anim.axis[1], anim.axis[2]) : null),
    [anim],
  )

  useFrame((_, delta) => {
    const pivot = pivotRef.current
    if (!anim || !axisV3) {
      if (pivot) pivot.rotation.set(0, 0, 0)
      return
    }
    // Nueva animación: reinicia el cronómetro.
    if (currentAnim.current !== anim) {
      currentAnim.current = anim
      elapsed.current = 0
      completed.current = false
    }
    elapsed.current += delta
    const t = Math.min(elapsed.current / anim.duration, 1)
    if (pivot) pivot.setRotationFromAxisAngle(axisV3, easeInOutQuad(t) * anim.angle)
    if (t >= 1 && !completed.current) {
      completed.current = true
      _completeAnim()
    }
  })

  return (
    <group>
      {cubies.map((c) =>
        anim?.ids.has(c.id) ? null : (
          <Cubie key={c.id} cubie={c} hideColors={hideColors} onTurnStart={onTurnStart} />
        ),
      )}
      <group ref={pivotRef}>
        {anim &&
          cubies
            .filter((c) => anim.ids.has(c.id))
            .map((c) => (
              <Cubie key={c.id} cubie={c} hideColors={hideColors} onTurnStart={onTurnStart} />
            ))}
      </group>
    </group>
  )
}
