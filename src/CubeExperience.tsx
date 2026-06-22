import { useEffect } from 'react'
import { Tag } from '@studiolxd/brand/tag'
import { Scene } from './three/Scene'
import { FreeControls, StepControls } from './Controls'
import { useCube } from './three/cube/useCube'
import { FACES, type Face } from './three/cube/engine'

/**
 * Pantalla del cubo. El modo lo fija la sección que la monta:
 *  - "libre"  → mover caras libremente.
 *  - "step"   → resolución guiada (indica qué tecla pulsar).
 * Cada montaje arranca con un cubo recién mezclado.
 */
export function CubeExperience({ mode }: { mode: 'free' | 'step' }) {
  const controller = useCube()
  const { setMode, doMove, pressStep, solved } = controller

  // Fija el modo guiado al entrar (calcula la solución del cubo mezclado).
  useEffect(() => {
    if (mode === 'step') setMode('step')
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Atajos de teclado U/D/L/R/F/B (+Shift). En libre giran; en guiado avanzan.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      const face = e.key.toUpperCase() as Face
      if (!FACES.includes(face) || e.repeat) return
      e.preventDefault()
      if (mode === 'free') doMove(face, e.shiftKey)
      else pressStep(face, e.shiftKey)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, doMove, pressStep])

  return (
    <div className="cube">
      <section className="viewport">
        <Scene controller={controller} />
      </section>
      <aside className="panel">
        {solved && (
          <div className="panel__badge">
            <Tag variant="success">✓ Resuelto</Tag>
          </div>
        )}
        {mode === 'free' ? (
          <FreeControls controller={controller} />
        ) : (
          <StepControls controller={controller} />
        )}
      </aside>
    </div>
  )
}
