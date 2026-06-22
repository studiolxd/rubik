import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@studiolxd/brand/button'
import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { Tag } from '@studiolxd/brand/tag'
import { classifyFace, type Refs, type RGB } from './three/cube/colors'
import {
  netToFacelets,
  validateFacelets,
  type Net,
  type ValidationError,
} from './three/cube/facelets'
import type { Face } from './three/cube/engine'
import { ensureSolver } from './three/cube/solver'

/**
 * Escaneo del cubo real con la cámara (Modo guiado).
 *
 * Flujo: se piden las 6 caras una a una; al ver las 9 piezas de una cara con
 * confianza suficiente se habilita "Siguiente". Al final se ensambla el cubo,
 * se VALIDA (cubejs no valida; ver facelets.ts) y, si es correcto, se entrega
 * la cadena de facelets a quien lo monte. Si la cámara se deniega, no hay
 * alternativa manual: es un callejón sin salida aceptado.
 *
 * Orientación: se asume que la rejilla 3×3 en pantalla mapea fila-a-fila al
 * orden de lectura de cada cara (ver CELL_ORDER). Un mapeo erróneo NO engaña:
 * la validación lo rechaza (cubo imposible), y el arreglo es local a CELL_ORDER.
 */

const CANON: Refs = {
  U: [255, 255, 255], // blanco
  R: [183, 18, 52], // rojo
  F: [0, 155, 72], // verde
  D: [255, 213, 0], // amarillo
  L: [255, 138, 31], // naranja
  B: [0, 70, 173], // azul
}

const COLOR_HEX: Record<Face, string> = {
  U: '#ffffff',
  R: '#b71234',
  F: '#009b48',
  D: '#ffd500',
  L: '#ff8a1f',
  B: '#0046ad',
}

const COLOR_NAME: Record<Face, string> = {
  U: 'blanca',
  R: 'roja',
  F: 'verde',
  D: 'amarilla',
  L: 'naranja',
  B: 'azul',
}

/** Orden de captura + cómo sostener el cubo para que la rejilla mapee bien. */
const CAPTURE: { face: Face; hint: string }[] = [
  { face: 'U', hint: 'cara BLANCA hacia la cámara, con la VERDE hacia ti (abajo)' },
  { face: 'F', hint: 'cara VERDE hacia la cámara, con la BLANCA arriba' },
  { face: 'R', hint: 'cara ROJA hacia la cámara, con la BLANCA arriba' },
  { face: 'B', hint: 'cara AZUL hacia la cámara, con la BLANCA arriba' },
  { face: 'L', hint: 'cara NARANJA hacia la cámara, con la BLANCA arriba' },
  { face: 'D', hint: 'cara AMARILLA hacia la cámara, con la VERDE hacia ti (arriba)' },
]

/**
 * Remapeo por cara: posición en la rejilla de pantalla (índice 0..8 fila-a-fila)
 * → posición de facelet de esa cara. Identidad por defecto; si en el dispositivo
 * una cara sale girada/espejada, se corrige SOLO aquí.
 */
const CELL_ORDER: Record<Face, number[]> = {
  U: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  R: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  F: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  D: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  L: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  B: [0, 1, 2, 3, 4, 5, 6, 7, 8],
}

/** Umbral de confianza mínima para habilitar "Siguiente". */
const CONFIDENCE_MIN = 0.12

/** Mediana por canal de un parche de píxeles (robusta a brillos puntuales). */
function medianRGB(data: Uint8ClampedArray, idxs: number[]): RGB {
  const ch = (off: number) => {
    const vals = idxs.map((i) => data[i + off]).sort((a, b) => a - b)
    return vals[Math.floor(vals.length / 2)]
  }
  return [ch(0), ch(1), ch(2)]
}

/** Muestrea la rejilla 3×3 del centro del fotograma. Devuelve 9 RGB o null. */
function sampleGrid(video: HTMLVideoElement, canvas: HTMLCanvasElement): RGB[] | null {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return null
  const side = Math.min(vw, vh)
  const x0 = (vw - side) / 2
  const y0 = (vh - side) / 2
  const S = 120
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(video, x0, y0, side, side, 0, 0, S, S)
  const { data } = ctx.getImageData(0, 0, S, S)

  const inset = S * 0.1
  const cell = (S * 0.8) / 3
  const samples: RGB[] = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cx = Math.round(inset + (c + 0.5) * cell)
      const cy = Math.round(inset + (r + 0.5) * cell)
      const idxs: number[] = []
      for (let dy = -5; dy <= 5; dy += 2) {
        for (let dx = -5; dx <= 5; dx += 2) {
          const px = cx + dx
          const py = cy + dy
          if (px >= 0 && px < S && py >= 0 && py < S) idxs.push((py * S + px) * 4)
        }
      }
      samples.push(medianRGB(data, idxs))
    }
  }
  return samples
}

const ERROR_TEXT: Record<ValidationError['kind'], string> = {
  length: 'No se han leído las 54 piezas.',
  count: 'Hay un color que no aparece exactamente 9 veces.',
  centers: 'Los centros no coinciden con los 6 colores del cubo.',
  corner: 'Una esquina no corresponde a una pieza real.',
  edge: 'Una arista no corresponde a una pieza real.',
  'corner-permutation': 'Hay esquinas repetidas o imposibles.',
  'edge-permutation': 'Hay aristas repetidas o imposibles.',
  'corner-twist': 'Una esquina ha quedado mal girada (cubo imposible).',
  'edge-flip': 'Una arista ha quedado volteada (cubo imposible).',
  parity: 'La combinación leída no es resoluble (revisa las piezas).',
}

type Phase = 'scanning' | 'review' | 'error'

export function CubeScan({
  onComplete,
  onCancel,
}: {
  onComplete: (facelets: string) => void
  onCancel: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const liveRef = useRef<RGB[] | null>(null)

  const [phase, setPhase] = useState<Phase>('scanning')
  const [errorMsg, setErrorMsg] = useState('')
  const [stepIdx, setStepIdx] = useState(0)
  const [live, setLive] = useState<{ faces: Face[]; minConfidence: number } | null>(null)
  // Muestras crudas (9 RGB) capturadas por cara; el centro define la referencia.
  const captured = useRef<Partial<Record<Face, RGB[]>>>({})
  const [result, setResult] = useState<{ facelets: string; net: Net; errors: ValidationError[] }>()

  // Arranca la cámara al montar; al fallar (denegada / sin soporte) → 'error'.
  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          await v.play().catch(() => {})
        }
      } catch {
        if (!cancelled) {
          setErrorMsg(
            'No se ha podido acceder a la cámara. Concede el permiso e inténtalo de nuevo.',
          )
          setPhase('error')
        }
      }
    }
    start()
    return () => {
      cancelled = true
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // Reengancha el stream al <video> cada vez que se entra (o se vuelve) a la
  // fase de escaneo: al "Volver a escanear" el componente no se remonta, pero el
  // <video> sí (estaba desmontado en la revisión), así que hay que reasignarlo.
  useEffect(() => {
    if (phase !== 'scanning') return
    const v = videoRef.current
    const stream = streamRef.current
    if (v && stream && v.srcObject !== stream) {
      v.srcObject = stream
      v.play().catch(() => {})
    }
  }, [phase])

  // Precalienta el solver de Kociemba mientras el usuario escanea, para que la
  // construcción del estado al terminar (buildFromFacelets) sea instantánea y no
  // congele el hilo en la transición a "resolver".
  useEffect(() => {
    const id = setTimeout(() => ensureSolver(), 400)
    return () => clearTimeout(id)
  }, [])

  // Bucle de muestreo (~throttle por rAF): clasifica en vivo con los colores
  // canónicos solo para guiar; la clasificación final usa los centros captados.
  useEffect(() => {
    if (phase !== 'scanning') return
    let last = 0
    const loop = (t: number) => {
      rafRef.current = requestAnimationFrame(loop)
      if (t - last < 90) return
      last = t
      const v = videoRef.current
      const c = canvasRef.current
      if (!v || !c) return
      const samples = sampleGrid(v, c)
      if (!samples) return
      liveRef.current = samples
      setLive(classifyFace(samples, CANON))
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [phase])

  const finish = useCallback(() => {
    // Referencias auto-calibradas: el centro (índice 4) de cada cara captada.
    const refs = {} as Refs
    for (const { face } of CAPTURE) {
      const s = captured.current[face]
      refs[face] = s ? s[4] : CANON[face]
    }
    // Clasifica las 54 piezas con las referencias del propio cubo y reordena.
    const net = {} as Net
    for (const { face } of CAPTURE) {
      const s = captured.current[face]!
      const cls = classifyFace(s, refs).faces
      net[face] = CELL_ORDER[face].map((src) => cls[src])
    }
    const facelets = netToFacelets(net)
    const v = validateFacelets(facelets)
    setResult({ facelets, net, errors: v.ok ? [] : v.errors })
    setPhase('review')
  }, [])

  const captureCurrent = useCallback(() => {
    const samples = liveRef.current
    if (!samples) return
    const { face } = CAPTURE[stepIdx]
    captured.current[face] = samples
    if (stepIdx + 1 < CAPTURE.length) {
      setStepIdx((i) => i + 1)
    } else {
      finish()
    }
  }, [stepIdx, finish])

  const restart = useCallback(() => {
    captured.current = {}
    setStepIdx(0)
    setResult(undefined)
    setPhase('scanning')
  }, [])

  // --- Render ---------------------------------------------------------------

  if (phase === 'error') {
    return (
      <div className="scan scan--message">
        <Heading level={2} size={3} weight="semibold">
          Cámara no disponible
        </Heading>
        <Paragraph>{errorMsg}</Paragraph>
        <Button variant="primary" onClick={onCancel}>
          Volver
        </Button>
      </div>
    )
  }

  if (phase === 'review' && result) {
    const valid = result.errors.length === 0
    return (
      <div className="scan scan--review">
        <Heading level={2} size={3} weight="semibold">
          {valid ? 'Cubo leído correctamente' : 'Hay algo que no cuadra'}
        </Heading>
        <CubeNet net={result.net} />
        {valid ? (
          <>
            <Paragraph>Revisa que los colores coinciden con tu cubo antes de empezar.</Paragraph>
            <div className="scan__actions">
              <Button variant="primary" onClick={() => onComplete(result.facelets)}>
                Empezar a resolver
              </Button>
              <Button variant="outline" onClick={restart}>
                Volver a escanear
              </Button>
            </div>
          </>
        ) : (
          <>
            <ul className="scan__errors">
              {result.errors.map((e, i) => (
                <li key={i}>{ERROR_TEXT[e.kind]}</li>
              ))}
            </ul>
            <Paragraph>
              Suele deberse a un color mal leído (rojo/naranja con poca luz) o a una cara torcida.
              Escanea de nuevo con buena iluminación.
            </Paragraph>
            <div className="scan__actions">
              <Button variant="primary" onClick={restart}>
                Volver a escanear
              </Button>
              <Button variant="text" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </>
        )}
      </div>
    )
  }

  // phase === 'scanning'
  const step = CAPTURE[stepIdx]
  const confident = (live?.minConfidence ?? 0) >= CONFIDENCE_MIN
  return (
    <div className="scan">
      <div className="scan__head">
        <Tag>
          Cara {stepIdx + 1} de {CAPTURE.length}
        </Tag>
        <Paragraph>
          Muestra la <strong>{COLOR_NAME[step.face]}</strong>: {step.hint}.
        </Paragraph>
      </div>

      <div className="scan__viewport">
        <video ref={videoRef} className="scan__video" playsInline muted />
        <canvas ref={canvasRef} className="scan__canvas" />
        <div className="scan__grid" aria-hidden>
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="scan__cell"
              style={live ? { borderColor: COLOR_HEX[live.faces[i]] } : undefined}
            >
              {live && (
                <span className="scan__chip" style={{ background: COLOR_HEX[live.faces[i]] }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="scan__status">
        {confident ? (
          <Tag variant="success">Lectura estable</Tag>
        ) : (
          <Tag variant="warning">Acerca el cubo y mejora la luz</Tag>
        )}
      </div>

      <div className="scan__actions">
        <Button variant="primary" onClick={captureCurrent} disabled={!live}>
          {stepIdx + 1 < CAPTURE.length ? 'Capturar y siguiente' : 'Capturar y finalizar'}
        </Button>
        <Button variant="text" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

/** Mapa desplegado (el "esquema") con los colores leídos. */
function CubeNet({ net }: { net: Net }) {
  const faceGrid = (face: Face) => (
    <div className="net__face" key={face}>
      {net[face].map((f, i) => (
        <span key={i} className="net__cell" style={{ background: COLOR_HEX[f] }} />
      ))}
    </div>
  )
  // Disposición en cruz: U arriba; L F R B en fila; D abajo.
  return (
    <div className="net">
      <div className="net__row net__row--center">{faceGrid('U')}</div>
      <div className="net__row">
        {faceGrid('L')}
        {faceGrid('F')}
        {faceGrid('R')}
        {faceGrid('B')}
      </div>
      <div className="net__row net__row--center">{faceGrid('D')}</div>
    </div>
  )
}
