import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CubeView } from './cube/CubeView'
import type { CubeController } from './cube/useCube'

/**
 * Viewport 3D. Aquí vive todo lo de Three.js / React Three Fiber.
 * El resto de la app es HTML de React.
 */
export function Scene({ controller }: { controller: CubeController }) {
  return (
    <Canvas camera={{ position: [5, 5, 6], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={['#0f1115']} />

      {/* Iluminación */}
      <ambientLight intensity={0.75} />
      <directionalLight position={[6, 9, 6]} intensity={1.3} />
      <directionalLight position={[-6, -2, -6]} intensity={0.35} />

      <CubeView controller={controller} />

      {/* Órbita con el ratón: rotar y zoom, sin desplazamiento lateral. */}
      <OrbitControls enablePan={false} minDistance={5} maxDistance={16} />
    </Canvas>
  )
}
