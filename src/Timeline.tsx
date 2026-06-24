import { useState, type ReactNode } from 'react'

interface Milestone {
  date: string
  text: ReactNode
}

/** Hitos del cubo, en orden cronológico. */
const MILESTONES: Milestone[] = [
  { date: '1974', text: 'Ernő Rubik construye el primer prototipo.' },
  { date: '1975', text: 'Registra la patente en Hungría.' },
  { date: '1977', text: 'Se comercializa como Cubo Mágico.' },
  { date: '1980', text: 'Llega al mercado internacional como Rubik’s® Cube.' },
  { date: '1982', text: 'Se celebra el primer Campeonato Mundial de Cubo de Rubik.' },
  {
    date: '2026',
    text: (
      <>
        El <em>speedcuber</em> polaco Teodor Zajder rompe la barrera de los 3 segundos y establece
        el récord mundial del Cubo de Rubik 3×3.
      </>
    ),
  },
  { date: 'En la actualidad', text: 'Más de 500 millones de cubos vendidos en todo el mundo.' },
]

/**
 * Línea de tiempo de los hitos del cubo. Cada hito muestra siempre su fecha y un
 * círculo; al pulsarlo se despliega su texto (y se cierra cualquier otro abierto,
 * para ahorrar espacio) y el círculo pasa a relleno. En ≥1280px se dibuja en
 * horizontal con las cajas arriba/abajo alternándose; por debajo, en vertical con
 * las cajas a izquierda/derecha.
 */
export function Timeline() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <ol className="timeline">
      {MILESTONES.map((m, i) => {
        const isOpen = open === i
        return (
          <li key={m.date} className={`timeline__item${isOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="timeline__marker"
              aria-expanded={isOpen}
              aria-controls={`tl-panel-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span className="timeline__dot" aria-hidden="true" />
              <span className="timeline__date">{m.date}</span>
            </button>
            <div id={`tl-panel-${i}`} className="timeline__panel surface-dark">
              <p className="timeline__text">{m.text}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
