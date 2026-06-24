import { useEffect, useRef, useState } from 'react'
import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { Icon } from '@studiolxd/brand/icon'
import { List } from '@studiolxd/brand/list'
import { Scene } from './three/Scene'
import { KeyHint } from './Controls'
import { ViewControls, type ViewControlsHandle } from './ViewControls'
import { useCube } from './three/cube/useCube'
import { FACES, type Face } from './three/cube/engine'
import { STEPS, type StepId } from './three/cube/lbl'

/** Contenido didáctico de cada paso, fiel a nuestro método (blanco arriba,
 *  amarillo abajo) y al algoritmo que ejecuta el solver. */
const STEP_INFO: Record<StepId, { title: string; what: string; how: string }> = {
  cross: {
    title: 'La cruz blanca',
    what: 'Vas a formar una cruz blanca en la cara de arriba: las cuatro aristas que llevan blanco, colocadas alrededor del centro blanco.',
    how: 'No basta con que el blanco mire hacia arriba: el segundo color de cada arista (rojo, verde, azul o naranja) debe coincidir con el centro de su cara lateral. La técnica: junta primero las aristas blancas debajo (con el blanco hacia abajo) y luego sube cada una a su sitio.',
  },
  'first-corners': {
    title: 'Las esquinas blancas',
    what: 'Completa toda la primera capa colocando las cuatro esquinas que llevan blanco, cada una entre los centros de sus tres colores.',
    how: 'Lleva cada esquina a la capa de abajo, justo debajo del hueco donde va, y desde ahí súbela a su posición con una maniobra corta. Repite lo mismo para las cuatro esquinas hasta cerrar la capa de arriba.',
  },
  'middle-layer': {
    title: 'La segunda capa',
    what: 'Coloca las cuatro aristas de la capa de en medio: son las que no tienen ni blanco ni amarillo.',
    how: 'Busca en la capa de abajo una arista sin amarillo, gírala hasta que su color frontal case con el centro de esa cara y mándala a su hueco de en medio (a la izquierda o a la derecha, según su otro color), sin deshacer la primera capa.',
  },
  'last-cross': {
    title: 'La cruz amarilla',
    what: 'Cambiamos el foco a la cara amarilla, que está abajo. Lo primero es formar una cruz amarilla.',
    how: 'Aquí solo importa que las cuatro aristas tengan el amarillo hacia abajo (todavía no que encajen con los centros). Aplicando un mismo algoritmo desde la posición correcta, pasarás de punto → «L» → línea → cruz.',
  },
  'last-face': {
    title: 'La cara amarilla',
    what: 'Haz que toda la cara de abajo sea amarilla orientando las cuatro esquinas.',
    how: 'Se repite un mismo algoritmo (el «Sune»), colocando cada vez una esquina mal orientada en la posición de partida. Tras unas pocas repeticiones, toda la cara amarilla queda mirando hacia abajo.',
  },
  'permute-corners': {
    title: 'Colocar las esquinas',
    what: 'Las esquinas ya son amarillas por debajo, pero puede que no estén en su sitio. Llévalas a su posición correcta.',
    how: 'Ahora solo cambian de lugar, no de orientación: un algoritmo intercambia tres esquinas en ciclo. Repítelo (girando la capa de abajo entre medias) hasta que cada esquina quede entre sus colores correctos.',
  },
  'permute-edges': {
    title: 'Colocar las aristas',
    what: 'Último paso: coloca en su sitio las aristas de la última capa.',
    how: 'Un algoritmo rota tres aristas en ciclo. En cuanto cada arista encaja con los centros de su cara… ¡el cubo queda resuelto!',
  },
}

/** Nombre legible de cada cara, para el siguiente movimiento del HUD. */
const FACE_LABEL: Record<Face, string> = {
  U: 'Arriba',
  D: 'Abajo',
  L: 'Izquierda',
  R: 'Derecha',
  F: 'Frente',
  B: 'Atrás',
}

/**
 * Sección "Guía paso a paso": guía interactiva sobre EL cubo del usuario. Puedes
 * mover libremente todas las caras (a ver si lo resuelves tú); tras cada giro, el
 * solver por capas recalcula la solución y te dice en qué paso estás y cuál sería
 * el siguiente movimiento. Al completar cada etapa, muestra un mensaje en el HUD.
 *
 * Mismo patrón de layout que "Partes y movimientos" y "El cubo por dentro":
 * cubo + panel (hoja inferior en móvil, aside en escritorio) y flechas de paso.
 */
export function Guide() {
  const controller = useCube()
  const {
    setMode,
    doMove,
    reset,
    solved,
    mode,
    currentStepId,
    nextMove,
    solutionSteps,
    playToStep,
    busy,
  } = controller
  const controlsRef = useRef<ViewControlsHandle | null>(null)
  // El movimiento a pulsar va oculto por defecto; se revela con el check.
  const [showMove, setShowMove] = useState(false)

  // Mantiene el modo guía: al montar y tras "Reiniciar" (que vuelve a 'free'),
  // reentra en 'guide'. En este modo se mueve libre y la solución se recalcula sola.
  useEffect(() => {
    if (mode === 'free') setMode('guide')
  }, [mode, setMode])

  // Teclado: girar las caras LIBREMENTE (cualquier giro vale); Esc reinicia.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return

      // Esc: reinicia (mezcla nueva). Con una modal abierta, Esc la cierra.
      if (e.key === 'Escape') {
        if (e.repeat || document.querySelector('.modal__overlay')) return
        e.preventDefault()
        reset()
        return
      }

      const face = e.key.toUpperCase() as Face
      if (!FACES.includes(face) || e.repeat) return
      e.preventDefault()
      doMove(face, e.shiftKey)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doMove, reset])

  const preparing = mode !== 'guide'
  // Índice del paso actual dentro del orden del método (para marcar el progreso).
  const currentIdx = currentStepId ? STEPS.indexOf(currentStepId) : solved ? STEPS.length : -1

  // Mensaje efímero al completar una etapa (sustituye al confeti): aparece en el
  // HUD cuando el progreso avanza, como el "¡Resuelto!" de los otros modos.
  const [flash, setFlash] = useState<{ text: string } | null>(null)
  const prevIdx = useRef(-1)
  useEffect(() => {
    if (!preparing && prevIdx.current >= 0 && currentIdx > prevIdx.current) {
      setFlash({ text: solved ? '¡Cubo resuelto! 🎉' : '¡Etapa completada! 🎉' })
    }
    prevIdx.current = preparing ? -1 : currentIdx
  }, [currentIdx, preparing, solved])
  // El mensaje se oculta solo a los 1,8 s (cada `flash` es un objeto nuevo, así
  // que dos etapas seguidas reinician el temporizador correctamente).
  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(null), 1800)
    return () => clearTimeout(id)
  }, [flash])

  // Eyebrow del panel: el nombre del paso actual (o estado).
  const eyebrow = solved ? '¡Resuelto!' : currentStepId ? STEP_INFO[currentStepId].title : ''
  const canPrev = !busy && currentIdx > 0
  const canNext = !busy && currentIdx >= 0 && currentIdx < STEPS.length - 1
  // Movimientos que faltan para resolver (se muestra en el HUD).
  const remaining = solutionSteps.reduce((n, g) => n + g.moves.length, 0) - controller.stepIndex

  return (
    <div className="guide">
      <div className="guide__main">
        <section className="guide__stage">
          <Scene controller={controller} controlsRef={controlsRef} onTurn={doMove} />
          {/* Giro de vista + acciones de la guía: mostrar movimiento y reiniciar. */}
          <ViewControls
            controlsRef={controlsRef}
            mode="free"
            step={{ showMove, onToggleMove: () => setShowMove((v) => !v) }}
            guide={{ busy, onReset: reset, remaining }}
          />
          {/* Caja flotante arriba (como en los otros modos): el mensaje de etapa
              completada y, si "Mostrar movimiento" está activo, el siguiente giro. */}
          {flash ? (
            <div className="move-hud">{flash.text}</div>
          ) : !preparing && !solved && nextMove && showMove ? (
            <div className="move-hud">
              Gira <strong>{FACE_LABEL[nextMove.face]}</strong> <KeyHint move={nextMove} /> (
              {nextMove.power === 3 ? 'antihorario' : 'horario'})
            </div>
          ) : null}
        </section>

        {/* Flechas de paso: llevan el cubo al inicio del paso anterior/siguiente. */}
        <div className="guide__arrows">
          <button
            type="button"
            className="guide__chevron"
            onClick={() => canPrev && playToStep(STEPS[currentIdx - 1])}
            disabled={!canPrev}
            aria-label="Paso anterior"
          >
            <Icon name="chevron" size="lg" className="guide__chevron-icon--prev" />
          </button>
          <button
            type="button"
            className="guide__chevron"
            onClick={() => canNext && playToStep(STEPS[currentIdx + 1])}
            disabled={!canNext}
            aria-label="Paso siguiente"
          >
            <Icon name="chevron" size="lg" />
          </button>
        </div>
      </div>

      <aside className="guide__panel">
        <div className="guide__content">
          {eyebrow && <span className="guide__step">{eyebrow}</span>}
          <Heading level={1}>Guía paso a paso</Heading>

          {preparing ? (
            <Paragraph size="small">Preparando la guía para tu cubo…</Paragraph>
          ) : solved ? (
            <>
              <div className="step-key step-key--done">¡Cubo resuelto! 🎉</div>
              <Paragraph size="small">
                Ya dominas los pasos. Practícalos en el <strong>Modo práctica</strong> o vuelve a
                intentarlo con una mezcla nueva.
              </Paragraph>
            </>
          ) : currentStepId ? (
            <>
              <Paragraph size="small">{STEP_INFO[currentStepId].what}</Paragraph>
              <Paragraph size="small">
                <span className="guide-how">Cómo: </span>
                {STEP_INFO[currentStepId].how}
              </Paragraph>
            </>
          ) : null}
        </div>

        {/* Las etapas (progreso por los 7 pasos) van al final del aside. Pulsa una
            para llevar el cubo al inicio de ese paso. */}
        {!preparing && (
          <List type="plain" className="guide-steps">
            {STEPS.map((id, i) => {
              const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'todo'
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`guide-steps__item is-${state}`}
                    aria-current={i === currentIdx ? 'step' : undefined}
                    onClick={() => playToStep(id)}
                    disabled={busy}
                    title={`Llevar el cubo al inicio de: ${STEP_INFO[id].title}`}
                  >
                    <span className="guide-steps__marker">{state === 'done' ? '✓' : i + 1}</span>
                    <span className="guide-steps__label">{STEP_INFO[id].title}</span>
                  </button>
                </li>
              )
            })}
          </List>
        )}
      </aside>
    </div>
  )
}
