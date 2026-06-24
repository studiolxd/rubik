import { useEffect, useRef, useState } from 'react'
import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { List } from '@studiolxd/brand/list'
import { Scene } from './three/Scene'
import { KeyHint } from './Controls'
import { ViewControls, type ViewControlsHandle } from './ViewControls'
import { useCube } from './three/cube/useCube'
import { FACES, type Face } from './three/cube/engine'
import { STEPS, type StepCase, type StepId } from './three/cube/lbl'
import { useScormCompleteOnSolve } from './scorm'

/** Contenido didáctico de un paso del método. */
interface StepInfo {
  title: string
  /** Objetivo del paso. */
  what: string
  /** La idea / técnica (el porqué). */
  how: string
  /** Algoritmo de la fase en notación estándar; null en fases intuitivas (la cruz). */
  algorithm: string | null
  /** Nombre o regla mnemotécnica (siempre presente: en las fases sin algoritmo, la técnica). */
  mnemonic: string
  /** Qué hace el algoritmo, en una línea (solo fases con algoritmo). */
  note?: string
  /** Checkpoint: «sabrás que terminaste cuando…». */
  done: string
}

/** Contenido didáctico de cada paso, fiel a nuestro método (blanco abajo,
 *  amarillo arriba —convención estándar) y al algoritmo que ejecuta el solver. */
const STEP_INFO: Record<StepId, StepInfo> = {
  cross: {
    title: 'La cruz blanca',
    what: 'Vas a formar una cruz blanca en la cara de abajo: las cuatro aristas que llevan blanco, colocadas alrededor del centro blanco.',
    how: 'No basta con que el blanco mire hacia abajo: el segundo color de cada arista (rojo, verde, azul o naranja) debe coincidir con el centro de su cara lateral. La técnica: forma primero una margarita arriba (las cuatro aristas blancas alrededor del centro amarillo, con el blanco hacia arriba) y luego baja cada una a su sitio.',
    algorithm: null,
    mnemonic: 'Empareja arriba, baja con doble giro.',
    done: 'Verás una cruz blanca abajo y cada arista lateral formando una T con su centro.',
  },
  'first-corners': {
    title: 'Las esquinas blancas',
    what: 'Completa toda la primera capa colocando las cuatro esquinas que llevan blanco, cada una entre los centros de sus tres colores.',
    how: 'Lleva cada esquina a la capa de arriba, justo encima del hueco donde va, y desde ahí bájala a su posición con una maniobra corta. Repite lo mismo para las cuatro esquinas hasta cerrar la capa de abajo.',
    algorithm: "R U R' U'",
    mnemonic: 'El «sexy move».',
    note: 'Repite este gatillo hasta que la esquina entre con el blanco abajo, sin romper la cruz.',
    done: 'Toda la cara de abajo será blanca y la primera fila de cada lateral casará con su centro. ¡Primera capa, 1/3!',
  },
  'middle-layer': {
    title: 'La segunda capa',
    what: 'Coloca las cuatro aristas de la capa de en medio: son las que no tienen ni blanco ni amarillo.',
    how: 'Busca en la capa de arriba una arista sin amarillo, gírala hasta que su color frontal case con el centro de esa cara y mándala a su hueco de en medio (a la izquierda o a la derecha, según su otro color), sin deshacer la primera capa.',
    algorithm: "U R U' R' U' F' U F",
    mnemonic: 'Inserción a la derecha (su espejo, a la izquierda: U’ L’ U L U F U’ F’).',
    note: 'Lleva la arista del techo a su hueco de en medio sin deshacer la capa blanca.',
    done: 'Las dos capas de abajo completas: cada lateral con dos tercios de su color. ¡2/3!',
  },
  'last-cross': {
    title: 'La cruz amarilla',
    what: 'Cambiamos el foco a la cara amarilla, que está arriba. Lo primero es formar una cruz amarilla.',
    how: 'Aquí solo importa que las cuatro aristas tengan el amarillo hacia arriba (todavía no que encajen con los centros). Aplicando un mismo algoritmo desde la posición correcta, pasarás de punto → «L» → línea → cruz.',
    algorithm: "F R U R' U' F'",
    mnemonic: 'F + el «sexy move» + F’.',
    note: 'Orienta las aristas amarillas: del punto pasarás a L, de la L a línea, y de la línea a cruz.',
    done: 'Una cruz amarilla arriba (aunque los laterales aún no casen).',
  },
  'last-face': {
    title: 'La cara amarilla',
    what: 'Haz que toda la cara de arriba sea amarilla orientando las cuatro esquinas.',
    how: 'Se repite un mismo algoritmo (el «Sune»), colocando cada vez una esquina mal orientada en la posición de partida. Tras unas pocas repeticiones, toda la cara amarilla queda mirando hacia arriba.',
    algorithm: "R U R' U R U2 R'",
    mnemonic: 'El «Sune», el algoritmo más famoso del cubo.',
    note: 'Cicla la orientación de 3 esquinas; repítelo desde la posición correcta hasta que toda la cara sea amarilla.',
    done: 'Toda la cara de arriba amarilla.',
  },
  'permute-corners': {
    title: 'Colocar las esquinas',
    what: 'Las esquinas ya son amarillas por arriba, pero puede que no estén en su sitio. Llévalas a su posición correcta.',
    how: 'Ahora solo cambian de lugar, no de orientación: un algoritmo intercambia tres esquinas en ciclo. Repítelo (girando la capa de arriba entre medias) hasta que cada esquina quede entre sus colores correctos.',
    algorithm: "R' F R' B2 R F' R' B2 R2",
    mnemonic: 'El cántico «Run to me fast, back back».',
    note: 'Permuta 3 esquinas en ciclo sin tocar su orientación ni las aristas.',
    done: 'Las 4 esquinas entre sus colores correctos (las aristas pueden faltar).',
  },
  'permute-edges': {
    title: 'Colocar las aristas',
    what: 'Último paso: coloca en su sitio las aristas de la última capa.',
    how: 'Un algoritmo rota tres aristas en ciclo. En cuanto cada arista encaja con los centros de su cara… ¡el cubo queda resuelto!',
    algorithm: "R U' R U R U R U' R' U' R2",
    mnemonic: 'Un «U-perm».',
    note: 'Rota 3 aristas en ciclo sin tocar las esquinas.',
    done: '¡El cubo queda resuelto!',
  },
}

/** Intención (el «porqué») del giro que toca, por fase, para el HUD del siguiente movimiento. */
const STEP_AIM: Record<StepId, string> = {
  cross: 'para juntar las aristas blancas',
  'first-corners': 'para meter la esquina sin romper la cruz',
  'middle-layer': 'para bajar la arista a su hueco',
  'last-cross': 'para orientar las aristas amarillas',
  'last-face': 'para orientar las esquinas amarillas',
  'permute-corners': 'para llevar las esquinas a su sitio',
  'permute-edges': 'para llevar las aristas a su sitio',
}

/** Texto de ayuda del caso reconocido del paso actual, o null si no aplica. */
function caseHelp(c: StepCase | null): string | null {
  if (!c) return null
  if (c.step === 'last-cross') {
    if (c.value === 'dot')
      return 'Tienes un punto: aplica el algoritmo y aparecerá una L o una línea.'
    if (c.value === 'L')
      return 'Tienes una L: colócala mirando arriba-izquierda y aplica el algoritmo.'
    if (c.value === 'line') return 'Tienes una línea: ponla horizontal y aplica el algoritmo.'
    return null // cross: el paso ya está hecho
  }
  if (c.step === 'last-face') {
    if (c.value === 0)
      return 'No ves esquinas amarillas arriba: pon una pegatina amarilla a la izquierda y aplica.'
    if (c.value === 1) return 'Ves 1 esquina amarilla («pez»): ponla abajo-izquierda y aplica.'
    if (c.value === 2) return 'Ves 2 esquinas amarillas: oriéntalas según el patrón y aplica.'
    return null // done
  }
  return null
}

/** Opciones de la micro-actividad de reconocimiento de caso, por paso. */
const CASE_OPTIONS: Record<StepCase['step'], { value: string | number; label: string }[]> = {
  'last-cross': [
    { value: 'dot', label: 'Punto' },
    { value: 'L', label: 'L' },
    { value: 'line', label: 'Línea' },
  ],
  'last-face': [
    { value: 0, label: 'Ninguna' },
    { value: 1, label: '1 esquina' },
    { value: 2, label: '2 esquinas' },
  ],
}

/** Micro-actividad: «¿qué caso ves?». Convierte el reconocimiento del patrón
 *  (punto/L/línea; 0/1/2 esquinas) en aprendizaje activo. Al elegir, revela la
 *  respuesta y la ayuda del caso. Se reinicia cuando el caso cambia. */
function CaseQuiz({ kase }: { kase: StepCase }) {
  const options = CASE_OPTIONS[kase.step]
  const [picked, setPicked] = useState<string | number | null>(null)
  useEffect(() => setPicked(null), [kase.step, kase.value])
  // Si el valor no está entre las opciones (p. ej. 'cross'/'done'), no hay caso que reconocer.
  if (!options.some((o) => o.value === kase.value)) return null
  const help = caseHelp(kase)
  const revealed = picked !== null
  return (
    <div className="guide-case">
      <span className="guide-case__q">¿Qué caso ves arriba?</span>
      <div className="guide-case__opts">
        {options.map((o) => {
          const cls = !revealed
            ? 'is-idle'
            : o.value === kase.value
              ? 'is-ok'
              : o.value === picked
                ? 'is-no'
                : 'is-idle'
          return (
            <button
              key={String(o.value)}
              type="button"
              className={`guide-case__opt ${cls}`}
              onClick={() => setPicked(o.value)}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      {revealed && help && <p className="guide-case__help">{help}</p>}
    </div>
  )
}

/** Detalle didáctico del paso actual: objetivo, técnica, algoritmo y checkpoint. */
function StepDetail({ step }: { step: StepId }) {
  const info = STEP_INFO[step]
  const moves = info.algorithm ? info.algorithm.split(' ') : []
  return (
    <>
      <Paragraph>{info.what}</Paragraph>
      <Paragraph>{info.how}</Paragraph>
      <div className="guide-alg">
        <span className="guide-alg__label">{info.algorithm ? 'El algoritmo' : 'El truco'}</span>
        {moves.length > 0 && (
          <p className="guide-alg__moves">
            {moves.map((mv, i) => (
              <span key={i} className="guide-alg__move">
                {mv}
              </span>
            ))}
          </p>
        )}
        <span className="guide-alg__name">{info.mnemonic}</span>
        {info.note && <span className="guide-alg__note">{info.note}</span>}
      </div>
      <p className="guide-done">
        <span className="guide-done__label">Lo sabrás cuando:</span> {info.done}
      </p>
    </>
  )
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
    currentCase,
    nextMove,
    solutionSteps,
    playToStep,
    busy,
  } = controller
  // Único criterio de completado del SCORM: resolver el cubo en esta sección.
  useScormCompleteOnSolve(solved)
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
  // HUD cuando el progreso avanza, como el "¡Cubo resuelto!" de los otros modos.
  const [flash, setFlash] = useState<{ text: string } | null>(null)
  const prevIdx = useRef(-1)
  useEffect(() => {
    if (!preparing && prevIdx.current >= 0 && currentIdx > prevIdx.current) {
      const prev = prevIdx.current
      let text = '¡Etapa completada!'
      if (solved) text = '¡Cubo resuelto!'
      else if (currentIdx >= 3 && prev < 3) text = '¡Segunda capa lista! Vas por 2/3.'
      else if (currentIdx >= 2 && prev < 2) text = '¡Primera capa lista! Vas por 1/3.'
      setFlash({ text })
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
  const eyebrow = solved ? '¡Cubo resuelto!' : currentStepId ? STEP_INFO[currentStepId].title : ''
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
              {currentStepId && <> — {STEP_AIM[currentStepId]}</>}
            </div>
          ) : null}
        </section>
      </div>

      <aside className="guide__panel">
        <div className="guide__content">
          {eyebrow && <span className="guide__step">{eyebrow}</span>}
          <Heading level={1}>Resuélvelo paso a paso</Heading>

          {!preparing && !solved && currentIdx >= 0 && (
            <div className="guide-progress">
              <span className="guide-progress__label">
                Paso {currentIdx + 1} de {STEPS.length}
              </span>
              <div className="guide-progress__track">
                <div
                  className="guide-progress__fill"
                  style={{ width: `${(currentIdx / STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {preparing ? (
            <Paragraph>Preparando la guía para tu cubo…</Paragraph>
          ) : solved ? (
            <>
              <div className="step-key step-key--done">¡Cubo resuelto!</div>
              <Paragraph>
                Ya dominas los pasos. Practícalos en el <strong>Modo práctica</strong> o vuelve a
                intentarlo con una mezcla nueva.
              </Paragraph>
            </>
          ) : currentStepId ? (
            <>
              {currentIdx === 0 && (
                <Paragraph>
                  Cuesta al principio; sigue las teclas y, con constancia, lo sacas.
                </Paragraph>
              )}
              {currentCase && <CaseQuiz kase={currentCase} />}
              <StepDetail step={currentStepId} />
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
