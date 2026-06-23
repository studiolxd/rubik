import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { Disassembly } from './Disassembly'

/**
 * Sección "¿Cómo es por dentro?": el mecanismo interno del cubo, con el despiece
 * 3D interactivo. Antes formaba parte de la sección Historia.
 */
export function Inside() {
  return (
    <article className="article">
      <header className="article__intro">
        <Heading level={2} size={7} weight="bold">
          ¿Cómo es por dentro?
        </Heading>
        <Paragraph size="large">
          Abrimos el cubo para ver qué hace girar las capas sin que se desmonte.
        </Paragraph>
      </header>

      <section className="article__block">
        <Paragraph>
          Lo que hace mágico al cubo no se ve: un <strong>mecanismo interior</strong> articula sus
          piezas para que las capas giren sin que nada se desmonte. Avanza paso a paso: el cubo se
          abre, aparece el <strong>núcleo</strong> y, al final, se despieza una de sus piezas en{' '}
          <strong>pegatina, tapa, tornillo y muelle</strong>.
        </Paragraph>
        <Disassembly />
      </section>
    </article>
  )
}
