import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Quaternion, Vector3 } from 'three'
import { CubeView } from './three/cube/CubeView'
import { useMenuCube } from './three/cube/useMenuCube'

/** Inclinación de "apoyado en una esquina" (la misma idea que el SVG: 17°). */
const TILT = (17 * Math.PI) / 180

/**
 * Avisa una sola vez cuando el Canvas ha pintado su primer frame (el cubo WebGL
 * ya está dibujado). La portada lo usa para desvanecer el overlay de carga.
 */
function FirstFrameSignal({ onReady }: { onReady: () => void }) {
  const fired = useRef(false)
  useFrame(() => {
    if (!fired.current) {
      fired.current = true
      onReady()
    }
  })
  return null
}

/**
 * Cubo decorativo e interactivo de la portada.
 *
 * Arranca en una posición FIJA que reproduce la del `cube-solved-corner.svg`
 * (amarillo arriba, azul a la izquierda, rojo a la derecha, ligeramente
 * ladeado como si se apoyara en una esquina). Al hacer hover (ratón) o pulsar
 * (táctil) ejecuta el siguiente grupo de 3-4 giros de la solución; el último
 * grupo recoge el saldo. Resuelto, una pulsación lo vuelve a mezclar.
 */
export function MenuCube({ onReady }: { onReady?: () => void }) {
  const controller = useMenuCube()

  // Cámara isométrica desde el rincón (+,+,+): vemos las caras +x (derecha),
  // +y (arriba) y +z (izquierda). El cubo, sin girar, mostraría blanco/rojo/verde.
  // Para que coincida con el SVG (amarillo/azul/rojo) lo volteamos 180° sobre X
  // y lo rodamos un poco sobre el eje de visión para darle el ladeo del SVG.
  const rollQuat = useMemo(
    () => new Quaternion().setFromAxisAngle(new Vector3(1, 1, 1).normalize(), -TILT),
    [],
  )

  return (
    <div
      className="menu__cube"
      role="button"
      tabIndex={0}
      aria-label="Cubo de Rubik interactivo: pasa el ratón o pulsa para resolverlo"
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') controller.interact('hover')
      }}
      onClick={() => controller.interact('tap')}
    >
      <Canvas camera={{ position: [5, 5, 5], fov: 40 }} dpr={[1, 2]}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 9, 6]} intensity={1.1} />
        <directionalLight position={[-6, -2, -6]} intensity={0.4} />
        {/* Roll sobre el eje de visión (ladeo) → volteo 180° sobre X (coloca
            amarillo arriba, azul a la izquierda, rojo a la derecha). */}
        <group quaternion={rollQuat}>
          <group rotation={[Math.PI, 0, 0]}>
            <CubeView controller={controller} />
          </group>
        </group>
        {onReady && <FirstFrameSignal onReady={onReady} />}
      </Canvas>
    </div>
  )
}
