import { useCallback, useEffect, useRef, useState } from 'react'
import { Scene } from './three/Scene'
import { StepHud, PracticeHud } from './Controls'
import { useTimer, formatTime } from './useTimer'
import { ViewControls, type ViewControlsHandle } from './ViewControls'
import { useCube } from './three/cube/useCube'
import { FACES, type Face } from './three/cube/engine'

/** Modo de la pantalla del cubo (lo fija la sección que la monta). */
export type ExperienceMode = 'free' | 'step' | 'practice' | 'timed'

/**
 * Pantalla del cubo. El modo lo fija la sección que la monta:
 *  - "free"      → mover caras libremente.
 *  - "step"      → resolución guiada (indica qué tecla pulsar).
 *  - "practice"  → libre, pero comprobando cada giro y con pistas.
 *  - "timed"     → libre con cronómetro.
 * Cada montaje arranca con un cubo recién mezclado, salvo que se pase
 * `initialFacelets` (un cubo escaneado ya validado), que se usa como estado inicial.
 */
export function CubeExperience({
  mode,
  initialFacelets,
}: {
  mode: ExperienceMode
  initialFacelets?: string
}) {
  const controller = useCube(initialFacelets)
  const { setMode, doMove, pressStep, practiceMove, revealHint, reset, solved } = controller
  const controlsRef = useRef<ViewControlsHandle | null>(null)

  // Modo cronometrado: hasta pulsar "Comenzar" el cubo está oculto (gris) y el
  // crono parado. Al comenzar se revelan los colores y arranca el tiempo.
  const [started, setStarted] = useState(false)
  // El cubo se oculta solo en cronometrado y mientras no se ha comenzado.
  const hideColors = mode === 'timed' && !started

  // Cronómetro (solo cuenta en modo cronometrado). Se pinta como HUD del visor.
  const elapsed = useTimer(started, solved)

  // Modo guiado (step): mostrar/ocultar el siguiente movimiento (oculto por defecto).
  const [showMove, setShowMove] = useState(false)

  // Reinicia el cronometrado: mezcla nueva, oculta el cubo y resetea "started".
  const handleRestart = () => {
    reset()
    setStarted(false)
  }

  // Enruta un giro (de teclado o de arrastre) según el modo. Mismo criterio que
  // antes tenía el teclado: en step/practice valida; en timed respeta la guardia.
  const handleTurn = useCallback(
    (face: Face, prime: boolean) => {
      if (mode === 'step') pressStep(face, prime)
      else if (mode === 'practice') practiceMove(face, prime)
      else if (mode === 'timed' && (!started || solved))
        return // aún no empezado o ya parado
      else doMove(face, prime) // free + timed
    },
    [mode, pressStep, practiceMove, doMove, started, solved],
  )

  // Fija el modo al entrar. "timed" usa el motor libre, así que no cambia de modo.
  useEffect(() => {
    if (mode === 'step') setMode('step')
    else if (mode === 'practice') setMode('practice')
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Atajos de teclado. Su efecto depende del modo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return

      // Esc: reiniciar (libre y cronometrado). Con una modal abierta, Esc la cierra.
      if (e.key === 'Escape') {
        if (e.repeat || document.querySelector('.modal__overlay')) return
        if (mode === 'free') {
          e.preventDefault()
          reset()
        } else if (mode === 'timed') {
          e.preventDefault()
          reset()
          setStarted(false)
        }
        return
      }

      // Espacio: pista (práctica) o comenzar la partida (cronometrado, aún sin empezar).
      // Si un botón tiene el foco, deja que se active él (evita doble acción).
      if (e.code === 'Space') {
        if (e.repeat) return
        if (document.activeElement?.tagName === 'BUTTON') return
        if (document.querySelector('.modal__overlay')) return
        if (mode === 'practice') {
          e.preventDefault()
          revealHint()
        } else if (mode === 'timed' && !started && !solved) {
          e.preventDefault()
          setStarted(true)
        }
        return
      }

      // Giros de cara U/D/L/R/F/B (+Shift).
      const face = e.key.toUpperCase() as Face
      if (!FACES.includes(face) || e.repeat) return
      e.preventDefault()
      handleTurn(face, e.shiftKey)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, handleTurn, revealHint, reset, started, solved])

  return (
    <div className={`cube cube--${mode}`}>
      <section className="viewport">
        <Scene
          controller={controller}
          controlsRef={controlsRef}
          hideColors={hideColors}
          onTurn={handleTurn}
        />
        <ViewControls
          controlsRef={controlsRef}
          mode={mode}
          timed={
            mode === 'timed'
              ? {
                  started,
                  solved,
                  busy: controller.busy,
                  onStart: () => setStarted(true),
                  onRestart: handleRestart,
                }
              : undefined
          }
          free={
            mode === 'free'
              ? {
                  busy: controller.busy,
                  solved,
                  lblLength: controller.lblLength,
                  kociembaLength: controller.kociembaLength,
                  onScramble: reset,
                  onSolveStep: controller.doSolve,
                  onSolveKociemba: controller.doSolveKociemba,
                }
              : undefined
          }
          practice={
            mode === 'practice'
              ? {
                  canHint: controller.hintLevel < 2 && controller.nextMove !== null,
                  hintLevel: controller.hintLevel,
                  onHint: revealHint,
                }
              : undefined
          }
          step={
            mode === 'step' ? { showMove, onToggleMove: () => setShowMove((v) => !v) } : undefined
          }
        />
        {/* Cronómetro: HUD flotante arriba a la derecha. Al resolver se oculta y
            deja paso a la caja "¡Cubo resuelto!" (coherente con el resto de modos). */}
        {mode === 'timed' && !solved && (
          <div className="timer-hud" data-state={started ? 'running' : 'idle'}>
            <span className="timer__value">{formatTime(elapsed)}</span>
          </div>
        )}
        {/* Práctica: caja (borde primary) arriba con la pista / feedback. */}
        {mode === 'practice' && <PracticeHud controller={controller} />}
        {/* Guiado: caja arriba con el siguiente movimiento (si el toggle lo activa). */}
        {mode === 'step' && <StepHud controller={controller} showMove={showMove} />}
        {/* Libre y cronometrado: misma caja de "¡Cubo resuelto!" que el resto de modos. */}
        {(mode === 'free' || mode === 'timed') && solved && (
          <div className="move-hud">¡Cubo resuelto!</div>
        )}
      </section>
    </div>
  )
}
