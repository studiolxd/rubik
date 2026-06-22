import { useEffect } from 'react'
import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { Scene } from './three/Scene'
import { Controls } from './Controls'
import { useCube } from './three/cube/useCube'
import { FACES, type Face } from './three/cube/engine'
import './App.css'

function App() {
  const controller = useCube()
  const { mode, doMove, pressStep } = controller

  // Atajos de teclado: U/D/L/R/F/B (Shift = inverso).
  // En modo libre giran libremente; en paso a paso solo avanza el giro que toca.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

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
    <div className="app">
      <header className="app__header">
        <Heading level={1} size={5} weight="bold">
          Rubrik
        </Heading>
        <Paragraph size="small">Cubo de Rubik 3D</Paragraph>
      </header>

      <main className="app__main">
        <section className="viewport">
          <Scene controller={controller} />
        </section>
        <Controls controller={controller} />
      </main>
    </div>
  )
}

export default App
