import { useEffect, useRef, useState } from 'react'
import { Tag } from '@studiolxd/brand/tag'
import { Scene } from './three/Scene'
import { FreeControls, StepControls, PracticeControls, TimedControls } from './Controls'
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
 * Cada montaje arranca con un cubo recién mezclado.
 */
export function CubeExperience({ mode }: { mode: ExperienceMode }) {
  const controller = useCube()
  const { setMode, doMove, pressStep, practiceMove, revealHint, reset, solved } = controller
  const controlsRef = useRef<ViewControlsHandle | null>(null)

  // Modo cronometrado: hasta pulsar "Comenzar" el cubo está oculto (gris) y el
  // crono parado. Al comenzar se revelan los colores y arranca el tiempo.
  const [started, setStarted] = useState(false)
  // El cubo se oculta solo en cronometrado y mientras no se ha comenzado.
  const hideColors = mode === 'timed' && !started

  // Reinicia el cronometrado: mezcla nueva, oculta el cubo y resetea "started".
  const handleRestart = () => {
    reset()
    setStarted(false)
  }

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
      if (mode === 'step') pressStep(face, e.shiftKey)
      else if (mode === 'practice') practiceMove(face, e.shiftKey)
      else if (mode === 'timed' && (!started || solved))
        return // aún no empezado o ya parado
      else doMove(face, e.shiftKey) // free + timed
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, doMove, pressStep, practiceMove, revealHint, reset, started, solved])

  return (
    <div className="cube">
      <section className="viewport">
        <Scene controller={controller} controlsRef={controlsRef} hideColors={hideColors} />
        <ViewControls controlsRef={controlsRef} mode={mode} />
      </section>
      <aside className="panel">
        {/* El badge de "Resuelto" lo gestiona internamente cada modo cuando aplica. */}
        {solved && mode !== 'timed' && mode !== 'practice' && (
          <div className="panel__badge">
            <Tag variant="success">✓ Resuelto</Tag>
          </div>
        )}
        {mode === 'free' && <FreeControls controller={controller} />}
        {mode === 'step' && <StepControls controller={controller} />}
        {mode === 'practice' && <PracticeControls controller={controller} />}
        {mode === 'timed' && (
          <TimedControls
            controller={controller}
            started={started}
            onStart={() => setStarted(true)}
            onRestart={handleRestart}
          />
        )}
      </aside>
    </div>
  )
}
