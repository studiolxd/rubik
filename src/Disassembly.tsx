import { useRef, useState } from 'react'
import { Icon } from '@studiolxd/brand/icon'
import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { Select } from '@studiolxd/brand/select'
import { DisassemblyScene, type HighlightId } from './three/DisassemblyScene'
import { ViewControls, type ViewControlsHandle } from './ViewControls'

/**
 * Guion de pasos del despiece. El índice coincide con el `stage` de la escena.
 * `title` es el nombre del paso (eyebrow del panel). En el despiece, `highlight`
 * ilumina una parte.
 */
const STAGES: { title: string; desc: string; highlight?: HighlightId }[] = [
  {
    title: 'El cubo montado',
    desc: 'A simple vista parece un bloque macizo, pero son 26 piezas sueltas que se sostienen entre sí por pura geometría: nada está pegado ni soldado. Gíralo con el dedo para verlo por todas sus caras y usa las flechas para abrirlo y descubrir qué esconde dentro.',
  },
  {
    title: 'El mecanismo interior',
    desc: 'Retiramos esquinas y aristas y apartamos los seis centros. En el corazón aparece el secreto: un núcleo de tres ejes cruzados. Cada centro se atornilla a él y puede girar 360°, y son esos seis giros los que arrastran al resto de piezas. Por eso las capas rotan sin que el cubo se deshaga.',
  },
  {
    title: 'El muelle',
    desc: 'Ahora desarmamos un centro de dentro hacia fuera. Lo primero en salir es el muelle: pequeño pero decisivo. Mantiene la tensión justa y deja que las piezas se aparten una pizca al girar para esquivarse, volviendo enseguida a su sitio. Sin él, el cubo se agarrotaría o se desencajaría.',
    highlight: 'spring',
  },
  {
    title: 'El tornillo',
    desc: 'Bajo el muelle está el tornillo, que ancla el centro al núcleo y gradúa la dureza del giro. Más apretado y el cubo se vuelve firme y preciso; más flojo y gira suave y veloz. Encontrar esa tensión a tu gusto es el primer ajuste de todo cubero.',
    highlight: 'screw',
  },
  {
    title: 'La tapa',
    desc: 'La tapa es la carcasa de plástico: el cuerpo visible de cada pieza, lo que le da forma y encaja con sus piezas vecinas para formar las paredes lisas del cubo.',
    highlight: 'cap',
  },
  {
    title: 'La pegatina',
    desc: 'Y por fuera, la pegatina: el adhesivo de color que viste el cubo y te dice de un vistazo si está resuelto. En algunos cubos son piezas de plástico incrustadas.',
    highlight: 'sticker',
  },
]

/**
 * "El cubo por dentro": despiece 3D guiado, con el mismo patrón que "Partes y
 * movimientos" —cubo + panel (hoja inferior en móvil, aside en escritorio),
 * selector de pasos y flechas—. En el tramo final cada parte se ilumina.
 */
export function Disassembly() {
  const [stage, setStage] = useState(0)
  const last = STAGES.length - 1
  const current = STAGES[stage]
  const controlsRef = useRef<ViewControlsHandle | null>(null)

  // Selector de pasos. Se pinta en dos sitios y se muestra uno u otro por CSS:
  // arriba sobre el cubo (<1280) o al inicio del aside (≥1280). El componente
  // no reenvía className, así que va envuelto en un div.
  const stepOptions = STAGES.map((s, i) => ({ value: String(i), label: `${i + 1}. ${s.title}` }))
  const renderStepSelect = (className: string) => (
    <div className={className}>
      <Select
        options={stepOptions}
        value={String(stage)}
        onValueChange={(v: string) => setStage(Number(v))}
        aria-label="Ir a un paso"
      />
    </div>
  )

  return (
    <div className="disassembly">
      {renderStepSelect('disassembly__select disassembly__select--top')}

      <div className="disassembly__main">
        <section className="disassembly__stage">
          <DisassemblyScene
            stage={stage}
            highlight={current.highlight ?? null}
            controlsRef={controlsRef}
          />
          {/* Solo giro de vista: ayuda, zoom y restaurar. */}
          <ViewControls controlsRef={controlsRef} mode="view" />
        </section>

        {/* Navegación por pasos: debajo del cubo y a la derecha por debajo de
          1080px; superpuestos al cubo, uno a cada lado, a partir de 1080px. */}
        <div className="disassembly__arrows">
          <button
            type="button"
            className="disassembly__chevron"
            onClick={() => setStage((s) => Math.max(0, s - 1))}
            disabled={stage === 0}
            aria-label="Paso anterior"
          >
            <Icon name="chevron" size="lg" className="disassembly__chevron-icon--prev" />
          </button>
          <button
            type="button"
            className="disassembly__chevron"
            onClick={() => setStage((s) => Math.min(last, s + 1))}
            disabled={stage === last}
            aria-label="Paso siguiente"
          >
            <Icon name="chevron" size="lg" />
          </button>
        </div>
      </div>

      <aside className="disassembly__panel">
        {renderStepSelect('disassembly__select disassembly__select--aside')}

        <div className="disassembly__content">
          <span className="disassembly__step">{current.title}</span>
          <Heading level={1}>El cubo por dentro</Heading>
          <Paragraph>{current.desc}</Paragraph>
        </div>
      </aside>
    </div>
  )
}
