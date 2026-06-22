// Genera los SVG del cubo de Rubik resuelto a partir de los tokens de color
// definidos en src/App.css (`--cube-*`), que son la fuente única de la verdad.
//
//   node scripts/generate-cube-svgs.mjs
//
// Salida (en public/):
//   cube-solved-net.svg        → desplegado en cruz (6 caras)
//   cube-solved-isometric.svg  → perspectiva isométrica (3 caras)
//   cube-solved-corner.svg     → apoyado sobre una esquina, inclinado
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = (name) => resolve(root, 'public', name)

// --- Tokens de color desde App.css ---------------------------------------
function readTokens() {
  const css = readFileSync(resolve(root, 'src/App.css'), 'utf8')
  const pick = (name, fallback) => {
    const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,6})`))
    return m ? m[1] : fallback
  }
  return {
    R: pick('cube-face-right', '#b71234'), // rojo
    L: pick('cube-face-left', '#ff5800'), // naranja
    U: pick('cube-face-up', '#ffffff'), // blanco
    D: pick('cube-face-down', '#ffd500'), // amarillo
    F: pick('cube-face-front', '#009b48'), // verde
    B: pick('cube-face-back', '#0046ad'), // azul
    BODY: pick('cube-body', '#0a0a0a'), // cuerpo de la pieza
  }
}

// --- Utilidades ----------------------------------------------------------
const add = (...ps) => ps.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 })
const mul = (p, k) => ({ x: p.x * k, y: p.y * k })
const norm = (p) => {
  const m = Math.hypot(p.x, p.y)
  return { x: p.x / m, y: p.y / m }
}
const fmt = (p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`

const darken = (hex, f) => {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * f)
  const g = Math.round(((n >> 8) & 255) * f)
  const b = Math.round((n & 255) * f)
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

const svgDoc = (W, H, viewBox, label, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${viewBox}" role="img" aria-label="${label}">\n${body}\n</svg>\n`

// --- 1) Desplegado en cruz ----------------------------------------------
function buildNet(C) {
  const cell = 30,
    gap = 4,
    r = 4,
    pad = 10
  const face = 3 * cell + 4 * gap
  const layout = [
    { key: 'U', col: 1, row: 0 },
    { key: 'L', col: 0, row: 1 },
    { key: 'F', col: 1, row: 1 },
    { key: 'R', col: 2, row: 1 },
    { key: 'B', col: 3, row: 1 },
    { key: 'D', col: 1, row: 2 },
  ]
  const W = pad * 2 + 4 * face,
    H = pad * 2 + 3 * face
  const parts = []
  for (const f of layout) {
    const fx = pad + f.col * face,
      fy = pad + f.row * face
    parts.push(
      `  <rect x="${fx}" y="${fy}" width="${face}" height="${face}" rx="6" fill="${C.BODY}"/>`,
    )
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++) {
        const x = fx + gap + col * (cell + gap),
          y = fy + gap + row * (cell + gap)
        parts.push(
          `  <rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="${r}" fill="${C[f.key]}"/>`,
        )
      }
  }
  return svgDoc(
    W,
    H,
    `0 0 ${W} ${H}`,
    'Cubo de Rubik resuelto (desplegado)',
    `  <title>Cubo de Rubik resuelto</title>\n${parts.join('\n')}`,
  )
}

// --- Construcción 3D común (isométrico) ----------------------------------
// faceColors: { U, L, R } ; shade: factor por cara ; rotateDeg: inclinación ;
// withShadow: añade sombra de apoyo. Devuelve el documento SVG.
// stickerFill: si se indica, todos los stickers usan ese color plano (sin sombrear)
// — se usa para la silueta "en blanco" que aparece mientras carga el cubo WebGL.
function buildIso(
  C,
  { faceColors, shade, rotateDeg = 0, withShadow = false, pad, label, title, stickerFill },
) {
  const s = 44,
    gap = 3,
    N = 3
  const cos = Math.cos(Math.PI / 6),
    sin = Math.sin(Math.PI / 6)
  const DR = { x: cos * s, y: sin * s }
  const DL = { x: -cos * s, y: sin * s }
  const DN = { x: 0, y: s }

  const O = { x: 0, y: 0 }
  const faces = [
    { key: 'U', base: O, e1: DR, e2: DL },
    { key: 'L', base: add(O, mul(DL, N)), e1: DR, e2: DN },
    { key: 'R', base: add(O, mul(DR, N)), e1: DL, e2: DN },
  ]

  const CENTER = { x: 0, y: 3 * s }
  const a = (rotateDeg * Math.PI) / 180,
    ca = Math.cos(a),
    sa = Math.sin(a)
  const rot = (p) => ({
    x: CENTER.x + (p.x - CENTER.x) * ca - (p.y - CENTER.y) * sa,
    y: CENTER.y + (p.x - CENTER.x) * sa + (p.y - CENTER.y) * ca,
  })

  const polys = [],
    pts = []
  const poly = (arr, fill) => {
    const R = arr.map(rot)
    R.forEach((p) => pts.push(p))
    polys.push(`  <polygon points="${R.map(fmt).join(' ')}" fill="${fill}"/>`)
  }

  for (const f of faces) {
    const n1 = norm(f.e1),
      n2 = norm(f.e2)
    poly(
      [
        f.base,
        add(f.base, mul(f.e1, N)),
        add(f.base, mul(f.e1, N), mul(f.e2, N)),
        add(f.base, mul(f.e2, N)),
      ],
      C.BODY,
    )
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        const A = add(f.base, mul(f.e1, i), mul(f.e2, j))
        const B = add(A, f.e1),
          Cc = add(A, f.e1, f.e2),
          D = add(A, f.e2)
        const fill = stickerFill ?? darken(faceColors[f.key], shade[f.key])
        poly(
          [
            add(A, mul(n1, gap), mul(n2, gap)),
            add(B, mul(n1, -gap), mul(n2, gap)),
            add(Cc, mul(n1, -gap), mul(n2, -gap)),
            add(D, mul(n1, gap), mul(n2, -gap)),
          ],
          fill,
        )
      }
  }

  const margin = pad ?? (withShadow ? 26 : 12)
  const minX = Math.min(...pts.map((p) => p.x)) - margin,
    minY = Math.min(...pts.map((p) => p.y)) - margin
  const maxX = Math.max(...pts.map((p) => p.x)) + margin,
    maxY = Math.max(...pts.map((p) => p.y)) + margin
  const W = maxX - minX,
    H = maxY - minY

  let defs = '',
    shadow = ''
  if (withShadow) {
    const low = pts.reduce((acc, p) => (p.y > acc.y ? p : acc), pts[0])
    defs = `  <defs><filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>\n`
    shadow = `  <ellipse cx="${low.x.toFixed(2)}" cy="${(low.y + 14).toFixed(2)}" rx="${(W * 0.3).toFixed(2)}" ry="12" fill="${C.BODY}" opacity="0.18" filter="url(#blur)"/>\n`
  }

  const viewBox = `${minX.toFixed(2)} ${minY.toFixed(2)} ${W.toFixed(2)} ${H.toFixed(2)}`
  return svgDoc(
    W.toFixed(2),
    H.toFixed(2),
    viewBox,
    label,
    `  <title>${title}</title>\n${defs}${shadow}${polys.join('\n')}`,
  )
}

// --- Generar -------------------------------------------------------------
const C = readTokens()

writeFileSync(out('cube-solved-net.svg'), buildNet(C))

writeFileSync(
  out('cube-solved-isometric.svg'),
  buildIso(C, {
    faceColors: { U: C.U, L: C.F, R: C.R }, // blanco arriba, verde frente, rojo derecha
    shade: { U: 1.0, L: 1.0, R: 1.0 },
    label: 'Cubo de Rubik resuelto en perspectiva isométrica',
    title: 'Cubo de Rubik resuelto (isométrico)',
  }),
)

writeFileSync(
  out('cube-solved-corner.svg'),
  buildIso(C, {
    faceColors: { U: C.D, L: C.B, R: C.R }, // amarillo arriba, azul izquierda, rojo derecha
    shade: { U: 1.0, R: 0.9, L: 0.72 },
    rotateDeg: 17,
    withShadow: false,
    pad: 8,
    label: 'Cubo de Rubik resuelto apoyado sobre una esquina',
    title: 'Cubo de Rubik resuelto (apoyado en una esquina)',
  }),
)

// Silueta "en blanco": misma pose/geometría que el corner pero con todos los
// stickers blancos. Se muestra al instante mientras arranca el Canvas WebGL y
// se desvanece al pintar el primer frame (MenuCube).
writeFileSync(
  out('cube-solved-corner-blank.svg'),
  buildIso(C, {
    faceColors: { U: C.D, L: C.B, R: C.R },
    shade: { U: 1.0, R: 0.9, L: 0.72 },
    stickerFill: '#ffffff',
    rotateDeg: 17,
    withShadow: false,
    pad: 8,
    label: 'Cubo de Rubik (silueta, cargando)',
    title: 'Cubo de Rubik (silueta, cargando)',
  }),
)

// Variante recortada para el favicon: misma pose que el corner, sin sombra y
// con margen mínimo, para que el cubo llene el cuadro.
writeFileSync(
  out('cube-favicon.svg'),
  buildIso(C, {
    faceColors: { U: C.D, L: C.B, R: C.R }, // amarillo arriba, azul izquierda, rojo derecha
    shade: { U: 1.0, R: 0.9, L: 0.72 },
    rotateDeg: 17,
    withShadow: false,
    pad: 2,
    label: 'Cubo de Rubik (favicon)',
    title: 'Cubo de Rubik',
  }),
)

console.log(
  'SVG generados en public/: cube-solved-net.svg, cube-solved-isometric.svg, cube-solved-corner.svg, cube-solved-corner-blank.svg, cube-favicon.svg',
)
