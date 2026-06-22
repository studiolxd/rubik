import { useMemo, useRef } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
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
 * Escena 3D de despiece para "Saber más": muestra de qué está hecho un cubo de
 * Rubik por dentro, en 3 pasos:
 *   0) el cubo montado,
 *   1) las piezas externas desaparecen y queda a la vista el mecanismo interior
 *      (núcleo de 3 brazos + centros), y
 *   2) se despieza un centro en pegatina, tapa, tornillo y muelle.
 *
 * Toda la geometría es procedural (no hay modelos importados) y la animación es
 * interpolación por frame. No depende del motor de juego (`useCube`).
 */

export type PartId =
  | 'centro'
  | 'arista'
  | 'esquina'
  | 'nucleo'
  | 'tornillo'
  | 'muelle'
  | 'tapa'
  | 'pegatina'

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

/** Centro protagonista del despiece (la cara frontal, verde). */
const FEATURED_CENTER: Vec3 = [0, 0, 1]
const eq = (a: Vec3, b: Vec3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
const scale = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k]

type PieceType = 'centro' | 'arista' | 'esquina'

/** Tipo de pieza según cuántas coordenadas de su posición resuelta son ≠ 0. */
function typeOf(home: Vec3): PieceType {
  const n = home.filter((v) => v !== 0).length
  return n === 1 ? 'centro' : n === 2 ? 'arista' : 'esquina'
}

// --- Selección por "tap" (robusta en ratón y táctil) ------------------------

/**
 * Manejadores para detectar una pulsación real sobre una pieza. En táctil, el
 * `onClick` de R3F se pierde porque el control de rotación captura el gesto;
 * por eso medimos el desplazamiento entre pointerdown y pointerup y solo
 * disparamos la selección si apenas se ha movido (un toque, no un arrastre).
 */
function useTap(onTap: () => void, active = true) {
  const down = useRef<{ x: number; y: number } | null>(null)
  if (!active) return {}
  return {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      down.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
    },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => {
      const d = down.current
      down.current = null
      if (!d) return
      const moved = Math.hypot(e.nativeEvent.clientX - d.x, e.nativeEvent.clientY - d.y)
      if (moved < 8) {
        e.stopPropagation()
        onTap()
      }
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

/** Recorre un subárbol aplicando lerp de opacidad y resaltado a sus materiales. */
function animateMaterials(root: Object3D, opacity: number, selected: boolean) {
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
  selected,
  active,
  onPick,
}: {
  cubie: Cubie
  offset: Vec3
  opacity: number
  selected: boolean
  active: boolean
  onPick: () => void
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
      {...useTap(onPick, active)}
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
function Spindle({
  dir,
  active,
  onSelect,
}: {
  dir: Vec3
  active: boolean
  onSelect: (p: PartId) => void
}) {
  const quat = useMemo(() => quatToAxis(dir), [dir])
  const curve = useMemo(() => helixCurve(), [])
  return (
    <group quaternion={quat}>
      <group {...useTap(() => onSelect('tornillo'), active)}>
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
      <mesh {...useTap(() => onSelect('muelle'), active)}>
        <tubeGeometry args={[curve, 90, 0.022, 6, false]} />
        <meshStandardMaterial
          color="#c8ccd0"
          roughness={0.35}
          metalness={0.6}
          emissive="#ffffff"
          emissiveIntensity={0}
          transparent
        />
      </mesh>
    </group>
  )
}

/** Núcleo: esfera central + 3 brazos perpendiculares (el eje de giro). */
function Core({ active, onSelect }: { active: boolean; onSelect: (p: PartId) => void }) {
  return (
    <group {...useTap(() => onSelect('nucleo'), active)}>
      <mesh>
        <sphereGeometry args={[0.32, 20, 20]} />
        <meshStandardMaterial
          color="#2c2f33"
          roughness={0.6}
          metalness={0.2}
          emissive="#ffffff"
          emissiveIntensity={0}
          transparent
        />
      </mesh>
      {[[0, 0, 0] as Vec3, [0, 0, H] as Vec3, [H, 0, 0] as Vec3].map((rot, i) => (
        <mesh key={i} rotation={rot}>
          <cylinderGeometry args={[0.16, 0.16, 1.7, 16]} />
          <meshStandardMaterial
            color="#34383d"
            roughness={0.6}
            metalness={0.2}
            emissive="#ffffff"
            emissiveIntensity={0}
            transparent
          />
        </mesh>
      ))}
    </group>
  )
}

/** Núcleo + los 5 tornillos/muelles que no son el del centro protagonista. */
function Mechanism({ visible, onSelect }: { visible: boolean; onSelect: (p: PartId) => void }) {
  const ref = useRef<Object3D>(null)
  useFrame(() => {
    if (ref.current) animateMaterials(ref.current, visible ? 1 : 0, false)
  })
  const dirs = useMemo(() => CENTER_DIRS.filter((d) => !eq(d, FEATURED_CENTER)), [])
  return (
    <group ref={ref}>
      <Core active={visible} onSelect={onSelect} />
      {dirs.map((d, i) => (
        <Spindle key={i} dir={d} active={visible} onSelect={onSelect} />
      ))}
    </group>
  )
}

// --- Despiece de un centro: pegatina + tapa + tornillo + muelle -------------

/** Distancias a lo largo del eje [montado, explosionado] de cada subpieza. */
const LAYOUT = {
  muelle: [0.62, 0.55],
  tornillo: [0.62, 1.2],
  tapa: [1.0, 2.05],
  pegatina: [1.52, 2.7],
} as const

function CenterDespiece({
  dir,
  stage,
  selected,
  onSelect,
}: {
  dir: Vec3
  stage: number
  selected: PartId | null
  onSelect: (p: PartId) => void
}) {
  const quat = useMemo(() => quatToAxis(dir), [dir])
  const curve = useMemo(() => helixCurve(), [])
  const muelleRef = useRef<Object3D>(null)
  const tornilloRef = useRef<Object3D>(null)
  const tapaRef = useRef<Object3D>(null)
  const pegatinaRef = useRef<Object3D>(null)
  const capRef = useRef<Object3D>(null)
  const spread = useRef(0)

  const exploded = stage === 2
  const mechVisible = stage >= 1
  const spinning = stage === 1

  useFrame((_, delta) => {
    spread.current += ((exploded ? 1 : 0) - spread.current) * EASE
    const s = spread.current
    const lp = (a: number, b: number) => a + (b - a) * s

    if (muelleRef.current) muelleRef.current.position.y = lp(...LAYOUT.muelle) - 0.62
    if (tornilloRef.current) tornilloRef.current.position.y = lp(...LAYOUT.tornillo) - 0.62
    if (tapaRef.current) tapaRef.current.position.y = lp(...LAYOUT.tapa)
    if (pegatinaRef.current) pegatinaRef.current.position.y = lp(...LAYOUT.pegatina)

    // "Giro de 360 grados": el centro gira sobre su eje en el paso del mecanismo.
    if (capRef.current) {
      if (spinning) capRef.current.rotation.y += delta * 0.6
      else capRef.current.rotation.y *= 0.9
    }

    // Tornillo y muelle solo se ven cuando el mecanismo está a la vista.
    if (muelleRef.current)
      animateMaterials(muelleRef.current, mechVisible ? 1 : 0, selected === 'muelle')
    if (tornilloRef.current)
      animateMaterials(tornilloRef.current, mechVisible ? 1 : 0, selected === 'tornillo')
    if (tapaRef.current) animateMaterials(tapaRef.current, 1, selected === 'tapa')
    if (pegatinaRef.current) animateMaterials(pegatinaRef.current, 1, selected === 'pegatina')
  })

  // En los pasos 0-1 la pieza es "un centro"; solo al despiezar (paso 2) tiene
  // sentido nombrar la tapa y la pegatina por separado.
  const tapaId: PartId = exploded ? 'tapa' : 'centro'
  const pegatinaId: PartId = exploded ? 'pegatina' : 'centro'

  return (
    <group quaternion={quat}>
      {/* Muelle */}
      <group ref={muelleRef}>
        <mesh {...useTap(() => onSelect('muelle'), mechVisible)}>
          <tubeGeometry args={[curve, 90, 0.022, 6, false]} />
          <meshStandardMaterial
            color="#c8ccd0"
            roughness={0.35}
            metalness={0.6}
            emissive="#ffffff"
            emissiveIntensity={0}
            transparent
          />
        </mesh>
      </group>

      {/* Tornillo */}
      <group ref={tornilloRef} {...useTap(() => onSelect('tornillo'), mechVisible)}>
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
      <group ref={capRef}>
        <group ref={tapaRef} {...useTap(() => onSelect(tapaId), true)}>
          <RoundedBox args={[BODY, BODY, BODY]} radius={BODY_RADIUS} smoothness={4}>
            <meshStandardMaterial
              color={BODY_COLOR}
              roughness={0.55}
              metalness={0.05}
              emissive="#ffffff"
              emissiveIntensity={0}
              transparent
            />
          </RoundedBox>
        </group>
        <group ref={pegatinaRef} {...useTap(() => onSelect(pegatinaId), true)}>
          <mesh>
            <boxGeometry args={[STICKER_SIZE, 0.04, STICKER_SIZE]} />
            <meshStandardMaterial
              color={COLORS.F}
              roughness={0.4}
              metalness={0}
              emissive="#ffffff"
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
  // El centro protagonista se dibuja aparte (CenterDespiece); el resto de
  // centros y todas las aristas/esquinas son cubies normales.
  const pieces = useMemo(() => cubies.filter((c) => !eq(c.home, FEATURED_CENTER)), [cubies])

  return (
    <Canvas camera={{ position: [5, 5, 6], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={['#ffffff']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 9, 6]} intensity={1.1} />
      <directionalLight position={[-6, -2, -6]} intensity={0.4} />

      {pieces.map((c) => {
        const t = typeOf(c.home)
        const external = t !== 'centro'
        // Las piezas externas desaparecen (y se apartan un poco) a partir del paso 1.
        const offset: Vec3 = external && stage >= 1 ? scale(c.home, 0.6) : [0, 0, 0]
        const opacity = external && stage >= 1 ? 0 : 1
        const active = !external || stage === 0
        return (
          <AnimatedCubie
            key={c.id}
            cubie={c}
            offset={offset}
            opacity={opacity}
            selected={selected === t}
            active={active}
            onPick={() => onSelect(t)}
          />
        )
      })}

      <Mechanism visible={stage >= 1} onSelect={onSelect} />
      <CenterDespiece dir={FEATURED_CENTER} stage={stage} selected={selected} onSelect={onSelect} />

      <TrackballControls noPan rotateSpeed={3} minDistance={5} maxDistance={16} />
    </Canvas>
  )
}
