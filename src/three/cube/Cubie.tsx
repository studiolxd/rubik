import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Matrix4, Quaternion } from 'three'
import type { Cubie as CubieData, Mat3, Vec3 } from './engine'

/** Separación entre centros de cubies (las posiciones lógicas son -1, 0, 1). */
const SPACING = 1.0
/** Tamaño del cuerpo del cubie. Casi igual a SPACING: las piezas se tocan
 *  dejando solo una ranura fina (gap 0.02), como un cubo real. */
const BODY = 0.98
/** Radio de las esquinas redondeadas (sutil, para que las piezas se vean unidas). */
const BODY_RADIUS = 0.03
/** Distancia del plano de pegatina al centro del cubie. */
const STICKER_OFFSET = BODY / 2 + 0.002
/** Pegatina grande (cubre casi toda la cara) para un borde negro fino. */
const STICKER_SIZE = 0.91

/** Colores clásicos por cara (en el estado resuelto). */
const COLORS = {
  R: '#b71234', // derecha  → rojo
  L: '#ff5800', // izquierda → naranja
  U: '#ffffff', // arriba   → blanco
  D: '#ffd500', // abajo    → amarillo
  F: '#009b48', // frente   → verde
  B: '#0046ad', // atrás    → azul
} as const

interface Sticker {
  color: string
  position: [number, number, number]
  rotation: [number, number, number]
}

const H = Math.PI / 2

/** Pegatinas de un cubie según su posición resuelta (`home`). Son locales: rotan con la pieza. */
function stickersFor(home: Vec3): Sticker[] {
  const out: Sticker[] = []
  if (home[0] === 1) out.push({ color: COLORS.R, position: [STICKER_OFFSET, 0, 0], rotation: [0, H, 0] })
  if (home[0] === -1) out.push({ color: COLORS.L, position: [-STICKER_OFFSET, 0, 0], rotation: [0, -H, 0] })
  if (home[1] === 1) out.push({ color: COLORS.U, position: [0, STICKER_OFFSET, 0], rotation: [-H, 0, 0] })
  if (home[1] === -1) out.push({ color: COLORS.D, position: [0, -STICKER_OFFSET, 0], rotation: [H, 0, 0] })
  if (home[2] === 1) out.push({ color: COLORS.F, position: [0, 0, STICKER_OFFSET], rotation: [0, 0, 0] })
  if (home[2] === -1) out.push({ color: COLORS.B, position: [0, 0, -STICKER_OFFSET], rotation: [0, Math.PI, 0] })
  return out
}

/** Convierte la matriz de orientación entera (3×3) en un quaternion para three. */
function mat3ToQuaternion(m: Mat3): [number, number, number, number] {
  const m4 = new Matrix4().set(
    m[0], m[1], m[2], 0,
    m[3], m[4], m[5], 0,
    m[6], m[7], m[8], 0,
    0, 0, 0, 1,
  )
  const q = new Quaternion().setFromRotationMatrix(m4)
  return [q.x, q.y, q.z, q.w]
}

export function Cubie({ cubie }: { cubie: CubieData }) {
  const position = useMemo<[number, number, number]>(
    () => [cubie.pos[0] * SPACING, cubie.pos[1] * SPACING, cubie.pos[2] * SPACING],
    [cubie.pos],
  )
  const quaternion = useMemo(() => mat3ToQuaternion(cubie.rot), [cubie.rot])
  const stickers = useMemo(() => stickersFor(cubie.home), [cubie.home])

  return (
    <group position={position} quaternion={quaternion}>
      <RoundedBox args={[BODY, BODY, BODY]} radius={BODY_RADIUS} smoothness={4}>
        <meshStandardMaterial color="#0a0a0a" roughness={0.55} metalness={0.05} />
      </RoundedBox>
      {stickers.map((s, i) => (
        <mesh key={i} position={s.position} rotation={s.rotation}>
          <planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
          <meshStandardMaterial color={s.color} roughness={0.4} metalness={0} />
        </mesh>
      ))}
    </group>
  )
}
