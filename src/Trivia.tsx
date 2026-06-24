import { useEffect, useState } from 'react'
import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { Card } from '@studiolxd/brand/card'
import { TRIVIA, pickIndex, rememberShown, triviaIndexFromHash } from './trivia-data'

/**
 * Tarjeta de curiosidad de la portada: Card de marca (outline) con una curiosidad
 * al azar (distinta de la última). Su enlace apunta a `#trivia-N`, así que abre esa
 * misma curiosidad en la página de Curiosidades (y el enlace es compartible).
 */
export function TriviaCard() {
  // La elección se hace una sola vez por montaje (cada visita a la portada).
  const [index] = useState(pickIndex)

  // Guarda la mostrada para que la próxima visita saque otra distinta.
  useEffect(() => {
    rememberShown(index)
  }, [index])

  // El Card de marca es un <a href>: el propio enlace cambia el hash a `#trivia-N`
  // y la app navega a esa curiosidad. El número es 1-based para que se lea natural.
  return (
    <div className="menu__curio">
      <Card
        color="outline"
        href={`#trivia-${index + 1}`}
        title="¿Sabías que…?"
        description={TRIVIA[index].title}
        ctaLabel="Saber más"
      />
    </div>
  )
}

/** Página "Curiosidades": muestra la curiosidad indicada en el hash (#trivia-N).
 *  App solo la monta con un índice válido, así que el `?? 0` es solo defensivo. */
export function TriviaPage() {
  // Sincronizada con el hash: editar la URL o usar atrás/adelante cambia la
  // curiosidad sin desmontar la página (la pantalla sigue siendo 'trivia').
  const [index, setIndex] = useState(() => triviaIndexFromHash() ?? 0)
  useEffect(() => {
    const onHash = () => {
      const i = triviaIndexFromHash()
      if (i !== null) setIndex(i)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const curio = TRIVIA[index]
  return (
    <article className="article">
      <header className="article__intro">
        <Heading level={1}>Curiosidades</Heading>
      </header>

      <section className="article__block">
        <Paragraph className="trivia__title">{curio.title}</Paragraph>
        <Paragraph>{curio.text}</Paragraph>
      </section>
    </article>
  )
}
