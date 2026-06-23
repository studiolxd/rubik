import { useState } from 'react'
import { Icon } from '@studiolxd/brand/icon'
import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { DisassemblyScene, type HighlightId } from './three/DisassemblyScene'

/**
 * Guion de pasos del despiece. El índice coincide con el `stage` de la escena.
 * En los pasos del despiece, `highlight` indica qué parte se ilumina.
 */
const STAGES: { title: string; desc: string; highlight?: HighlightId }[] = [
  {
    title: 'El cubo montado',
    desc: '26 piezas encajadas que parecen un bloque sólido. Gíralo con el dedo y pulsa Siguiente para abrirlo por dentro.',
  },
  {
    title: 'Por dentro: el mecanismo',
    desc: 'Quitamos las piezas externas y separamos los centros. Dentro hay un núcleo de 3 brazos: cada centro va anclado a él con un tornillo y un muelle, y gira 360°. Eso articula todo el cubo.',
  },
  {
    title: 'El muelle',
    desc: 'Despiezamos un centro de dentro hacia fuera. Lo primero, el muelle: da elasticidad y permite que las piezas se separen un poco al girar y vuelvan a su sitio sin atascarse.',
    highlight: 'spring',
  },
  {
    title: 'El tornillo',
    desc: 'Sujeta el centro al núcleo y regula la tensión: más apretado gira más duro; más suelto, más fluido.',
    highlight: 'screw',
  },
  {
    title: 'La tapa',
    desc: 'La carcasa de plástico que ves desde fuera. Es el cuerpo de la pieza y sobre ella se pega la pegatina.',
    highlight: 'cap',
  },
  {
    title: 'La pegatina de color',
    desc: 'Y por fuera, la pegatina: el adhesivo de color que da su aspecto al cubo. En los modelos de gama alta se sustituye por plástico de color.',
    highlight: 'sticker',
  },
]

/**
 * "Cómo es por dentro un cubo de Rubik": despiece 3D guiado. Se avanza por
 * pasos con las flechas; en el tramo final cada parte se ilumina con su
 * explicación. Pensado para incrustarse dentro de la sección "Saber más".
 */
export function Disassembly() {
  const [stage, setStage] = useState(0)
  const last = STAGES.length - 1
  const current = STAGES[stage]

  return (
    <div className="disassembly">
      <div className="disassembly__stage">
        <DisassemblyScene stage={stage} highlight={current.highlight ?? null} />
      </div>

      {/* Navegación por pasos: en móvil va alineada a la derecha sobre el "Paso";
          a partir de 1280px se superpone al lienzo, una flecha a cada lado. */}
      <div className="disassembly__nav">
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

      <div className="disassembly__panel">
        <div className="disassembly__caption">
          <span className="disassembly__step">
            Paso {stage + 1} / {STAGES.length}
          </span>
          <Heading level={4} size={3} weight="bold">
            {current.title}
          </Heading>
          <Paragraph size="small">{current.desc}</Paragraph>
        </div>
      </div>
    </div>
  )
}
