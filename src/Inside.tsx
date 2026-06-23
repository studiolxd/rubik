import { Heading } from '@studiolxd/brand/heading'
import { Disassembly } from './Disassembly'

/**
 * Sección "¿Cómo es por dentro?": el mecanismo interno del cubo, con el despiece
 * 3D interactivo. Antes formaba parte de la sección Historia.
 */
export function Inside() {
  return (
    <article className="article article--narrow">
      <header className="article__intro">
        <Heading level={2} size={7} weight="bold">
          ¿Cómo es por dentro?
        </Heading>
      </header>

      <section className="article__block">
        <Disassembly />
      </section>
    </article>
  )
}
