/**
 * Clasificación de color de las pegatinas, a partir de muestras RGB.
 *
 * Es función PURA (sin DOM): la captura de píxeles (canvas/getImageData) vive en
 * la UI; aquí solo está la decisión "este RGB ¿a qué cara pertenece?". Así se
 * puede testear sin navegador.
 *
 * Estrategia: en vez de comparar contra colores absolutos (frágil ante la luz),
 * se calibra con los 6 CENTROS del propio cubo (cada centro define el color de
 * su cara) y se clasifica cada pegatina por cercanía a esas referencias en el
 * plano de CROMA: (x,y) = saturación·(cos h, sin h).
 * Se descarta el VALOR (brillo) a propósito: el tono y la saturación son
 * invariantes al brillo, así que oscurecer un color no lo acerca a otro (el
 * fallo típico amarillo→naranja al bajar la luz). El blanco queda cerca del
 * origen (saturación ~0), separado de los 5 colores saturados.
 */
import type { Face } from './engine'

export type RGB = readonly [number, number, number]
/** Color de referencia (centro) de cada cara, en RGB. */
export type Refs = Record<Face, RGB>

/** RGB (0..255) → HSV con h en [0,360), s y v en [0,1]. */
export function rgbToHsv([r, g, b]: RGB): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return [h, s, max]
}

/** Coordenadas de croma (tono+saturación), invariantes al brillo. */
function chroma(rgb: RGB): [number, number] {
  const [h, s] = rgbToHsv(rgb)
  const rad = (h * Math.PI) / 180
  return [s * Math.cos(rad), s * Math.sin(rad)]
}

function dist2(a: [number, number], b: [number, number]): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

const FACES_ALL: readonly Face[] = ['U', 'R', 'F', 'D', 'L', 'B']

/** Resultado de clasificar una pegatina: cara más probable y confianza [0,1]. */
export interface CellResult {
  face: Face
  /** Margen relativo respecto a la 2ª mejor opción (1 = inequívoco, 0 = empate). */
  confidence: number
}

/**
 * Clasifica una muestra RGB contra las referencias calibradas, devolviendo la
 * cara más cercana y una confianza basada en el margen con la segunda mejor.
 */
export function classifyCell(rgb: RGB, refs: Refs): CellResult {
  const p = chroma(rgb)
  let best: Face = 'U'
  let bestD = Infinity
  let secondD = Infinity
  for (const f of FACES_ALL) {
    const d = dist2(p, chroma(refs[f]))
    if (d < bestD) {
      secondD = bestD
      bestD = d
      best = f
    } else if (d < secondD) {
      secondD = d
    }
  }
  // Confianza: cuánto más lejos queda la 2ª opción que la 1ª (distancias, no ²).
  const d1 = Math.sqrt(bestD)
  const d2 = Math.sqrt(secondD)
  const confidence = d2 === 0 ? 0 : Math.max(0, Math.min(1, (d2 - d1) / d2))
  return { face: best, confidence }
}

/** Clasificación de una cara completa (9 muestras en orden de lectura). */
export interface FaceResult {
  faces: Face[]
  /** Confianza mínima entre las 9 celdas (la UI exige superar un umbral). */
  minConfidence: number
}

export function classifyFace(samples: RGB[], refs: Refs): FaceResult {
  const cells = samples.map((rgb) => classifyCell(rgb, refs))
  return {
    faces: cells.map((c) => c.face),
    minConfidence: cells.reduce((m, c) => Math.min(m, c.confidence), 1),
  }
}
