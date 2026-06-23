import { useEffect, useState } from 'react'
import { Heading } from '@studiolxd/brand/heading'
import { List } from '@studiolxd/brand/list'
import { Card } from '@studiolxd/brand/card'

/**
 * Curiosidades del cubo. En la portada se muestra una al azar (tarjeta Card que
 * lleva a la página de Curiosidades); la página las lista todas.
 * Texto plano: el `description` del Card de marca es una cadena.
 */
const TRIVIA: string[] = [
  'Su creador tardó semanas en resolverlo por primera vez: diseñarlo fue una cosa; entender cómo volver al orden, otra muy distinta.',
  'Hay un límite matemático famoso: se demostró que cualquier estado “legal” del cubo puede resolverse en 20 movimientos o menos (lo que a menudo se llama el “número de Dios” del 3×3).',
  'La clave de su éxito educativo es que entrena habilidades muy concretas: visualización espacial, memoria, lógica y perseverancia; por eso sigue usándose como recurso en contextos de aprendizaje.',
]

/** Clave de localStorage con el índice de la última curiosidad mostrada. */
const STORAGE_KEY = 'rubik:last-trivia'

/** Elige una curiosidad al azar distinta de la última (leída de localStorage). */
function pickIndex(): number {
  let last = -1
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw !== null) last = Number(raw)
  } catch {
    // localStorage no disponible (modo privado, etc.): se ignora.
  }
  const options = TRIVIA.map((_, i) => i).filter((i) => i !== last)
  return options[Math.floor(Math.random() * options.length)] ?? 0
}

/**
 * Tarjeta de curiosidad de la portada: Card de marca (outline) con una curiosidad
 * al azar (distinta de la última). Al pulsarla abre la página de Curiosidades.
 */
export function TriviaCard({ onOpen }: { onOpen: () => void }) {
  // La elección se hace una sola vez por montaje (cada visita a la portada).
  const [index] = useState(pickIndex)

  // Guarda la mostrada para que la próxima visita saque otra distinta.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(index))
    } catch {
      // Sin localStorage: simplemente no se recuerda.
    }
  }, [index])

  // El Card de marca es un <a href>; la app navega por estado, así que
  // interceptamos el click (evitando el salto del href "#") y abrimos la página.
  return (
    <div
      className="menu__curio"
      onClick={(e) => {
        e.preventDefault()
        onOpen()
      }}
    >
      <Card
        color="outline"
        href="#"
        title="¿Sabías que…?"
        description={TRIVIA[index]}
        ctaLabel="Ver todas las curiosidades"
      />
    </div>
  )
}

/** Página "Curiosidades": lista todas las curiosidades del cubo. */
export function TriviaPage() {
  return (
    <article className="article">
      <header className="article__intro">
        <Heading level={2} size={7}>
          Curiosidades
        </Heading>
      </header>

      <section className="article__block">
        <List type="unordered" className="trivia__list">
          {TRIVIA.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </List>
      </section>
    </article>
  )
}
