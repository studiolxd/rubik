import { useEffect, useRef, useState } from 'react'
import { Button } from '@studiolxd/brand/button'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { Tag } from '@studiolxd/brand/tag'
import { Modal } from '@studiolxd/brand/modal'
import { Kbd } from '@studiolxd/brand/kbd'
import type { CubeController } from './three/cube/useCube'
import { moveToString, type Face, type Move } from './three/cube/engine'

const FACE_LABEL: Record<Face, string> = {
  U: 'Arriba',
  D: 'Abajo',
  L: 'Izquierda',
  R: 'Derecha',
  F: 'Frente',
  B: 'Atrás',
}

/** Tecla(s) a pulsar para un movimiento: cara, o Shift+cara si es inverso. */
export function KeyHint({ move }: { move: Move }) {
  return (
    <span className="keyhint">
      {move.power === 3 && (
        <>
          <Kbd size="sm">Shift</Kbd>
          <span className="keyhint__plus">+</span>
        </>
      )}
      <Kbd size="lg">{move.face}</Kbd>
    </span>
  )
}

/** Controles del modo libre: girar con teclado + mezclar / resolver. */
export function FreeControls({ controller }: { controller: CubeController }) {
  const { reset, doSolve, doSolveKociemba, busy, solved } = controller
  const [kociembaInfo, setKociembaInfo] = useState(false)
  return (
    <section className="panel__section">
      <Button variant="primary" block onClick={reset} disabled={busy}>
        Reiniciar
      </Button>
      <Button variant="outline" block onClick={doSolve} disabled={busy || solved}>
        Resolver paso a paso
      </Button>
      <Button variant="outline" block onClick={doSolveKociemba} disabled={busy || solved}>
        Resolver (Kociemba)
      </Button>
      <Button variant="text" onClick={() => setKociembaInfo(true)}>
        ¿Qué es el algoritmo de Kociemba?
      </Button>

      <Modal
        open={kociembaInfo}
        onClose={() => setKociembaInfo(false)}
        title="El algoritmo de Kociemba"
      >
        <div className="prose">
          <Paragraph>
            El <strong>algoritmo de Kociemba</strong> (o «algoritmo de dos fases») es un método que
            encuentra una solución muy corta para cualquier estado del cubo: normalmente{' '}
            <strong>20 movimientos o menos</strong>.
          </Paragraph>
          <Paragraph>
            Lo ideó Herbert Kociemba en 1992. Resuelve el cubo en dos fases: primero lleva el cubo a
            un subconjunto especial de estados usando solo ciertos giros, y después lo termina
            dentro de ese subconjunto. Apoyándose en grandes tablas precalculadas, explora millones
            de combinaciones en un instante para dar con una solución casi óptima.
          </Paragraph>
          <Paragraph>
            Es rapidísimo y eficiente, pero sus soluciones <strong>no son humanas</strong>: mezclan
            todas las caras a la vez y no siguen pasos reconocibles. Por eso, para aprender, usamos
            el método <strong>por capas</strong> («Resolver paso a paso»): hace más movimientos,
            pero cada uno tiene una explicación.
          </Paragraph>
        </div>
      </Modal>
    </section>
  )
}

/** Controles del modo guiado: indica qué tecla pulsar en cada paso. */
export function StepControls({ controller }: { controller: CubeController }) {
  const { mode, solving, solutionLength, stepIndex, nextMove } = controller
  // Mientras se fija el modo y se calcula la solución, mostramos "calculando".
  const preparing = mode !== 'step' || solving

  return (
    <section className="panel__section">
      {preparing ? (
        <Paragraph size="small">Calculando solución…</Paragraph>
      ) : solutionLength === 0 ? (
        <Paragraph size="small">El cubo ya está resuelto.</Paragraph>
      ) : (
        <>
          <Paragraph size="small">
            Paso {stepIndex} de {solutionLength}
          </Paragraph>
          {nextMove ? (
            <div className="step-key">
              <span className="step-key__caption">Pulsa</span>
              <KeyHint move={nextMove} />
              <Paragraph size="small">movimiento {moveToString(nextMove)}</Paragraph>
            </div>
          ) : (
            <div className="step-key step-key--done">¡Resuelto! 🎉</div>
          )}
        </>
      )}
    </section>
  )
}

/** Sentido legible de un giro (la solución solo usa potencias 1 y 3). */
function turnSense(move: Move): string {
  return move.power === 3 ? 'antihorario (con Shift)' : 'horario'
}

/**
 * Controles del modo práctica: giras libremente y compruebas tus giros contra
 * la solución óptima. El botón "Pista" revela primero la cara y luego el sentido.
 */
export function PracticeControls({ controller }: { controller: CubeController }) {
  const { mode, solving, solved, nextMove, hintLevel, revealHint, practiceFeedback } = controller
  const preparing = mode !== 'practice' || solving

  // Mensaje efímero de OK / error, re-disparado en cada intento (clave `n`).
  const [flash, setFlash] = useState<{ kind: 'correct' | 'wrong'; n: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!practiceFeedback) return
    setFlash(practiceFeedback)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setFlash(null), 1600)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [practiceFeedback])

  return (
    <section className="panel__section">
      {preparing ? (
        <Paragraph size="small">Calculando solución…</Paragraph>
      ) : solved ? (
        <div className="step-key step-key--done">¡Resuelto! 🎉</div>
      ) : (
        <>
          {flash && (
            <div className="panel__badge">
              <Tag variant={flash.kind === 'correct' ? 'success' : 'danger'}>
                {flash.kind === 'correct' ? '✓ ¡Bien!' : '✗ No es correcto'}
              </Tag>
            </div>
          )}

          <Button
            variant="primary"
            block
            onClick={revealHint}
            disabled={hintLevel >= 2 || !nextMove}
          >
            {hintLevel === 0 ? '¿Qué cara giro?' : '¿En qué sentido la giro?'}
          </Button>

          {hintLevel >= 1 && nextMove && (
            <Paragraph size="small">
              Gira la cara <strong>{FACE_LABEL[nextMove.face]}</strong> ({nextMove.face})
              {hintLevel >= 2 && (
                <>
                  {' '}
                  en sentido <strong>{turnSense(nextMove)}</strong>
                </>
              )}
              .
            </Paragraph>
          )}
        </>
      )}
    </section>
  )
}

/** Formatea milisegundos como mm:ss.cs. */
function formatTime(ms: number): string {
  const totalCs = Math.floor(ms / 10)
  const cs = totalCs % 100
  const totalS = Math.floor(totalCs / 100)
  const s = totalS % 60
  const m = Math.floor(totalS / 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(m)}:${pad(s)}.${pad(cs)}`
}

/**
 * Controles del modo cronometrado: el crono arranca al pulsar "Comenzar"
 * (que además revela los colores del cubo) y se detiene al resolver.
 * (Guardar usuario/tiempo y ranking: pendiente.)
 */
export function TimedControls({
  controller,
  started,
  onStart,
  onRestart,
}: {
  controller: CubeController
  /** ¿Se ha pulsado ya "Comenzar"? Mientras es false, el crono está parado. */
  started: boolean
  /** Revela el cubo y arranca el cronómetro. */
  onStart: () => void
  /** Reinicia la partida (mezcla nueva + ocultar el cubo de nuevo). */
  onRestart: () => void
}) {
  const { solved, busy } = controller
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number | null>(null)
  const running = started && !solved

  // El reloj arranca al comenzar y se pone a cero al reiniciar (started → false).
  useEffect(() => {
    if (started) {
      startRef.current = performance.now()
    } else {
      startRef.current = null
      setElapsed(0)
    }
  }, [started])

  // Mientras corre, refresca el display cada frame.
  useEffect(() => {
    if (!running) return
    let raf = 0
    const tick = () => {
      if (startRef.current !== null) setElapsed(performance.now() - startRef.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])

  // Al resolver, congela el tiempo final exacto.
  useEffect(() => {
    if (solved && startRef.current !== null) setElapsed(performance.now() - startRef.current)
  }, [solved])

  return (
    <section className="panel__section">
      <div className="timer" data-state={solved ? 'done' : running ? 'running' : 'idle'}>
        <span className="timer__value">{formatTime(elapsed)}</span>
      </div>

      {solved && (
        <div className="panel__badge">
          <Tag variant="success">✓ Resuelto en {formatTime(elapsed)}</Tag>
        </div>
      )}

      {!started && !solved && (
        <Button variant="primary" block onClick={onStart}>
          Comenzar
        </Button>
      )}
      {started && (
        <Button variant="outline" block onClick={onRestart} disabled={busy}>
          {solved ? 'Nueva partida' : 'Reiniciar'}
        </Button>
      )}
    </section>
  )
}
