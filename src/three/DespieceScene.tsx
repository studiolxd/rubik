import { useMemo, useRef } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox, TrackballControls } from '@react-three/drei'
import { CatmullRomCurve3, Group, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import { createSolved, type Cubie, type Vec3 } from './cube/engine'

/**
 * Escena 3D de despiece para "Saber más": muestra de qué está hecho un cubo de
 * Rubik por dentro. Reutiliza la geometría procedural del cubo (RoundedBox +
 * pegatinas) y añade el mecanismo interno —núcleo de 3 brazos, tornillo y
 * muelle— modelado también por código.
 *
 * No depende del motor de juego (`useCube`): es un cubo resuelto estático que
 * se "explosiona" por pasos. Toda la animación es interpolación por frame.
 */

export type PartId = 'centro' | 'arista' | 'esquina' | 'nucleo' | 'tornillo' | 'muelle'

// --- Tokens y constantes (espejo de Cubie.tsx para no acoplar ambos) --------

function token(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

const COLORS = {
  R: token('--cube-face-right', '#b71234'),
  L: token('--cube-face-left', '#ff8a1f'),
  U: token('--cube-face-up', '#ffffff'),
  D: token('--cube-face-down', '#ffd500'),
  F: token('--cube-face-front', '#009b48'),
  B: token('--cube-face-back', '#0046ad'),
} as const
const BODY_COLOR = token('--cube-body', '#0a0a0a')

const SPACING = 1
const BODY = 0.995
const BODY_RADIUS = 0.02
const STICKER_OFFSET = BODY / 2 + 0.002
const STICKER_SIZE = 0.95
const H = Math.PI / 2

/** Velocidad de interpolación (lerp) común a todas las animaciones por frame. */
const EASE = 0.16

interface Sticker {
  color: string
  position: [number, number, number]
  rotation: [number, number, number]
}

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

type PieceType = 'centro' | 'arista' | 'esquina'

/** Tipo de pieza según cuántas coordenadas de su posición resuelta son ≠ 0. */
function typeOf(home: Vec3): PieceType {
  const n = home.filter((v) => v !== 0).length
  return n === 1 ? 'centro' : n === 2 ? 'arista' : 'esquina'
}

// --- Pasos del despiece -----------------------------------------------------

const eq = (a: Vec3, b: Vec3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
const scale = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k]

/** Piezas protagonistas que se extraen una a una. */
const FEATURED_CORNER: Vec3 = [1, 1, 1]
const FEATURED_EDGE: Vec3 = [1, 1, 0]
const FEATURED_CENTER: Vec3 = [0, 0, 1]

/** Desplazamiento extra (sobre la posición de rejilla) de una pieza en cada paso. */
function offsetFor(home: Vec3, stage: number): Vec3 {
  switch (stage) {
    case 1:
      return eq(home, FEATURED_CORNER) ? scale(home, 1.1) : [0, 0, 0]
    case 2:
      return eq(home, FEATURED_CORNER) || eq(home, FEATURED_EDGE) ? scale(home, 1.1) : [0, 0, 0]
    case 4:
      return eq(home, FEATURED_CENTER) ? scale(home, 1.0) : [0, 0, 0]
    case 5:
      return scale(home, 1.0)
    default:
      return [0, 0, 0]
  }
}

/** Opacidad de una pieza en cada paso (las externas se atenúan en modo rayos X). */
function opacityFor(home: Vec3, stage: number): number {
  const external = typeOf(home) !== 'centro'
  if ((stage === 3 || stage === 4) && external) return 0.1
  return 1
}

// --- Piezas de color (cuerpo + pegatinas) -----------------------------------

/** Recorre un subárbol aplicando lerp de opacidad y resaltado a sus materiales. */
function animateMaterials(root: Group, opacity: number, selected: boolean) {
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      const mm = m as MeshStandardMaterial
      mm.transparent = true
      mm.opacity += (opacity - mm.opacity) * EASE
      mm.depthWrite = mm.opacity > 0.9
      if (mm.emissive) {
        const target = selected ? 0.32 : 0
        mm.emissiveIntensity += (target - mm.emissiveIntensity) * 0.2
      }
    }
  })
}

function AnimatedCubie({
  cubie,
  offset,
  opacity,
  selected,
  onPick,
}: {
  cubie: Cubie
  offset: Vec3
  opacity: number
  selected: boolean
  onPick: () => void
}) {
  const ref = useRef<Group>(null)
  const stickers = useMemo(() => stickersFor(cubie.home), [cubie.home])
  const target = useMemo(
    () =>
      new Vector3(
        cubie.pos[0] * SPACING + offset[0],
        cubie.pos[1] * SPACING + offset[1],
        cubie.pos[2] * SPACING + offset[2],
      ),
    [cubie.pos, offset],
  )

  useFrame(() => {
    const g = ref.current
    if (!g) return
    g.position.lerp(target, EASE)
    const s = selected ? 1.12 : 1
    g.scale.x += (s - g.scale.x) * 0.2
    g.scale.y = g.scale.x
    g.scale.z = g.scale.x
    animateMaterials(g, opacity, selected)
  })

  return (
    <group
      ref={ref}
      position={[cubie.pos[0] * SPACING, cubie.pos[1] * SPACING, cubie.pos[2] * SPACING]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        onPick()
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default'
      }}
    >
      <RoundedBox args={[BODY, BODY, BODY]} radius={BODY_RADIUS} smoothness={4}>
        <meshStandardMaterial
          color={BODY_COLOR}
          roughness={0.55}
          metalness={0.05}
          emissive="#ffffff"
          emissiveIntensity={0}
        />
      </RoundedBox>
      {stickers.map((s, i) => (
        <mesh key={i} position={s.position} rotation={s.rotation}>
          <planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
          <meshStandardMaterial
            color={s.color}
            roughness={0.4}
            metalness={0}
            emissive="#ffffff"
            emissiveIntensity={0}
          />
        </mesh>
      ))}
    </group>
  )
}

// --- Mecanismo interno (núcleo + tornillos + muelles) -----------------------

/** Hélice (en el eje +Y local) que usaremos como muelle alrededor del tornillo. */
function helixCurve(): CatmullRomCurve3 {
  const pts: Vector3[] = []
  const turns = 5
  const radius = 0.12
  const y0 = 0.32
  const y1 = 0.92
  const seg = 90
  for (let i = 0; i <= seg; i++) {
    const u = i / seg
    const a = u * turns * Math.PI * 2
    pts.push(new Vector3(Math.cos(a) * radius, y0 + (y1 - y0) * u, Math.sin(a) * radius))
  }
  return new CatmullRomCurve3(pts)
}

/** Las 6 direcciones de los centros (un brazo del núcleo por cada una). */
const CENTER_DIRS: Vec3[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]

function pickHandlers(active: boolean, onSelect: () => void) {
  if (!active) return {}
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      onSelect()
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      document.body.style.cursor = 'default'
    },
  }
}

/** Tornillo + muelle de un centro, orientado a lo largo de su eje. */
function Spindle({
  dir,
  active,
  onSelect,
}: {
  dir: Vec3
  active: boolean
  onSelect: (p: PartId) => void
}) {
  const quat = useMemo(
    () =>
      new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(...dir).normalize()),
    [dir],
  )
  const curve = useMemo(() => helixCurve(), [])

  return (
    <group quaternion={quat}>
      {/* Tornillo: vástago + cabeza junto al núcleo. */}
      <group {...pickHandlers(active, () => onSelect('tornillo'))}>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.72, 16]} />
          <meshStandardMaterial color="#9aa0a6" roughness={0.3} metalness={0.7} transparent />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.09, 16]} />
          <meshStandardMaterial color="#777d83" roughness={0.3} metalness={0.7} transparent />
        </mesh>
      </group>
      {/* Muelle. */}
      <mesh {...pickHandlers(active, () => onSelect('muelle'))}>
        <tubeGeometry args={[curve, 90, 0.022, 6, false]} />
        <meshStandardMaterial color="#c8ccd0" roughness={0.35} metalness={0.6} transparent />
      </mesh>
    </group>
  )
}

/** Núcleo: esfera central + 3 brazos perpendiculares (el eje de giro). */
function Core({ active, onSelect }: { active: boolean; onSelect: (p: PartId) => void }) {
  const handlers = pickHandlers(active, () => onSelect('nucleo'))
  return (
    <group {...handlers}>
      <mesh>
        <sphereGeometry args={[0.32, 20, 20]} />
        <meshStandardMaterial color="#2c2f33" roughness={0.6} metalness={0.2} transparent />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.16, 0.16, 1.7, 16]} />
        <meshStandardMaterial color="#34383d" roughness={0.6} metalness={0.2} transparent />
      </mesh>
      <mesh rotation={[0, 0, H]}>
        <cylinderGeometry args={[0.16, 0.16, 1.7, 16]} />
        <meshStandardMaterial color="#34383d" roughness={0.6} metalness={0.2} transparent />
      </mesh>
      <mesh rotation={[H, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 1.7, 16]} />
        <meshStandardMaterial color="#34383d" roughness={0.6} metalness={0.2} transparent />
      </mesh>
    </group>
  )
}

function Mechanism({ visible, onSelect }: { visible: boolean; onSelect: (p: PartId) => void }) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const target = visible ? 1 : 0
    g.traverse((o) => {
      if (!(o instanceof Mesh)) return
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      for (const m of mats) {
        const mm = m as MeshStandardMaterial
        mm.transparent = true
        mm.opacity += (target - mm.opacity) * EASE
        mm.depthWrite = mm.opacity > 0.9
      }
    })
  })
  return (
    <group ref={ref}>
      <Core active={visible} onSelect={onSelect} />
      {CENTER_DIRS.map((d, i) => (
        <Spindle key={i} dir={d} active={visible} onSelect={onSelect} />
      ))}
    </group>
  )
}

// --- Escena -----------------------------------------------------------------

export function DespieceScene({
  stage,
  selected,
  onSelect,
}: {
  stage: number
  selected: PartId | null
  onSelect: (p: PartId) => void
}) {
  const cubies = useMemo(() => createSolved(), [])
  return (
    <Canvas camera={{ position: [5, 5, 6], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={['#ffffff']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 9, 6]} intensity={1.1} />
      <directionalLight position={[-6, -2, -6]} intensity={0.4} />

      {cubies.map((c) => {
        const t = typeOf(c.home)
        // Al seleccionar un tipo de pieza, atenuamos las que no son de ese tipo
        // para que la elegida (y sus hermanas) destaquen sin lugar a dudas.
        const pieceSelected =
          selected === 'centro' || selected === 'arista' || selected === 'esquina'
        let opacity = opacityFor(c.home, stage)
        if (pieceSelected && selected !== t) opacity = Math.min(opacity, 0.3)
        return (
          <AnimatedCubie
            key={c.id}
            cubie={c}
            offset={offsetFor(c.home, stage)}
            opacity={opacity}
            selected={selected === t}
            onPick={() => onSelect(t)}
          />
        )
      })}

      <Mechanism visible={stage >= 3} onSelect={onSelect} />

      <TrackballControls noPan rotateSpeed={3} minDistance={5} maxDistance={16} />
    </Canvas>
  )
}
