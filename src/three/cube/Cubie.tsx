import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { Color, Matrix4, Quaternion } from 'three'
import type { Cubie as CubieData, Mat3, Vec3 } from './engine'

/** Separación entre centros de cubies (las posiciones lógicas son -1, 0, 1). */
const SPACING = 1.0
/** Tamaño del cuerpo del cubie. Prácticamente igual a SPACING: las piezas se
 *  tocan (hueco 0.005, invisible pero evita z-fighting). Como los giros son sobre
 *  un eje, las capas nunca se solapan al animar. */
const BODY = 0.995
/** Radio de las esquinas redondeadas (mínimo, solo un leve bisel). */
const BODY_RADIUS = 0.02
/** Distancia del plano de pegatina al centro del cubie. */
const STICKER_OFFSET = BODY / 2 + 0.002
/** Pegatina que cubre casi toda la cara: línea de rejilla negra muy fina (~0.05). */
const STICKER_SIZE = 0.95

/** Lee un token de color desde las variables CSS (definidas en styles/tokens.css), con
 *  un hex de reserva por si el documento aún no está disponible. */
function token(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

/** Colores clásicos por cara (en el estado resuelto). Fuente: tokens `--cube-face-*` en styles/tokens.css. */
const COLORS = {
  R: token('--cube-face-right', '#b71234'), // derecha   → rojo
  L: token('--cube-face-left', '#ff8a1f'), // izquierda → naranja
  U: token('--cube-face-up', '#ffffff'), // arriba    → blanco
  D: token('--cube-face-down', '#ffd500'), // abajo     → amarillo
  F: token('--cube-face-front', '#009b48'), // frente    → verde
  B: token('--cube-face-back', '#0046ad'), // atrás     → azul
} as const

/** Color del cuerpo de cada pieza (token `--cube-body`). */
const BODY_COLOR = token('--cube-body', '#0a0a0a')

/** Color "sin color" de las pegatinas (cubo oculto, p. ej. antes de empezar el crono).
 *  Es el gris más claro de marca. */
const BLANK_COLOR = token('--cube-blank', '#f2f2f2')

/** Versión "apagada" de un color: el mismo tono mezclado hacia un gris.
 *  Se mezcla hacia gris (no hacia blanco) para que también las piezas blancas
 *  se atenúen y así el centro blanco resaltado destaque sobre sus vecinas. */
const DIM_COLOR = '#9a9a9a'
const DIM_AMOUNT = 0.4
const DIM_AMOUNT_LIGHT = 0.6
function fade(color: string): string {
  const c = new Color(color)
  // Las piezas claras (blanco) necesitan más gris para que se note la atenuación.
  const isLight = (c.r + c.g + c.b) / 3 > 0.8
  return '#' + c.lerp(new Color(DIM_COLOR), isLight ? DIM_AMOUNT_LIGHT : DIM_AMOUNT).getHexString()
}

interface Sticker {
  color: string
  position: [number, number, number]
  rotation: [number, number, number]
}

const H = Math.PI / 2

/** Pegatinas de un cubie según su posición resuelta (`home`). Son locales: rotan con la pieza. */
function stickersFor(home: Vec3): Sticker[] {
  const out: Sticker[] = []
  if (home[0] === 1)
    out.push({ color: COLORS.R, position: [STICKER_OFFSET, 0, 0], rotation: [0, H, 0] })
  if (home[0] === -1)
    out.push({ color: COLORS.L, position: [-STICKER_OFFSET, 0, 0], rotation: [0, -H, 0] })
  if (home[1] === 1)
    out.push({ color: COLORS.U, position: [0, STICKER_OFFSET, 0], rotation: [-H, 0, 0] })
  if (home[1] === -1)
    out.push({ color: COLORS.D, position: [0, -STICKER_OFFSET, 0], rotation: [H, 0, 0] })
  if (home[2] === 1)
    out.push({ color: COLORS.F, position: [0, 0, STICKER_OFFSET], rotation: [0, 0, 0] })
  if (home[2] === -1)
    out.push({ color: COLORS.B, position: [0, 0, -STICKER_OFFSET], rotation: [0, Math.PI, 0] })
  return out
}

/** Convierte la matriz de orientación entera (3×3) en un quaternion para three. */
function mat3ToQuaternion(m: Mat3): [number, number, number, number] {
  const m4 = new Matrix4().set(
    m[0],
    m[1],
    m[2],
    0,
    m[3],
    m[4],
    m[5],
    0,
    m[6],
    m[7],
    m[8],
    0,
    0,
    0,
    0,
    1,
  )
  const q = new Quaternion().setFromRotationMatrix(m4)
  return [q.x, q.y, q.z, q.w]
}

export function Cubie({
  cubie,
  hideColors = false,
  dim = false,
  onPick,
  onTurnStart,
}: {
  cubie: CubieData
  hideColors?: boolean
  /** Atenúa la pieza (pegatinas casi transparentes) para destacar otras. */
  dim?: boolean
  /** Si se pasa, la pieza es clicable (y muestra cursor de mano al pasar por encima). */
  onPick?: () => void
  /**
   * Si se pasa, al iniciar un arrastre sobre la pieza se notifica la cara tocada
   * (normal en mundo, redondeada a ±eje) y el cubie, para girar esa capa.
   */
  onTurnStart?: (cubie: CubieData, normal: Vec3, e: ThreeEvent<PointerEvent>) => void
}) {
  const position = useMemo<[number, number, number]>(
    () => [cubie.pos[0] * SPACING, cubie.pos[1] * SPACING, cubie.pos[2] * SPACING],
    [cubie.pos],
  )
  const quaternion = useMemo(() => mat3ToQuaternion(cubie.rot), [cubie.rot])
  const stickers = useMemo(() => stickersFor(cubie.home), [cubie.home])

  const handlers: Record<string, unknown> = {}
  if (onPick) {
    handlers.onClick = (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation() // solo la pieza más cercana al puntero
      onPick()
    }
    handlers.onPointerOver = (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      document.body.style.cursor = 'pointer'
    }
    handlers.onPointerOut = () => {
      document.body.style.cursor = 'default'
    }
  }
  if (onTurnStart) {
    handlers.onPointerDown = (e: ThreeEvent<PointerEvent>) => {
      if (!e.face) return
      e.stopPropagation() // solo la pieza más cercana
      // Normal de la cara tocada en mundo; redondeada da uno de ±X/±Y/±Z porque
      // el cubo está alineado con los ejes del mundo.
      const n = e.face.normal.clone().transformDirection(e.object.matrixWorld)
      const normal: Vec3 = [Math.round(n.x), Math.round(n.y), Math.round(n.z)]
      onTurnStart(cubie, normal, e)
    }
  }

  return (
    <group position={position} quaternion={quaternion} {...handlers}>
      <RoundedBox args={[BODY, BODY, BODY]} radius={BODY_RADIUS} smoothness={4}>
        <meshStandardMaterial color={BODY_COLOR} roughness={0.55} metalness={0.05} />
      </RoundedBox>
      {stickers.map((s, i) => (
        <mesh key={i} position={s.position} rotation={s.rotation}>
          <planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
          <meshStandardMaterial
            color={hideColors ? BLANK_COLOR : dim ? fade(s.color) : s.color}
            roughness={0.4}
            metalness={0}
          />
        </mesh>
      ))}
    </group>
  )
}
