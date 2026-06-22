import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { List } from '@studiolxd/brand/list'
import { Despiece } from './Despiece'

/**
 * Sección "Saber más": el origen y la historia del cubo de Rubik.
 * Texto basado en el dosier "Origen del cubo y curiosidades".
 */
export function SaberMas() {
  return (
    <article className="saber">
      <header className="saber__intro">
        <Heading level={2} size={7} weight="bold">
          Origen del cubo de Rubik
        </Heading>
        <Paragraph size="large">
          De una herramienta de aula a uno de los rompecabezas más famosos del mundo.
        </Paragraph>
      </header>

      <section className="saber__block">
        <Heading level={3} size={5} weight="bold">
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

      <section className="saber__block">
        <Heading level={3} size={5} weight="bold">
          ¿Por qué se convirtió en uno de los rompecabezas más famosos del mundo?
        </Heading>
        <Paragraph>
          Es la <strong>mezcla perfecta de simplicidad y abismo mental</strong>: parece un juguete
          simple hasta que haces el primer giro. En realidad, el cubo “esconde” un universo de
          combinaciones.
        </Paragraph>
        <div className="saber__stat">
          <span className="saber__stat-num">43.252.003.274.489.856.000</span>
          <span className="saber__stat-label">
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

      <section className="saber__block">
        <Heading level={3} size={5} weight="bold">
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

      <section className="saber__block">
        <Heading level={3} size={5} weight="bold">
          Cómo es por dentro: el mecanismo
        </Heading>
        <Paragraph>
          Lo que hace mágico al cubo no se ve: un <strong>mecanismo interior</strong> articula sus
          piezas para que las capas giren sin que nada se desmonte. Avanza paso a paso: el cubo se
          abre, aparece el <strong>núcleo</strong> y, al final, se despieza una de sus piezas en{' '}
          <strong>pegatina, tapa, tornillo y muelle</strong>.
        </Paragraph>
        <Despiece />
      </section>

      <section className="saber__block">
        <Heading level={3} size={5} weight="bold">
          Curiosidades y datos sorprendentes
        </Heading>
        <List type="unordered" className="saber__facts">
          <li>
            Su creador tardó <strong>semanas en resolverlo por primera vez</strong>: diseñarlo fue
            una cosa; entender cómo volver al orden, otra muy distinta.
          </li>
          <li>
            Hay un límite matemático famoso: se demostró que cualquier estado “legal” del cubo puede
            resolverse en <strong>20 movimientos o menos</strong> (lo que a menudo se llama el
            “número de Dios” del 3×3).
          </li>
          <li>
            La clave de su éxito educativo es que entrena habilidades muy concretas:{' '}
            <strong>visualización espacial, memoria, lógica y perseverancia</strong>, por eso sigue
            usándose como recurso en contextos de aprendizaje.
          </li>
        </List>
      </section>
    </article>
  )
}
