import type { CubeController } from './three/cube/useCube'
import { moveToString, type Face, type Move } from './three/cube/engine'

const FACE_BUTTONS: { face: Face; label: string }[] = [
  { face: 'U', label: 'Arriba' },
  { face: 'D', label: 'Abajo' },
  { face: 'L', label: 'Izquierda' },
  { face: 'R', label: 'Derecha' },
  { face: 'F', label: 'Frente' },
  { face: 'B', label: 'Atrás' },
]

/** Tecla(s) a pulsar para un movimiento: cara, o Shift+cara si es inverso. */
function KeyHint({ move }: { move: Move }) {
  return (
    <span className="keyhint">
      {move.power === 3 && (
        <>
          <kbd>Shift</kbd>
          <span className="keyhint__plus">+</span>
        </>
      )}
      <kbd className="kbd--big">{move.face}</kbd>
    </span>
  )
}

export function Controls({ controller }: { controller: CubeController }) {
  const {
    mode,
    setMode,
    solved,
    busy,
    solving,
    doMove,
    doScramble,
    solutionLength,
    stepIndex,
    nextMove,
  } = controller

  return (
    <aside className="panel">
      <div className="panel__modes">
        <button
          className={`tab ${mode === 'free' ? 'tab--active' : ''}`}
          onClick={() => setMode('free')}
          disabled={busy && mode !== 'free'}
        >
          Libre
        </button>
        <button
          className={`tab ${mode === 'step' ? 'tab--active' : ''}`}
          onClick={() => setMode('step')}
          disabled={busy && mode !== 'step'}
        >
          Paso a paso
        </button>
      </div>

      {solved && <div className="badge badge--solved">✓ Resuelto</div>}

      {mode === 'free' ? (
        <section className="panel__section">
          <h2 className="panel__heading">Giros</h2>
          <p className="panel__hint">
            Teclas <kbd>U</kbd> <kbd>D</kbd> <kbd>L</kbd> <kbd>R</kbd> <kbd>F</kbd> <kbd>B</kbd> ·
            con <kbd>Shift</kbd> giro inverso.
          </p>
          <div className="moves">
            {FACE_BUTTONS.map(({ face, label }) => (
              <div className="moves__row" key={face}>
                <span className="moves__label">{label}</span>
                <button className="move-btn" onClick={() => doMove(face, false)}>
                  {moveToString({ face, power: 1 })}
                </button>
                <button className="move-btn move-btn--prime" onClick={() => doMove(face, true)}>
                  {moveToString({ face, power: 3 })}
                </button>
              </div>
            ))}
          </div>
          <button className="action" onClick={doScramble} disabled={busy}>
            Mezclar
          </button>
        </section>
      ) : (
        <section className="panel__section">
          <h2 className="panel__heading">Resolución guiada</h2>
          {solving ? (
            <p className="panel__hint">Calculando solución…</p>
          ) : solutionLength === 0 ? (
            <p className="panel__hint">El cubo ya está resuelto.</p>
          ) : (
            <>
              <p className="step-progress">
                Paso <strong>{stepIndex}</strong> de <strong>{solutionLength}</strong>
              </p>
              {nextMove ? (
                <div className="step-key">
                  <span className="step-key__caption">Pulsa</span>
                  <KeyHint move={nextMove} />
                  <span className="step-key__move">
                    movimiento <strong>{moveToString(nextMove)}</strong>
                  </span>
                </div>
              ) : (
                <div className="step-key step-key--done">¡Resuelto! 🎉</div>
              )}
              <p className="panel__hint">
                Pulsa la tecla indicada para hacer el giro. La interfaz avanza sola al
                siguiente paso.
              </p>
            </>
          )}
        </section>
      )}
    </aside>
  )
}
