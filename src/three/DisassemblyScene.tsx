import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { RoundedBox, TrackballControls } from '@react-three/drei'
import {
  CatmullRomCurve3,
  type Object3D,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three'
import { createSolved, type Cubie, type Vec3 } from './cube/engine'

/**
 * Escena 3D de despiece para "Saber más". Recorrido lineal por pasos (no hay
 * interacción de toque):
 *   0) el cubo montado,
 *   1) las piezas externas desaparecen y los centros se separan para dejar ver
 *      el mecanismo interior (núcleo de 3 brazos + tornillos/muelles), y
 *   2..5) se despieza un centro y se va iluminando cada parte —pegatina, tapa,
 *      tornillo y muelle— con su explicación.
 *
 * Toda la geometría es procedural y la animación es interpolación por frame.
 */

/** Partes del centro que se iluminan, una por sub-paso del despiece. */
export type HighlightId = 'sticker' | 'cap' | 'screw' | 'spring'

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
/** Gris para las piezas (cuerpo/tapa) cuando se abre el cubo (paso 2): el negro
 *  forma un bloque ilegible, así que al revelar el mecanismo salen en gris. */
const PIECE_GREY = '#6f757b'

const SPACING = 1
const BODY = 0.995
const BODY_RADIUS = 0.02
const STICKER_OFFSET = BODY / 2 + 0.002
const STICKER_SIZE = 0.95
const H = Math.PI / 2

/** Velocidad de interpolación (lerp) común a todas las animaciones por frame. */
const EASE = 0.16
/** Opacidad de las piezas que no están iluminadas durante el despiece. */
const DIM = 0.16

/** Centro protagonista del despiece (la cara frontal, verde). */
const FEATURED_CENTER: Vec3 = [0, 0, 1]
const eq = (a: Vec3, b: Vec3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
const scale = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k]

type PieceType = 'center' | 'edge' | 'corner'

/** Tipo de pieza según cuántas coordenadas de su posición resuelta son ≠ 0. */
function typeOf(home: Vec3): PieceType {
  const n = home.filter((v) => v !== 0).length
  return n === 1 ? 'center' : n === 2 ? 'edge' : 'corner'
}

/** Recorre un subárbol aplicando lerp de opacidad e iluminación a sus
 *  materiales. `glow` es la intensidad emisiva objetivo (0 = sin brillo). */
function animateMaterials(root: Object3D, opacity: number, glow: number) {
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      const mm = m as MeshStandardMaterial
      mm.transparent = true
      mm.opacity += (opacity - mm.opacity) * EASE
      mm.depthWrite = mm.opacity > 0.9
      mm.emissiveIntensity += (glow - mm.emissiveIntensity) * 0.25
    }
  })
}

// --- Piezas de color (cuerpo + pegatinas) -----------------------------------

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

function AnimatedCubie({
  cubie,
  offset,
  opacity,
  bodyColor,
}: {
  cubie: Cubie
  offset: Vec3
  opacity: number
  bodyColor: string
}) {
  const ref = useRef<Object3D>(null)
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
    animateMaterials(g, opacity, 0)
  })

  return (
    <group
      ref={ref}
      position={[cubie.pos[0] * SPACING, cubie.pos[1] * SPACING, cubie.pos[2] * SPACING]}
    >
      <RoundedBox args={[BODY, BODY, BODY]} radius={BODY_RADIUS} smoothness={4}>
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.05} />
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

// --- Mecanismo interno (núcleo + tornillos + muelles) -----------------------

/** Hélice (en el eje +Y local) que usamos como muelle alrededor del tornillo. */
function helixCurve(): CatmullRomCurve3 {
  const pts: Vector3[] = []
  const turns = 5
  const radius = 0.12
  const seg = 90
  for (let i = 0; i <= seg; i++) {
    const u = i / seg
    const a = u * turns * Math.PI * 2
    pts.push(new Vector3(Math.cos(a) * radius, 0.32 + 0.6 * u, Math.sin(a) * radius))
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

function quatToAxis(dir: Vec3): Quaternion {
  return new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(...dir).normalize())
}

/** Tornillo + muelle de un centro (montado), orientado a lo largo de su eje. */
function Spindle({ dir }: { dir: Vec3 }) {
  const quat = useMemo(() => quatToAxis(dir), [dir])
  const curve = useMemo(() => helixCurve(), [])
  return (
    <group quaternion={quat}>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.72, 16]} />
        <meshStandardMaterial color="#9aa0a6" roughness={0.3} metalness={0.7} transparent />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.09, 16]} />
        <meshStandardMaterial color="#777d83" roughness={0.3} metalness={0.7} transparent />
      </mesh>
      <mesh>
        <tubeGeometry args={[curve, 90, 0.022, 6, false]} />
        <meshStandardMaterial color="#7f868c" roughness={0.35} metalness={0.6} transparent />
      </mesh>
    </group>
  )
}

/** Núcleo: esfera central + 3 brazos perpendiculares (el eje de giro). */
function Core() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.32, 20, 20]} />
        <meshStandardMaterial color="#6f757b" roughness={0.5} metalness={0.25} transparent />
      </mesh>
      {[[0, 0, 0] as Vec3, [0, 0, H] as Vec3, [H, 0, 0] as Vec3].map((rot, i) => (
        <mesh key={i} rotation={rot}>
          <cylinderGeometry args={[0.16, 0.16, 1.7, 16]} />
          <meshStandardMaterial color="#878d93" roughness={0.5} metalness={0.25} transparent />
        </mesh>
      ))}
    </group>
  )
}

/** Núcleo + los 5 tornillos/muelles que no son el del centro protagonista. */
function Mechanism({ visible, dim }: { visible: boolean; dim: boolean }) {
  const ref = useRef<Object3D>(null)
  useFrame(() => {
    if (ref.current) animateMaterials(ref.current, visible ? (dim ? DIM : 1) : 0, 0)
  })
  const dirs = useMemo(() => CENTER_DIRS.filter((d) => !eq(d, FEATURED_CENTER)), [])
  return (
    <group ref={ref}>
      <Core />
      {dirs.map((d, i) => (
        <Spindle key={i} dir={d} />
      ))}
    </group>
  )
}

// --- Despiece de un centro: pegatina + tapa + tornillo + muelle -------------

/** Distancia de cada subpieza a lo largo del eje en [paso 0, paso 1, paso 2+].
 *  En despiece, el muelle queda fuera del brazo del núcleo (~0.85) para verse. */
const LAYOUT = {
  spring: [0.62, 0.62, 1.4],
  screw: [0.62, 0.62, 2.3],
  cap: [1.0, 1.5, 3.55],
  sticker: [1.48, 2.02, 4.45],
} as const

function CenterDisassembly({
  dir,
  stage,
  highlight,
}: {
  dir: Vec3
  stage: number
  highlight: HighlightId | null
}) {
  const quat = useMemo(() => quatToAxis(dir), [dir])
  const curve = useMemo(() => helixCurve(), [])
  const springRef = useRef<Object3D>(null)
  const screwRef = useRef<Object3D>(null)
  const capRef = useRef<Object3D>(null)
  const stickerRef = useRef<Object3D>(null)
  const spinRef = useRef<Object3D>(null)
  // Distancia actual de cada subpieza, que interpolamos hacia el paso actual.
  const cur = useRef({ spring: 0.62, screw: 0.62, cap: 1.0, sticker: 1.48 })

  const exploded = stage >= 2
  const mechVisible = stage >= 1
  const spinning = stage === 1

  useFrame((_, delta) => {
    const c = cur.current
    const i = stage >= 2 ? 2 : stage // del paso 2 en adelante, la pieza queda despiezada
    c.spring += (LAYOUT.spring[i] - c.spring) * EASE
    c.screw += (LAYOUT.screw[i] - c.screw) * EASE
    c.cap += (LAYOUT.cap[i] - c.cap) * EASE
    c.sticker += (LAYOUT.sticker[i] - c.sticker) * EASE

    if (springRef.current) springRef.current.position.y = c.spring - 0.62
    if (screwRef.current) screwRef.current.position.y = c.screw - 0.62
    if (capRef.current) capRef.current.position.y = c.cap
    if (stickerRef.current) stickerRef.current.position.y = c.sticker

    // "Giro de 360 grados": el centro gira sobre su eje en el paso del mecanismo.
    if (spinRef.current) {
      if (spinning) spinRef.current.rotation.y += delta * 0.6
      else spinRef.current.rotation.y *= 0.9
    }

    // Iluminación: en el despiece, la parte explicada brilla (fijo) y crece un
    // poco; el resto se atenúa con fuerza para que destaque. El tornillo y el
    // muelle solo existen una vez visible el mecanismo.
    const part = (ref: { current: Object3D | null }, id: HighlightId, alwaysVisible: boolean) => {
      const g = ref.current
      if (!g) return
      const on = highlight === id
      const opacity = exploded ? (on ? 1 : DIM) : alwaysVisible ? 1 : mechVisible ? 1 : 0
      animateMaterials(g, opacity, on ? 0.6 : 0)
      const s = on ? 1.16 : 1
      g.scale.x += (s - g.scale.x) * 0.2
      g.scale.y = g.scale.x
      g.scale.z = g.scale.x
    }
    part(springRef, 'spring', false)
    part(screwRef, 'screw', false)
    part(capRef, 'cap', true)
    part(stickerRef, 'sticker', true)
  })

  return (
    <group quaternion={quat}>
      {/* Muelle */}
      <group ref={springRef}>
        <mesh>
          <tubeGeometry args={[curve, 90, 0.022, 6, false]} />
          <meshStandardMaterial
            color="#7f868c"
            roughness={0.35}
            metalness={0.6}
            emissive="#ffffff"
            emissiveIntensity={0}
            transparent
          />
        </mesh>
      </group>

      {/* Tornillo */}
      <group ref={screwRef}>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.72, 16]} />
          <meshStandardMaterial
            color="#9aa0a6"
            roughness={0.3}
            metalness={0.7}
            emissive="#ffffff"
            emissiveIntensity={0}
            transparent
          />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.09, 16]} />
          <meshStandardMaterial color="#777d83" roughness={0.3} metalness={0.7} transparent />
        </mesh>
      </group>

      {/* Tapa + pegatina (giran juntas como el centro) */}
      <group ref={spinRef}>
        <group ref={capRef}>
          <RoundedBox args={[BODY, BODY, BODY]} radius={BODY_RADIUS} smoothness={4}>
            <meshStandardMaterial
              color={stage === 1 ? PIECE_GREY : BODY_COLOR}
              roughness={0.55}
              metalness={0.05}
              emissive="#ffffff"
              emissiveIntensity={0}
              transparent
            />
          </RoundedBox>
        </group>
        <group ref={stickerRef}>
          <mesh>
            <boxGeometry args={[STICKER_SIZE, 0.04, STICKER_SIZE]} />
            <meshStandardMaterial
              color={COLORS.F}
              roughness={0.4}
              metalness={0}
              emissive={COLORS.F}
              emissiveIntensity={0}
              transparent
            />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// --- Escena -----------------------------------------------------------------

export function DisassemblyScene({
  stage,
  highlight,
}: {
  stage: number
  highlight: HighlightId | null
}) {
  const cubies = useMemo(() => createSolved(), [])
  // El centro protagonista se dibuja aparte (CenterDisassembly); el resto de
  // centros y todas las aristas/esquinas son cubies normales.
  const pieces = useMemo(() => cubies.filter((c) => !eq(c.home, FEATURED_CENTER)), [cubies])

  return (
    <Canvas camera={{ position: [5, 5, 6], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={['#ffffff']} />
      <ambientLight intensity={1.05} />
      <directionalLight position={[6, 9, 6]} intensity={1.1} />
      <directionalLight position={[-6, -2, -6]} intensity={0.5} />

      {pieces.map((c) => {
        const external = typeOf(c.home) !== 'center'
        // Aristas y esquinas: desaparecen (apartándose un poco) desde el paso 1.
        // Centros: se separan hacia fuera para dejar ver el núcleo y sus
        // tornillos/muelles; en el despiece final se retiran.
        const out = external ? 0.6 : 0.5
        const offset: Vec3 = stage >= 1 ? scale(c.home, out) : [0, 0, 0]
        const opacity = (external ? stage >= 1 : stage >= 2) ? 0 : 1
        // Al abrir el cubo (paso 2), las piezas negras pasan a gris para que el
        // mecanismo se lea; montado (paso 1) conservan su negro real.
        const bodyColor = stage >= 1 ? PIECE_GREY : BODY_COLOR
        return (
          <AnimatedCubie
            key={c.id}
            cubie={c}
            offset={offset}
            opacity={opacity}
            bodyColor={bodyColor}
          />
        )
      })}

      <Mechanism visible={stage >= 1} dim={stage >= 2} />
      <CenterDisassembly dir={FEATURED_CENTER} stage={stage} highlight={highlight} />

      <TrackballControls noPan rotateSpeed={3} minDistance={5} maxDistance={16} />
    </Canvas>
  )
}
