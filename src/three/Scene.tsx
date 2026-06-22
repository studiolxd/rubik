import { type Ref } from 'react'
import { Canvas } from '@react-three/fiber'
import { TrackballControls } from '@react-three/drei'
import { CubeView } from './cube/CubeView'
import type { CubeController } from './cube/useCube'
import type { ViewControlsHandle } from '../ViewControls'

/**
 * Viewport 3D. Aquí vive todo lo de Three.js / React Three Fiber.
 * El resto de la app es HTML de React.
 */
export function Scene({
  controller,
  controlsRef,
  hideColors = false,
}: {
  controller: CubeController
  controlsRef?: Ref<ViewControlsHandle>
  hideColors?: boolean
}) {
  return (
    <Canvas camera={{ position: [5, 5, 6], fov: 42 }} dpr={[1, 2]}>
      {/* Fondo blanco. */}
      <color attach="background" args={['#ffffff']} />

      {/* Iluminación ajustada para fondo claro */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 9, 6]} intensity={1.1} />
      <directionalLight position={[-6, -2, -6]} intensity={0.4} />

      <CubeView controller={controller} hideColors={hideColors} />

      {/* Rotación libre 360° en cualquier eje (incluido el vertical) + zoom, sin
          desplazamiento lateral. TrackballControls no fija un "arriba", así que el
          cubo puede quedar ladeado: es el precio de poder darle la vuelta entera. */}
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
