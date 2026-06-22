import { Tabs, TabsList, TabsTrigger, TabsContent } from '@studiolxd/brand/tabs'
import { Button } from '@studiolxd/brand/button'
import { Tag } from '@studiolxd/brand/tag'
import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import type { CubeController, Mode } from './three/cube/useCube'
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
      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList variant="pill">
          <TabsTrigger value="free" disabled={busy && mode !== 'free'}>
            Libre
          </TabsTrigger>
          <TabsTrigger value="step" disabled={busy && mode !== 'step'}>
            Paso a paso
          </TabsTrigger>
        </TabsList>

        {solved && (
          <div className="panel__badge">
            <Tag variant="success">✓ Resuelto</Tag>
          </div>
        )}

        <TabsContent value="free" className="panel__section">
          <Heading level={2} size={3} weight="semibold">
            Giros
          </Heading>
          <Paragraph size="small">
            Teclas U D L R F B · con Shift, giro inverso.
          </Paragraph>
          <div className="moves">
            {FACE_BUTTONS.map(({ face, label }) => (
              <div className="moves__row" key={face}>
                <span className="moves__label">{label}</span>
                <Button variant="outline" size="sm" onClick={() => doMove(face, false)}>
                  {moveToString({ face, power: 1 })}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => doMove(face, true)}>
                  {moveToString({ face, power: 3 })}
                </Button>
              </div>
            ))}
          </div>
          <Button variant="primary" block onClick={doScramble} disabled={busy}>
            Mezclar
          </Button>
        </TabsContent>

        <TabsContent value="step" className="panel__section">
          <Heading level={2} size={3} weight="semibold">
            Resolución guiada
          </Heading>
          {solving ? (
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
              <Paragraph size="small">
                Pulsa la tecla indicada para hacer el giro. La interfaz avanza sola.
              </Paragraph>
            </>
          )}
        </TabsContent>
      </Tabs>
    </aside>
  )
}
