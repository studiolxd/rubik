import { useEffect, useState } from 'react'
import { Heading } from '@studiolxd/brand/heading'
import { Steps } from '@studiolxd/brand/steps'
import { Card } from '@studiolxd/brand/card'

/**
 * Curiosidades del cubo. Cada una tiene un titular (`title`) y su explicación
 * (`text`). En la portada se muestra el titular de una al azar (tarjeta Card que
 * lleva a la página de Curiosidades); la página las lista todas, completas.
 */
const TRIVIA: { title: string; text: string }[] = [
  {
    title: 'Su creador tardó semanas en resolverlo por primera vez.',
    text: 'Diseñar el mecanismo fue relativamente sencillo para él; descubrir cómo devolver todas las piezas a su posición original resultó un desafío mucho mayor.',
  },
  {
    title: 'Cualquier cubo mezclado puede resolverse en 20 movimientos o menos.',
    text: 'En 2010 se demostró matemáticamente que cualquier posición posible del cubo 3×3 puede resolverse en un máximo de 20 movimientos. Este límite se conoce popularmente como el «Número de Dios».',
  },
  {
    title: 'Es mucho más que un juguete.',
    text: 'Resolver el cubo ayuda a desarrollar habilidades como la visualización espacial, el pensamiento lógico, la memoria de trabajo y la perseverancia, por lo que sigue utilizándose en entornos educativos de todo el mundo.',
  },
  {
    title: 'Fue inventado para enseñar geometría.',
    text: 'Su creador, Ernő Rubik, era profesor de arquitectura y buscaba una forma de explicar conceptos tridimensionales a sus estudiantes.',
  },
  {
    title: 'Originalmente no se llamaba Cubo de Rubik.',
    text: 'El primer nombre del rompecabezas fue «Cubo Mágico» (Magic Cube).',
  },
  {
    title: 'Existen más de 43 trillones de trillones de combinaciones.',
    text: 'Un cubo 3×3 puede adoptar exactamente 43.252.003.274.489.856.000 posiciones distintas.',
  },
  {
    title: 'Solo una combinación está resuelta.',
    text: 'Entre todas las configuraciones posibles, únicamente una tiene cada cara formada por un único color.',
  },
  {
    title: 'No todas las mezclas son posibles.',
    text: 'Si desmontas y vuelves a montar el cubo incorrectamente, puedes crear posiciones imposibles de alcanzar mediante movimientos normales.',
  },
  {
    title: 'Cada cubo se puede resolver sin desmontarlo.',
    text: 'Aunque parezca imposible cuando está muy mezclado, cualquier posición legal tiene solución.',
  },
  {
    title: 'Se han vendido cientos de millones de unidades.',
    text: 'Es uno de los rompecabezas más vendidos de la historia y uno de los juguetes más reconocibles del planeta.',
  },
  {
    title: 'Existe un deporte dedicado a resolver cubos.',
    text: 'El speedcubing reúne a competidores de todo el mundo para resolver distintos tipos de cubos en el menor tiempo posible.',
  },
  {
    title: 'Los mejores resolutores tardan menos de 4 segundos.',
    text: 'Lo que para la mayoría supone varios minutos, los campeones mundiales lo consiguen en apenas unos instantes.',
  },
  {
    title: 'El récord mundial de resolución del cubo 3×3 pertenece al polaco Teodor Zajder.',
    text: 'En 2026 consiguió convertirse en la primera persona en resolver un Cubo de Rubik oficial en menos de tres segundos, estableciendo una nueva marca histórica de 2,76 segundos.',
  },
  {
    title: 'La inspección está limitada.',
    text: 'En competición, los participantes solo disponen de 15 segundos para estudiar el cubo antes de empezar.',
  },
  {
    title: 'No es necesario memorizar cientos de algoritmos.',
    text: 'Con unos pocos algoritmos básicos ya es posible aprender a resolver un cubo 3×3 completo.',
  },
  {
    title: 'Los centros nunca cambian de posición.',
    text: 'En un cubo 3×3 los seis centros permanecen fijos entre sí y determinan el color de cada cara.',
  },
  {
    title: 'Las esquinas tienen tres colores y las aristas dos.',
    text: 'Esta característica es fundamental para entender cómo funciona el mecanismo interno.',
  },
  {
    title: 'El mecanismo interior fue una innovación de ingeniería.',
    text: 'Uno de los grandes retos del diseño fue permitir que las capas giraran sin que el cubo se desmontara.',
  },
  {
    title: 'Existen cubos de muchos tamaños.',
    text: 'Además del clásico 3×3, hay versiones 2×2, 4×4, 5×5 y modelos gigantes con decenas de capas.',
  },
  {
    title: 'También hay cubos con formas extrañas.',
    text: 'Algunos rompecabezas derivados se transforman en pirámides, dodecaedros o figuras aparentemente imposibles.',
  },
  {
    title: 'Los robots pueden resolverlo más rápido que los humanos.',
    text: 'Sistemas especializados han conseguido tiempos inferiores a una décima de segundo.',
  },
  {
    title: 'El cubo apareció en una época sin internet.',
    text: 'Su popularidad mundial se extendió gracias al boca a boca, las tiendas de juguetes y los concursos, décadas antes de las redes sociales.',
  },
  {
    title: 'Muchas personas aprenden matemáticas gracias al cubo.',
    text: 'Conceptos avanzados como permutaciones, teoría de grupos y algoritmos pueden explorarse a través de este rompecabezas.',
  },
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
        description={TRIVIA[index].title}
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
        <Steps
          className="trivia__steps"
          steps={TRIVIA.map((c) => ({ text: `${c.title} ${c.text}` }))}
        />
      </section>
    </article>
  )
}
