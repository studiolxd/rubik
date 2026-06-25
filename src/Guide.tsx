import { useEffect, useRef, useState } from 'react'
import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { List } from '@studiolxd/brand/list'
import { Button } from '@studiolxd/brand/button'
import { Alert } from '@studiolxd/brand/alert'
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
  /** Etiqueta del algoritmo principal cuando hay variante espejo (p. ej. «Inserción a la derecha»). */
  algorithmLabel?: string
  /** Variante espejo del algoritmo (p. ej. la inserción a la izquierda), si la hay. */
  mirror?: { label: string; algorithm: string }
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
    what: 'Este primer paso no sigue ningún algoritmo, tienes que resolverlo por intuición. Forma una cruz blanca en la cara de abajo: las cuatro aristas que llevan blanco, colocadas alrededor del centro blanco.',
    how: 'No basta con que el blanco mire hacia abajo: el segundo color de cada arista (rojo, verde, azul o naranja) debe coincidir con el centro de su cara lateral. La técnica: forma primero una margarita arriba (las cuatro aristas blancas alrededor del centro amarillo, con el blanco hacia arriba) y luego baja cada una a su sitio.',
    algorithm: null,
    mnemonic:
      'Forma la margarita arriba (cuatro aristas blancas alrededor del centro amarillo) y, cuando el otro color de una arista coincida con su centro lateral, gira esa cara 180° (doble giro: F2, R2, L2 o B2) para bajarla a la cruz.',
    done: 'Habrás completado esta etapa cuando formes una cruz blanca abajo y cada arista lateral formando una T con su centro.',
  },
  'first-corners': {
    title: 'Las esquinas blancas',
    what: 'Completa toda la primera capa colocando las cuatro esquinas que llevan blanco, cada una entre los centros de sus tres colores.',
    how: 'Lleva cada esquina a la capa de arriba, justo encima del hueco donde va, y desde ahí bájala a su posición con una maniobra corta. Repite lo mismo para las cuatro esquinas hasta cerrar la capa de abajo.',
    algorithm: "R U R' U'",
    mnemonic: 'El «sexy move».',
    note: 'Repite este gatillo hasta que la esquina entre con el blanco abajo, sin romper la cruz.',
    done: 'Habrás completado esta etapa cuando toda la cara de abajo sea blanca y la primera fila de cada lateral case con su centro.',
  },
  'middle-layer': {
    title: 'La segunda capa',
    what: 'Coloca las cuatro aristas de la capa de en medio: son las que no tienen ni blanco ni amarillo.',
    how: 'Busca en la capa de arriba una arista sin amarillo, gírala hasta que su color frontal coincida con el centro de esa cara y mándala a su hueco de en medio sin deshacer la primera capa. Según su otro color, la arista tendrá que bajar hacia la derecha o hacia la izquierda: usa el algoritmo de ese lado.',
    algorithm: "U R U' R' U' F' U F",
    algorithmLabel: 'Inserción a la derecha',
    mirror: { label: 'Inserción a la izquierda', algorithm: "U' L' U L U F U' F'" },
    mnemonic:
      'Son el mismo algoritmo y su espejo: el de la derecha mete la arista en el hueco de la derecha; el de la izquierda, en el de la izquierda. Elige según hacia dónde tenga que bajar.',
    note: 'Inserta la arista del techo en su hueco de en medio sin deshacer la capa blanca.',
    done: 'Habrás completado esta etapa cuando las dos capas de abajo estén completas y cada lateral muestre dos tercios de su color.',
  },
  'last-cross': {
    title: 'La cruz amarilla',
    what: 'Cambiamos el foco a la cara amarilla, que está arriba. Lo primero es formar una cruz amarilla.',
    how: 'Aquí solo importa que las cuatro aristas tengan el amarillo hacia arriba (todavía no que encajen con los centros). Aplicando un mismo algoritmo desde la posición correcta, pasarás de punto → «L» → línea → cruz.',
    algorithm: "F R U R' U' F'",
    mnemonic: 'F + el «sexy move» + F’.',
    note: 'Orienta las aristas amarillas: del punto pasarás a L, de la L a línea, y de la línea a cruz.',
    done: 'Habrás completado esta etapa cuando veas una cruz amarilla arriba (aunque los laterales aún no casen).',
  },
  'last-face': {
    title: 'La cara amarilla',
    what: 'Haz que toda la cara de arriba sea amarilla orientando las cuatro esquinas.',
    how: 'Se repite un mismo algoritmo (el «Sune»), colocando cada vez una esquina mal orientada en la posición de partida. Tras unas pocas repeticiones, toda la cara amarilla queda mirando hacia arriba.',
    algorithm: "R U R' U R U2 R'",
    mnemonic: 'El «Sune», el algoritmo más famoso del cubo.',
    note: 'Cada vez que lo aplicas, gira la orientación de tres esquinas a la vez; repítelo, colocando una esquina mal orientada en la posición de partida, hasta que toda la cara sea amarilla.',
    done: 'Habrás completado esta etapa cuando toda la cara de arriba sea amarilla.',
  },
  'permute-corners': {
    title: 'Colocar las esquinas',
    what: 'Las esquinas ya son amarillas por arriba, pero puede que no estén en su sitio. Llévalas a su posición correcta.',
    how: 'Ahora solo cambian de sitio, no de orientación: un algoritmo intercambia de posición tres esquinas a la vez. Repítelo (girando la capa de arriba entre medias) hasta que cada esquina quede entre sus colores correctos.',
    algorithm: "R' F R' B2 R F' R' B2 R2",
    mnemonic: 'El cántico «Run to me fast, back back».',
    note: 'Intercambia de sitio tres esquinas a la vez, sin tocar su orientación ni las aristas.',
    done: 'Habrás completado esta etapa cuando las cuatro esquinas estén entre sus colores correctos (las aristas pueden faltar).',
  },
  'permute-edges': {
    title: 'Colocar las aristas',
    what: 'Último paso: coloca en su sitio las aristas de la última capa.',
    how: 'Un algoritmo intercambia de sitio tres aristas a la vez. En cuanto cada arista encaja con los centros de su cara… ¡el cubo queda resuelto!',
    algorithm: "R U' R U R U R U' R' U' R2",
    mnemonic: 'Un «U-perm».',
    note: 'Intercambia de sitio tres aristas a la vez, sin tocar las esquinas.',
    done: 'Habrás completado esta etapa cuando cada arista encaje con su centro y el cubo quede resuelto.',
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

/** Pregunta de la micro-actividad, específica de cada paso (nombra lo que hay que
 *  localizar: la forma amarilla en la cruz, las esquinas amarillas en la cara). */
const CASE_QUESTION: Record<StepCase['step'], string> = {
  'last-cross': '¿Qué forma dibujan las aristas amarillas de arriba?',
  'last-face': '¿Cuántas esquinas amarillas miran hacia arriba?',
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
  const correct = picked === kase.value
  const correctLabel = options.find((o) => o.value === kase.value)?.label
  return (
    <div className="guide-case">
      <Heading level={2} size={4}>
        {CASE_QUESTION[kase.step]}
      </Heading>
      <div className="guide-case__opts">
        {options.map((o) => (
          // Tras responder: la correcta se rellena (primary); la elegida por error se
          // marca en rojo (outline destructive); el resto queda con contorno neutro.
          <Button
            key={String(o.value)}
            size="sm"
            variant={revealed && o.value === kase.value ? 'primary' : 'outline'}
            destructive={revealed && o.value === picked && o.value !== kase.value}
            onClick={() => setPicked(o.value)}
          >
            {o.label}
          </Button>
        ))}
      </div>
      {revealed &&
        (correct ? (
          <Alert variant="success" title="¡Correcto!" description={help ?? undefined} />
        ) : (
          <Alert
            variant="error"
            title={correctLabel ? `Es «${correctLabel}»` : 'No es ese caso'}
            description={help ?? undefined}
          />
        ))}
    </div>
  )
}

/** Fila de chips de un algoritmo en notación estándar (cada giro, un chip). */
function MoveChips({ algorithm }: { algorithm: string }) {
  return (
    <p className="guide-alg__moves">
      {algorithm.split(' ').map((mv, i) => (
        <span key={i} className="guide-alg__move">
          {mv}
        </span>
      ))}
    </p>
  )
}

/** Detalle didáctico del paso actual: objetivo, técnica, algoritmo y checkpoint. */
function StepDetail({ step }: { step: StepId }) {
  const info = STEP_INFO[step]
  return (
    <>
      <Paragraph>{info.what}</Paragraph>
      <Paragraph>{info.how}</Paragraph>
      <div className="guide-alg">
        <Heading level={2} size={4}>
          {info.algorithm ? 'El algoritmo' : 'El truco'}
        </Heading>
        {info.algorithm &&
          (info.mirror ? (
            <>
              <div className="guide-alg__variant">
                {info.algorithmLabel && (
                  <span className="guide-alg__variant-label">{info.algorithmLabel}</span>
                )}
                <MoveChips algorithm={info.algorithm} />
              </div>
              <div className="guide-alg__variant">
                <span className="guide-alg__variant-label">{info.mirror.label}</span>
                <MoveChips algorithm={info.mirror.algorithm} />
              </div>
            </>
          ) : (
            <MoveChips algorithm={info.algorithm} />
          ))}
        <span className="guide-alg__name">{info.mnemonic}</span>
        {info.note && <span className="guide-alg__note">{info.note}</span>}
      </div>
      <p className="guide-done">{info.done}</p>
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
              // Solo se navega hacia adelante: las etapas ya hechas (y la actual) no
              // se pueden "rebobinar", así que se muestran pero no son pulsables.
              const reachable = i > currentIdx
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`guide-steps__item is-${state}`}
                    aria-current={i === currentIdx ? 'step' : undefined}
                    onClick={() => playToStep(id)}
                    disabled={busy || !reachable}
                    title={
                      reachable
                        ? `Avanzar el cubo hasta: ${STEP_INFO[id].title}`
                        : STEP_INFO[id].title
                    }
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
