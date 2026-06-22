import { useState } from 'react'
import { Button } from '@studiolxd/brand/button'
import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { DespieceScene, type PartId } from './three/DespieceScene'

/** Guion de pasos del despiece. El índice coincide con el `stage` de la escena. */
const STAGES: { title: string; desc: string }[] = [
  {
    title: 'El cubo montado',
    desc: '26 piezas encajadas que parecen un bloque sólido. Gíralo con el dedo y pulsa Siguiente para abrirlo por dentro.',
  },
  {
    title: 'Por dentro: el mecanismo',
    desc: 'Quitamos las piezas externas. Dentro hay un núcleo de 3 brazos: los centros van anclados a él y giran 360°. Eso articula todo el cubo.',
  },
  {
    title: 'De qué se compone una pieza',
    desc: 'Despiezamos un centro: pegatina, tapa, tornillo y muelle. El muelle da la tensión y el tornillo lo fija al núcleo. Toca cada parte.',
  },
]

/** Ficha de cada pieza, para el panel al pulsar sobre ella. */
const PARTS: Record<PartId, { name: string; meta?: string; desc: string }> = {
  centro: {
    name: 'Pieza central',
    meta: '1 color · hay 6',
    desc: 'Define el color de cada cara. No se desplaza: gira sobre un tornillo con muelle anclado al núcleo.',
  },
  arista: {
    name: 'Pieza de borde (arista)',
    meta: '2 colores · hay 12',
    desc: 'Conecta dos caras. Se desliza entre las esquinas y los centros cuando giras una capa.',
  },
  esquina: {
    name: 'Pieza de esquina',
    meta: '3 colores · hay 8',
    desc: 'Toca tres caras a la vez. Son las piezas que más se mueven al resolver el cubo.',
  },
  nucleo: {
    name: 'Núcleo',
    meta: 'mecanismo interior',
    desc: 'El eje de 3 brazos que mantiene todo unido. Es el corazón sobre el que giran las seis capas.',
  },
  tornillo: {
    name: 'Tornillo',
    meta: 'uno por centro',
    desc: 'Sujeta cada centro al núcleo y regula la tensión: más apretado gira más duro, más suelto gira más fluido.',
  },
  muelle: {
    name: 'Muelle',
    meta: 'uno por centro',
    desc: 'Da elasticidad. Permite que las piezas se separen un poco al girar y vuelvan a su sitio sin atascarse.',
  },
  tapa: {
    name: 'Tapa',
    meta: 'el cuerpo de la pieza',
    desc: 'La carcasa de plástico que ves desde fuera. Sobre ella se pega la pegatina de color.',
  },
  pegatina: {
    name: 'Pegatina de color',
    meta: 'una por cara visible',
    desc: 'El adhesivo de color que da su aspecto al cubo. En los modelos de gama alta se sustituye por plástico de color.',
  },
}

/**
 * "Cómo es por dentro un cubo de Rubik": despiece 3D interactivo.
 * Se avanza por pasos con las flechas y se puede tocar cada pieza para saber
 * qué es. Pensado para incrustarse dentro de la sección "Saber más".
 */
export function Despiece() {
  const [stage, setStage] = useState(0)
  const [selected, setSelected] = useState<PartId | null>(null)
  const info = selected ? PARTS[selected] : null
  const last = STAGES.length - 1

  return (
    <div className="despiece">
      <div className="despiece__stage">
        <DespieceScene stage={stage} selected={selected} onSelect={setSelected} />
      </div>

      <div className="despiece__panel">
        <div className="despiece__caption">
          <span className="despiece__step">
            Paso {stage + 1} / {STAGES.length}
          </span>
          <Heading level={4} size={3} weight="bold">
            {STAGES[stage].title}
          </Heading>
          <Paragraph size="small">{STAGES[stage].desc}</Paragraph>
        </div>

        <div className="despiece__nav">
          <Button
            variant="outline"
            onClick={() => setStage((s) => Math.max(0, s - 1))}
            disabled={stage === 0}
          >
            ← Anterior
          </Button>
          <Button
            variant="primary"
            onClick={() => setStage((s) => Math.min(last, s + 1))}
            disabled={stage === last}
          >
            Siguiente →
          </Button>
        </div>

        <div className="despiece__info" aria-live="polite">
          {info ? (
            <>
              <div className="despiece__info-head">
                <strong>{info.name}</strong>
                {info.meta && <span className="despiece__info-meta">{info.meta}</span>}
              </div>
              <p className="despiece__info-desc">{info.desc}</p>
            </>
          ) : (
            <span className="despiece__hint">Toca una pieza del cubo para saber qué es.</span>
          )}
        </div>
      </div>
    </div>
  )
}
