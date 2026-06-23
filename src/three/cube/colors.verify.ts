/**
 * Verificación del clasificador de color. No entra en el build:
 *   pnpm verify:colors
 *
 * Usa los colores reales de la app como referencias (centros) y comprueba que
 * cada color, perturbado en brillo y con ruido, se sigue clasificando bien —
 * incluidos los pares conflictivos rojo/naranja y blanco/amarillo.
 */
import { classifyCell, type Refs, type RGB } from './colors'
import type { Face } from './engine'

declare const process: { exit(code: number): never }

let failures = 0
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures++
    console.error('  ✘ ' + msg)
  }
}

function hex(h: string): RGB {
  const n = parseInt(h.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Esquema de colores de la app (tokens --cube-face-* en styles/tokens.css / Cubie.tsx).
const REFS: Refs = {
  U: hex('#ffffff'), // blanco
  R: hex('#b71234'), // rojo
  F: hex('#009b48'), // verde
  D: hex('#ffd500'), // amarillo
  L: hex('#ff8a1f'), // naranja
  B: hex('#0046ad'), // azul
}

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
function scale([r, g, b]: RGB, k: number): RGB {
  return [clamp(r * k), clamp(g * k), clamp(b * k)]
}
function jitter([r, g, b]: RGB, d: number): RGB {
  return [clamp(r + d), clamp(g - d), clamp(b + d * 0.5)]
}

const FACES: Face[] = ['U', 'R', 'F', 'D', 'L', 'B']

// 1) Identidad: cada referencia se clasifica como ella misma con confianza alta.
console.log('1) Identidad de referencias')
for (const f of FACES) {
  const r = classifyCell(REFS[f], REFS)
  check(r.face === f, `${f} → ${r.face}`)
  check(r.confidence > 0.2, `${f} confianza ${r.confidence.toFixed(2)} > 0.2`)
}

// 2) Robustez ante brillo (sombra y sobreexposición) y ruido.
console.log('2) Robustez ante brillo y ruido')
for (const f of FACES) {
  for (const k of [0.6, 0.8, 1.0]) {
    for (const d of [-12, 0, 12]) {
      const sample = jitter(scale(REFS[f], k), d)
      const r = classifyCell(sample, REFS)
      check(r.face === f, `${f} (brillo ${k}, ruido ${d}) → ${r.face}`)
    }
  }
}

// 3) Pares conflictivos no se cruzan.
console.log('3) Pares conflictivos (rojo/naranja, blanco/amarillo)')
check(classifyCell(scale(REFS.R, 0.7), REFS).face === 'R', 'rojo oscuro no es naranja')
check(classifyCell(scale(REFS.L, 0.7), REFS).face === 'L', 'naranja oscuro no es rojo')
check(classifyCell(scale(REFS.U, 0.7), REFS).face === 'U', 'blanco en sombra no es amarillo')
check(classifyCell(scale(REFS.D, 0.85), REFS).face === 'D', 'amarillo apagado no es blanco')

if (failures === 0) {
  console.log('\n✓ Todo correcto')
  process.exit(0)
} else {
  console.error(`\n✘ ${failures} comprobación(es) fallida(s)`)
  process.exit(1)
}
