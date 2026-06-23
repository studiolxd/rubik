import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { Button } from '@studiolxd/brand/button'
import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { Tag } from '@studiolxd/brand/tag'
import { CheckboxField } from '@studiolxd/brand/checkbox-field'
import { List } from '@studiolxd/brand/list'
import { Scene } from './three/Scene'
import { KeyHint } from './Controls'
import { ViewControls, type ViewControlsHandle } from './ViewControls'
import { useCube } from './three/cube/useCube'
import { FACES, moveToString, type Face } from './three/cube/engine'
import { STEPS, type StepId } from './three/cube/lbl'

/** Contenido didáctico de cada paso, fiel a nuestro método (blanco arriba,
 *  amarillo abajo) y al algoritmo que ejecuta el solver. */
const STEP_INFO: Record<StepId, { title: string; what: string; how: string }> = {
  cruz: {
    title: 'La cruz blanca',
    what: 'Vas a formar una cruz blanca en la cara de arriba: las cuatro aristas que llevan blanco, colocadas alrededor del centro blanco.',
    how: 'No basta con que el blanco mire hacia arriba: el segundo color de cada arista (rojo, verde, azul o naranja) debe coincidir con el centro de su cara lateral. La técnica: junta primero las aristas blancas debajo (con el blanco hacia abajo) y luego sube cada una a su sitio.',
  },
  'esquinas-primera': {
    title: 'Las esquinas blancas',
    what: 'Completa toda la primera capa colocando las cuatro esquinas que llevan blanco, cada una entre los centros de sus tres colores.',
    how: 'Lleva cada esquina a la capa de abajo, justo debajo del hueco donde va, y desde ahí súbela a su posición con una maniobra corta. Repite lo mismo para las cuatro esquinas hasta cerrar la capa de arriba.',
  },
  'segunda-capa': {
    title: 'La segunda capa',
    what: 'Coloca las cuatro aristas de la capa de en medio: son las que no tienen ni blanco ni amarillo.',
    how: 'Busca en la capa de abajo una arista sin amarillo, gírala hasta que su color frontal case con el centro de esa cara y mándala a su hueco de en medio (a la izquierda o a la derecha, según su otro color), sin deshacer la primera capa.',
  },
  'cruz-ultima': {
    title: 'La cruz amarilla',
    what: 'Cambiamos el foco a la cara amarilla, que está abajo. Lo primero es formar una cruz amarilla.',
    how: 'Aquí solo importa que las cuatro aristas tengan el amarillo hacia abajo (todavía no que encajen con los centros). Aplicando un mismo algoritmo desde la posición correcta, pasarás de punto → «L» → línea → cruz.',
  },
  'cara-ultima': {
    title: 'La cara amarilla',
    what: 'Haz que toda la cara de abajo sea amarilla orientando las cuatro esquinas.',
    how: 'Se repite un mismo algoritmo (el «Sune»), colocando cada vez una esquina mal orientada en la posición de partida. Tras unas pocas repeticiones, toda la cara amarilla queda mirando hacia abajo.',
  },
  'permutar-esquinas': {
    title: 'Colocar las esquinas',
    what: 'Las esquinas ya son amarillas por debajo, pero puede que no estén en su sitio. Llévalas a su posición correcta.',
    how: 'Ahora solo cambian de lugar, no de orientación: un algoritmo intercambia tres esquinas en ciclo. Repítelo (girando la capa de abajo entre medias) hasta que cada esquina quede entre sus colores correctos.',
  },
  'permutar-aristas': {
    title: 'Colocar las aristas',
    what: 'Último paso: coloca en su sitio las aristas de la última capa.',
    how: 'Un algoritmo rota tres aristas en ciclo. En cuanto cada arista encaja con los centros de su cara… ¡el cubo queda resuelto!',
  },
}

/** Sentido legible de un giro (la solución solo usa potencias 1 y 3). */
const turnSense = (power: number) => (power === 3 ? 'antihorario (con Shift)' : 'horario')

/**
 * Sección "Guía paso a paso": guía interactiva sobre EL cubo del usuario. Puedes
 * mover libremente todas las caras (a ver si lo resuelves tú); tras cada giro, el
 * solver por capas recalcula la solución y te dice en qué paso estás y cuál sería
 * el siguiente movimiento. Al completar cada paso, lanza confeti.
 */
export function Guia() {
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
  // Hoja de controles (solo móvil): colapsada por defecto.
  const [sheetExpanded, setSheetExpanded] = useState(false)

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

  // Confeti al completar un paso: dispara cuando el progreso avanza (no al
  // recalcular hacia atrás ni durante la preparación). Más grande al resolver.
  const prevIdx = useRef(-1)
  useEffect(() => {
    if (!preparing && prevIdx.current >= 0 && currentIdx > prevIdx.current) {
      confetti({
        particleCount: solved ? 220 : 70,
        spread: solved ? 120 : 70,
        origin: { y: 0.6 },
      })
    }
    prevIdx.current = preparing ? -1 : currentIdx
  }, [currentIdx, preparing, solved])

  return (
    <div className="cube">
      <section className="viewport">
        <Scene controller={controller} controlsRef={controlsRef} onTurn={doMove} />
        <ViewControls controlsRef={controlsRef} mode="free" />
      </section>

      <aside className={`panel${sheetExpanded ? ' is-expanded' : ''}`}>
        <button
          type="button"
          className="panel__handle"
          onClick={() => setSheetExpanded((v) => !v)}
          aria-expanded={sheetExpanded}
          aria-label={sheetExpanded ? 'Colapsar panel de controles' : 'Expandir panel de controles'}
        />
        <section className="panel__section">
          <Heading level={2} size={3} weight="semibold">
            Guía paso a paso
          </Heading>

          {preparing ? (
            <Paragraph size="small">Preparando la guía para tu cubo…</Paragraph>
          ) : (
            <>
              {/* Progreso por los 7 pasos. Pulsa uno para llevar el cubo al inicio de ese paso. */}
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
                        <span className="guide-steps__marker">
                          {state === 'done' ? '✓' : i + 1}
                        </span>
                        <span className="guide-steps__label">{STEP_INFO[id].title}</span>
                      </button>
                    </li>
                  )
                })}
              </List>

              {solved ? (
                <>
                  <div className="step-key step-key--done">¡Cubo resuelto! 🎉</div>
                  <Paragraph size="small">
                    Ya dominas los pasos. Practícalos en el <strong>Modo práctica</strong> o vuelve
                    a intentarlo con una mezcla nueva.
                  </Paragraph>
                </>
              ) : (
                currentStepId && (
                  <div className="guide-current">
                    <p className="intro__group">
                      Paso {currentIdx + 1} de {STEPS.length}
                    </p>
                    <Heading level={3} size={4} weight="bold">
                      {STEP_INFO[currentStepId].title}
                    </Heading>
                    <Paragraph size="small">{STEP_INFO[currentStepId].what}</Paragraph>
                    <Paragraph size="small">
                      <span className="guide-how">Cómo: </span>
                      {STEP_INFO[currentStepId].how}
                    </Paragraph>

                    {nextMove && (
                      <>
                        <CheckboxField
                          label="Mostrar movimiento"
                          checked={showMove}
                          onCheckedChange={(v) => setShowMove(v === true)}
                        />
                        {showMove && (
                          <div className="step-key">
                            <span className="step-key__caption">Pulsa</span>
                            <KeyHint move={nextMove} />
                            <Paragraph size="small">
                              giro {moveToString(nextMove)} ({turnSense(nextMove.power)})
                            </Paragraph>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              )}
            </>
          )}

          <Button variant="outline" block onClick={reset} disabled={controller.busy}>
            Reiniciar
          </Button>
          {solutionSteps.length > 0 && !preparing && !solved && (
            <Tag variant="info">
              Quedan {solutionSteps.reduce((n, g) => n + g.moves.length, 0) - controller.stepIndex}{' '}
              movimientos
            </Tag>
          )}
        </section>
      </aside>
    </div>
  )
}
