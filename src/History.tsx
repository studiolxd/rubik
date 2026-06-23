import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'

/**
 * Sección "Saber más": el origen y la historia del cubo de Rubik.
 * Texto basado en el dosier "Origen del cubo y curiosidades".
 */
export function History() {
  return (
    <article className="article article--narrow">
      <header className="article__intro">
        <Heading level={2} size={7}>
          Origen del cubo de Rubik
        </Heading>
        <Paragraph size="large">
          De una herramienta de aula a uno de los rompecabezas más famosos del mundo.
        </Paragraph>
      </header>

      <section className="article__block">
        <Heading level={3} size={5}>
          De aula de arquitectura a fenómeno mundial
        </Heading>
        <Paragraph>
          Todo empezó en Budapest, a mediados de los años 70, y no como un juguete pensado para
          venderse, sino como una <strong>herramienta para enseñar</strong>. Su creador fue Ernő
          Rubik, profesor de arquitectura y diseño, que buscaba un modo tangible de explicar a sus
          alumnos cómo se mueven los objetos en el espacio sin “desmontarse”. Así nació un prototipo
          de cubo 3×3 cuyas piezas podían girar manteniendo la estructura.
        </Paragraph>
        <Paragraph>
          La primera gran sorpresa fue para el propio Rubik: al mezclarlo por primera vez se dio
          cuenta de que había creado un rompecabezas, porque ya no sabía cómo devolverlo al orden
          inicial. Ese momento es clave en la historia del cubo:{' '}
          <strong>
            lo que era un modelo didáctico se convirtió en un desafío de lógica que atraparía a
            millones
          </strong>
          .
        </Paragraph>
        <Paragraph>
          Con los años, el invento dio el salto <strong>del aula al mundo</strong>. Primero se
          comercializó en Hungría como “Cubo Mágico”, y después llegó el impulso definitivo cuando
          se distribuyó internacionalmente y pasó a conocerse como <strong>Rubik’s Cube</strong>. A
          partir de ahí explotó la “rubikmanía”: competiciones, televisión, gente aprendiéndolo en
          casa, y el cubo convertido en símbolo de ingenio y paciencia.
        </Paragraph>
      </section>

      <section className="article__block">
        <Heading level={3} size={5}>
          ¿Por qué se convirtió en uno de los rompecabezas más famosos del mundo?
        </Heading>
        <Paragraph>
          Es la <strong>mezcla perfecta de simplicidad y abismo mental</strong>: parece un juguete
          simple hasta que haces el primer giro. En realidad, el cubo “esconde” un universo de
          combinaciones.
        </Paragraph>
        <div className="article__stat">
          <span className="article__stat-num">43.252.003.274.489.856.000</span>
          <span className="article__stat-label">
            configuraciones posibles del 3×3 (más de 43 quintillones)
          </span>
        </div>
        <Paragraph>
          Esa cifra hace que cada intento se sienta como un reto real. No es solo “probar”, es{' '}
          <strong>pensar, planificar y aprender patrones</strong>. Además, con el tiempo se
          convirtió en un <strong>objeto cultural</strong>: aparece en medios, en educación y en
          comunidades enteras que comparten métodos y mejores tiempos.
        </Paragraph>
      </section>

      <section className="article__block">
        <Heading level={3} size={5}>
          El cubo hoy: un clásico que no envejece
        </Heading>
        <Paragraph>
          El cubo no “se pasó de moda” sino que se{' '}
          <strong>transformó en deporte mental con el auge del speedcubing</strong> (modalidad
          centrada en resolver el cubo lo más rápido posible) y los tutoriales online. Quienes lo
          practican se llaman <em>speedcubers</em>, y no solo “corren con las manos”: entrenan
          reconocimiento de patrones, planificación, eficiencia de movimientos y memoria muscular.
        </Paragraph>
        <Paragraph>
          Lo importante es que el speedcubing se convirtió en <strong>competición oficial</strong>.
          Existe un organismo internacional, la World Cube Association (WCA), que regula las
          competiciones, publica resultados y gestiona récords en diferentes categorías (no solo
          3×3, también otros “twisty puzzles”). Hoy el cubo no es solo cultura pop, también es{' '}
          <strong>comunidad global organizada, con eventos y rankings</strong>.
        </Paragraph>
      </section>

      <section className="article__block">
        <Heading level={3} size={5}>
          ¿Qué es el algoritmo de Kociemba?
        </Heading>
        <Paragraph>
          El <strong>algoritmo de Kociemba</strong> (o «algoritmo de dos fases») es un método que
          encuentra una solución muy corta para cualquier estado del cubo: normalmente{' '}
          <strong>20 movimientos o menos</strong>.
        </Paragraph>
        <Paragraph>
          Lo ideó Herbert Kociemba en 1992. Resuelve el cubo en dos fases: primero lleva el cubo a
          un subconjunto especial de estados usando solo ciertos giros, y después lo termina dentro
          de ese subconjunto. Apoyándose en grandes tablas precalculadas, explora millones de
          combinaciones en un instante para dar con una solución casi óptima.
        </Paragraph>
        <Paragraph>
          Es rapidísimo y eficiente, pero sus soluciones <strong>no son humanas</strong>: mezclan
          todas las caras a la vez y no siguen pasos reconocibles. Por eso, para aprender, usamos el
          método <strong>por capas</strong> («Resolver paso a paso»): hace más movimientos, pero
          cada uno tiene una explicación.
        </Paragraph>
      </section>
    </article>
  )
}
