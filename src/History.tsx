import { Heading } from '@studiolxd/brand/heading'
import { Timeline } from './Timeline'

/** Rutas de los assets en public/, respetando el `base` relativo de Vite (SCORM/LMS). */
const VIDEO_SRC = `${import.meta.env.BASE_URL}origin-web.mp4`
const POSTER_SRC = `${import.meta.env.BASE_URL}origin.png`

/**
 * Sección "Origen del cubo de Rubik": un vídeo que cuenta su origen y su historia.
 */
export function History() {
  return (
    <article className="article">
      <header className="article__intro">
        <Heading level={2} size={7}>
          Origen del cubo de Rubik
        </Heading>
      </header>

      <video
        className="article__video"
        src={VIDEO_SRC}
        poster={POSTER_SRC}
        controls
        playsInline
        preload="metadata"
      >
        Tu navegador no puede reproducir este vídeo.
      </video>

      <Heading level={2} size={5}>
        Algunos hitos importantes
      </Heading>

      <Timeline />
    </article>
  )
}
