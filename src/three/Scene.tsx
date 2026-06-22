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
      {/* Fondo claro (gris-más-claro de la marca, --color-grey-lightest). */}
      <color attach="background" args={['#f2f2f2']} />

      {/* Iluminación ajustada para fondo claro */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 9, 6]} intensity={1.1} />
      <directionalLight position={[-6, -2, -6]} intensity={0.4} />

      <CubeView controller={controller} />

      {/* Órbita con el ratón: rotar y zoom, sin desplazamiento lateral. */}
      <OrbitControls enablePan={false} minDistance={5} maxDistance={16} />
    </Canvas>
  )
}
