/**
 * Datos y lógica de las curiosidades del cubo (sin componentes, para que el
 * fast-refresh de los componentes de Trivia.tsx no se rompa). Cada curiosidad
 * tiene un titular (`title`) y su explicación (`text`). En la portada se muestra
 * el titular de una al azar; al pulsarla, la página de Curiosidades muestra esa
 * misma curiosidad (vía `#trivia-N`).
 */
export interface Curiosity {
  title: string
  text: string
}

export const TRIVIA: Curiosity[] = [
  {
    title: 'Ni su propio inventor sabía resolverlo.',
    text: 'Ernő Rubik construyó el mecanismo sin dificultad, pero al mezclarlo por primera vez descubrió que no sabía deshacer la mezcla: había creado un rompecabezas sin querer. Tardó varias semanas en dar con un método para devolver cada pieza a su sitio.',
  },
  {
    title: 'Cualquier cubo mezclado puede resolverse en 20 movimientos o menos.',
    text: 'En 2010 se demostró, con ayuda de superordenadores, que 20 movimientos bastan para resolver cualquier posición del 3×3, partas de donde partas: es el famoso «Número de Dios». Quien encuentra esas soluciones tan cortas es un programa como el algoritmo de Kociemba (1992), que resuelve el cubo en dos fases apoyándose en enormes tablas precalculadas. Son soluciones rapidísimas, pero «no humanas» —mezclan todas las caras a la vez—, así que para aprender seguimos usando el método por capas: más largo, pero comprensible.',
  },
  {
    title: 'Resolverlo entrena el cerebro, no solo los dedos.',
    text: 'Más allá del entretenimiento, el cubo pone a trabajar la visualización espacial, el pensamiento lógico, la memoria y la paciencia. Por eso se sigue usando como recurso educativo en aulas de todo el mundo.',
  },
  {
    title: 'No se inventó para jugar, sino para dar clase.',
    text: 'Ernő Rubik era profesor de arquitectura y diseño en Budapest, y buscaba una forma tangible de explicar a sus alumnos cómo se mueven los objetos en el espacio sin desmontarse. El rompecabezas nació como herramienta didáctica; lo de juguete vino después.',
  },
  {
    title: 'Originalmente no se llamaba Cubo de Rubik.',
    text: 'En Hungría se vendió primero como «Cubo Mágico» (Magic Cube). Solo al distribuirse internacionalmente pasó a llamarse Rubik’s® Cube, en honor a su creador, y con ese nombre estalló la «rubikmanía» en todo el mundo.',
  },
  {
    title: 'Tiene más posiciones que estrellas hay en la galaxia.',
    text: 'Un cubo 3×3 puede adoptar exactamente 43.252.003.274.489.856.000 posiciones distintas: un número de 20 cifras, más de 43 trillones. Si cambiaras de posición cada segundo, no te bastaría toda la edad del universo para verlas todas.',
  },
  {
    title: 'De 43 trillones de posiciones, solo una está resuelta.',
    text: 'Entre todas las configuraciones posibles, únicamente una tiene cada cara de un solo color. Esa rareza es justo lo que hace difícil el reto: hay infinidad de formas de mezclarlo y una sola meta.',
  },
  {
    title: 'Hay cubos imposibles de resolver.',
    text: 'Si desmontas el cubo y lo vuelves a montar al azar, 11 de cada 12 veces creas una posición que ningún giro puede deshacer. Girando las caras nunca se llega a esos estados «ilegales»: solo aparecen si fuerzas el montaje.',
  },
  {
    title: 'Por muy mezclado que esté, siempre tiene solución.',
    text: 'Cualquier posición a la que llegues girando las caras se puede deshacer girando las caras, por imposible que parezca. No hace falta despegar pegatinas ni abrir el cubo: si llegaste ahí jugando, hay camino de vuelta.',
  },
  {
    title: 'Es uno de los objetos más vendidos de la historia.',
    text: 'Se han vendido cientos de millones de unidades desde su lanzamiento, lo que lo convierte en uno de los juguetes más populares —y reconocibles— jamás fabricados.',
  },
  {
    title: 'Resolver cubos rápido es un deporte de competición.',
    text: 'Se llama speedcubing y tiene su propio organismo internacional, la World Cube Association (WCA), que regula las competiciones y homologa los récords. No solo se compite con el 3×3: también a una mano, con los ojos vendados o con otros muchos «twisty puzzles».',
  },
  {
    title: 'Los mejores resuelven el cubo en menos de 4 segundos.',
    text: 'Lo que a la mayoría le lleva varios minutos, los campeones lo hacen en un suspiro: memorizan algoritmos, planifican los primeros movimientos durante la inspección y entrenan la memoria muscular hasta automatizarla.',
  },
  {
    title: 'El récord mundial del 3×3 ya baja de los 3 segundos.',
    text: 'En 2026, el polaco Teodor Zajder se convirtió en la primera persona en resolver un cubo oficial en menos de tres segundos, con una marca histórica de 2,76 segundos.',
  },
  {
    title: 'En competición solo puedes mirar el cubo 15 segundos.',
    text: 'Antes de empezar a resolver, el reglamento concede un máximo de 15 segundos de inspección para estudiar la mezcla y planear el arranque. A partir de ahí, manda el cronómetro.',
  },
  {
    title: 'No hace falta ser un genio para resolverlo.',
    text: 'Existen métodos avanzados con decenas de algoritmos, pero para resolver un 3×3 completo bastan unos pocos pasos básicos. El método por capas se aprende en una tarde y siempre funciona.',
  },
  {
    title: 'Los centros del cubo nunca se mueven de sitio.',
    text: 'Aunque gires las caras, los seis centros están unidos al núcleo y mantienen siempre la misma posición entre sí. Por eso cada centro fija el color de su cara y sirve de brújula para resolverlo.',
  },
  {
    title: 'Cada pieza lleva un número fijo de colores.',
    text: 'Las 8 esquinas llevan tres colores, las 12 aristas dos y los 6 centros uno solo. Esa regla no cambia nunca, y entenderla es la clave para saber dónde va cada pieza al resolver.',
  },
  {
    title: 'Gira en cualquier dirección sin que se suelte una sola pieza.',
    text: 'El gran reto de diseño no fueron los colores, sino el mecanismo: lograr que las capas giren en cualquier dirección sin que el cubo se descomponga. Esa pieza central que lo sujeta todo fue la verdadera invención.',
  },
  {
    title: 'Existen cubos de Rubik de hasta 33×33.',
    text: 'Además del clásico 3×3, hay versiones 2×2, 4×4, 5×5 y auténticos gigantes: el cubo funcional más grande jamás fabricado es un 33×33, con miles de piezas móviles. Cuanto mayor es el cubo, más larga (y mareante) se vuelve la resolución.',
  },
  {
    title: 'Algunos «cubos» no tienen ni una cara cuadrada.',
    text: 'Hay rompecabezas derivados con forma de pirámide (Pyraminx), de dodecaedro (Megaminx) o con cortes que deforman la figura al girar. Todos comparten la misma idea: piezas que rotan sin separarse.',
  },
  {
    title: 'Un robot lo resuelve en lo que tardas en parpadear.',
    text: 'Mientras los mejores humanos rondan los pocos segundos, las máquinas bajan muy por debajo del segundo, acercándose a la décima. Usan cámaras que leen las seis caras al instante y motores que giran las capas a una velocidad imposible para una mano.',
  },
  {
    title: 'Se hizo viral 30 años antes de que existiera internet.',
    text: 'Su éxito mundial de los años 80 se propagó a base de boca a boca, escaparates de jugueterías y concursos en televisión. No hubo tutoriales online ni redes sociales: la «rubikmanía» fue totalmente analógica.',
  },
  {
    title: 'Ha inspirado teoremas y tesis doctorales.',
    text: 'El cubo es un ejemplo físico de teoría de grupos, permutaciones y algoritmos. Por eso profesores y universidades lo usan para enseñar conceptos abstractos de forma tangible: se tocan, se giran y se entienden.',
  },
]

/** Clave de localStorage con el índice de la última curiosidad mostrada. */
const STORAGE_KEY = 'rubik:last-trivia'

/** Elige una curiosidad al azar distinta de la última (leída de localStorage). */
export function pickIndex(): number {
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

/** Recuerda la curiosidad mostrada para que la próxima visita saque otra distinta. */
export function rememberShown(index: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(index))
  } catch {
    // Sin localStorage: simplemente no se recuerda.
  }
}

/** Índice (0-based) de la curiosidad pedida en `#trivia-N` (N va 1-based), o `null`
 *  si el hash no es `#trivia-N` o el número está fuera de rango. App lo usa para
 *  decidir entre abrir Curiosidades o redirigir a la portada. */
export function triviaIndexFromHash(): number | null {
  const m = window.location.hash.match(/^#trivia-(\d+)$/)
  if (!m) return null
  const i = Number(m[1]) - 1
  return i >= 0 && i < TRIVIA.length ? i : null
}
