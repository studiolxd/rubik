import { type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { TrackballControls } from '@react-three/drei'
import { CubeView } from './three/cube/CubeView'
import type { Face } from './three/cube/engine'
import type { MovesCubeController } from './three/cube/useMovesCube'
import type { ViewControlsHandle } from './ViewControls'

/**
 * Cubo interactivo para practicar giros (sección "Comprendiendo los movimientos").
 * Renderiza y anima los giros del `controller`; orientable como el resto de la intro.
 */
export function MovesCube({
  controller,
  controlsRef,
  onTurn,
}: {
  controller: MovesCubeController
  controlsRef?: RefObject<ViewControlsHandle | null>
  /** Girar una capa arrastrando sobre el cubo (ratón/táctil). */
  onTurn?: (face: Face, prime: boolean) => void
}) {
  return (
    <Canvas camera={{ position: [5, 5, 5], fov: 40 }} dpr={[1, 2]}>
      <color attach="background" args={['#ffffff']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 9, 6]} intensity={1.1} />
      <directionalLight position={[-6, -2, -6]} intensity={0.4} />

      <CubeView controller={controller} onTurn={onTurn} controlsRef={controlsRef} />

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
