import { type RefObject, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { TrackballControls } from '@react-three/drei'
import type { PerspectiveCamera } from 'three'
import { CubeView } from './cube/CubeView'
import type { CubeController } from './cube/useCube'
import type { Face } from './cube/engine'
import type { ViewControlsHandle } from '../ViewControls'

/** Radio de la esfera que envuelve el cubo 3×3 (esquina→centro ≈ 1.5·√3). */
const CUBE_RADIUS = 2.6
/** Aire alrededor del cubo al encuadrar. */
const FIT_MARGIN = 1.2
/** Distancia de cámara por defecto (la del encuadre de escritorio: |[5,5,6]|). */
const BASE_DISTANCE = Math.hypot(5, 5, 6)

/**
 * Aleja la cámara cuando el viewport es estrecho (móvil en retrato) para que el
 * cubo quepa entero con aire. El fov de la cámara es vertical: en pantallas
 * estrechas el fov horizontal se cierra y, sin esto, el cubo se desborda a lo
 * ancho. Solo aumenta la distancia (nunca por debajo del encuadre de escritorio)
 * y conserva el ángulo de vista actual.
 */
function FitCamera({ controlsRef }: { controlsRef?: RefObject<ViewControlsHandle | null> }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)

  useEffect(() => {
    const fovV = (camera.fov * Math.PI) / 180
    const aspect = size.width / size.height
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect)
    // El lado con menor fov es el que limita el encuadre.
    const limiting = Math.min(fovV, fovH)
    const dist = Math.max(BASE_DISTANCE, (CUBE_RADIUS * FIT_MARGIN) / Math.sin(limiting / 2))

    camera.position.setLength(dist)
    camera.updateProjectionMatrix()

    const c = controlsRef?.current
    if (c) {
      c.position0.setLength(dist) // que reset() vuelva a esta distancia ajustada
      c.update()
    }
  }, [camera, size, controlsRef])

  return null
}

/**
 * Viewport 3D. Aquí vive todo lo de Three.js / React Three Fiber.
 * El resto de la app es HTML de React.
 */
export function Scene({
  controller,
  controlsRef,
  hideColors = false,
  onTurn,
}: {
  controller: CubeController
  controlsRef?: RefObject<ViewControlsHandle | null>
  hideColors?: boolean
  /** Si se pasa, se gira una capa arrastrando sobre el cubo (ratón/táctil). */
  onTurn?: (face: Face, prime: boolean) => void
}) {
  return (
    <Canvas camera={{ position: [5, 5, 6], fov: 42 }} dpr={[1, 2]}>
      {/* Fondo blanco. */}
      <color attach="background" args={['#ffffff']} />

      {/* Iluminación ajustada para fondo claro */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 9, 6]} intensity={1.1} />
      <directionalLight position={[-6, -2, -6]} intensity={0.4} />

      <CubeView
        controller={controller}
        hideColors={hideColors}
        onTurn={onTurn}
        controlsRef={controlsRef}
      />

      {/* Rotación libre 360° en cualquier eje (incluido el vertical) + zoom, sin
          desplazamiento lateral. TrackballControls no fija un "arriba", así que el
          cubo puede quedar ladeado: es el precio de poder darle la vuelta entera. */}
      <TrackballControls
        ref={controlsRef as never}
        noPan
        rotateSpeed={3}
        minDistance={5}
        maxDistance={20}
      />

      {/* Encuadra el cubo según el aspect ratio (clave en móvil/retrato). */}
      <FitCamera controlsRef={controlsRef} />
    </Canvas>
  )
}
