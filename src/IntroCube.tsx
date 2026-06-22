import { useMemo, type Ref } from 'react'
import { Canvas } from '@react-three/fiber'
import { TrackballControls } from '@react-three/drei'
import { createSolved, type Cubie as CubieData } from './three/cube/engine'
import { Cubie } from './three/cube/Cubie'
import type { ViewControlsHandle } from './ViewControls'

/** Predicado de resaltado: las piezas que devuelvan `true` se ven a color; el resto se atenúa. */
export type CubieFocus = (cubie: CubieData) => boolean

/**
 * Cubo resuelto, estático y orientable, para la sección "Introducción al cubo".
 * Si se pasa `focus`, resalta esas piezas y atenúa las demás (efecto foco).
 * `controlsRef` expone los controles de cámara para los botones de zoom/restaurar.
 */
export function IntroCube({
  focus,
  controlsRef,
  onPick,
}: {
  focus?: CubieFocus
  controlsRef?: Ref<ViewControlsHandle>
  /** Click sobre una pieza resaltada (las que cumplen `focus`). */
  onPick?: (cubie: CubieData) => void
}) {
  const cubies = useMemo(() => createSolved(), [])

  return (
    <Canvas camera={{ position: [5, 5, 5], fov: 40 }} dpr={[1, 2]}>
      <color attach="background" args={['#ffffff']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 9, 6]} intensity={1.1} />
      <directionalLight position={[-6, -2, -6]} intensity={0.4} />

      <group>
        {cubies.map((c) => {
          const highlighted = focus ? focus(c) : true
          return (
            <Cubie
              key={c.id}
              cubie={c}
              dim={!highlighted}
              onPick={onPick && highlighted ? () => onPick(c) : undefined}
            />
          )
        })}
      </group>

      {/* Giro libre 360° + zoom, sin desplazamiento lateral (igual que la escena principal). */}
      <TrackballControls
        ref={controlsRef as never}
        noPan
        rotateSpeed={3}
        minDistance={5}
        maxDistance={16}
      />
    </Canvas>
  )
}
