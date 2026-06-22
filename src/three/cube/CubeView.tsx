import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { Cubie } from './Cubie'
import { type AnimState, type CubeController } from './useCube'

/** CubeView solo necesita estos campos del controlador (cualquier modo). */
type RenderController = Pick<CubeController, 'cubies' | 'anim' | '_completeAnim'>

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
}: {
  controller: RenderController
  hideColors?: boolean
}) {
  const { cubies, anim, _completeAnim } = controller
  const pivotRef = useRef<Group>(null)
  const elapsed = useRef(0)
  const currentAnim = useRef<AnimState | null>(null)
  const completed = useRef(false)

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
        anim?.ids.has(c.id) ? null : <Cubie key={c.id} cubie={c} hideColors={hideColors} />,
      )}
      <group ref={pivotRef}>
        {anim &&
          cubies
            .filter((c) => anim.ids.has(c.id))
            .map((c) => <Cubie key={c.id} cubie={c} hideColors={hideColors} />)}
      </group>
    </group>
  )
}
