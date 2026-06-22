import { type Ref } from 'react'
import { Canvas } from '@react-three/fiber'
import { TrackballControls } from '@react-three/drei'
import { CubeView } from './three/cube/CubeView'
import type { MovesCubeController } from './three/cube/useMovesCube'
import type { ViewControlsHandle } from './ViewControls'

/**
 * Cubo interactivo para practicar giros (sección "Comprendiendo los movimientos").
 * Renderiza y anima los giros del `controller`; orientable como el resto de la intro.
 */
export function MovesCube({
  controller,
  controlsRef,
}: {
  controller: MovesCubeController
  controlsRef?: Ref<ViewControlsHandle>
}) {
  return (
    <Canvas camera={{ position: [5, 5, 5], fov: 40 }} dpr={[1, 2]}>
      <color attach="background" args={['#ffffff']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 9, 6]} intensity={1.1} />
      <directionalLight position={[-6, -2, -6]} intensity={0.4} />

      <CubeView controller={controller} />

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
