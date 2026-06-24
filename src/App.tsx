import { useEffect, useState } from 'react'
import { Menu } from './Menu'
import { Screen } from './Screen'
import { CubeExperience } from './CubeExperience'
import { History } from './History'
import { Inside } from './Inside'
import { TriviaPage } from './Trivia'
import { triviaIndexFromHash } from './trivia-data'
import { Introduction } from './Introduction'
import { Guide } from './Guide'
import { GuidedMode } from './GuidedMode'
import { Ranking } from './Ranking'
import { SECTION_IDS, type SectionId } from './sections'
import { useScormLifecycle } from './scorm'
import './styles/index.css'

type ScreenId = SectionId | 'menu'

/** Secciones que son experiencias 3D a pantalla completa: el header queda fijo y el
 *  cuerpo llena el viewport. El resto son páginas de contenido que hacen scroll.
 *  'guided' es mixta: contenido (elegir/escanear) → fill solo al jugar (ver abajo). */
const FILL_SCREENS: ScreenId[] = ['inside', 'introduction', 'guide', 'free', 'practice', 'timed']

/** Lee la sección desde el hash de la URL (#free → 'free'). Un hash vacío,
 *  un '#' suelto o un id desconocido se tratan como el menú: así un enlace roto
 *  o el href="#" de las cards de la portada nunca dejan la app en un estado raro. */
function screenFromHash(): ScreenId {
  const raw = window.location.hash.replace(/^#/, '')
  // `#trivia-N` abre una curiosidad concreta (la pantalla sigue siendo 'trivia').
  // Un #trivia sin número o con uno fuera de rango se trata como hash inválido.
  if (raw.replace(/-\d+$/, '') === 'trivia') {
    return triviaIndexFromHash() !== null ? 'trivia' : 'menu'
  }
  return SECTION_IDS.has(raw as SectionId) ? (raw as SectionId) : 'menu'
}

function App() {
  // Arranca la sesión SCORM: inicializa, va guardando el tiempo de sesión y, en el
  // primer arranque, marca el estado como "iniciado". Vive aquí (dentro del provider)
  // para que la navegación por hash, sin recargar, mantenga viva una única sesión.
  useScormLifecycle()
  // El hash de la URL es la fuente de verdad de la sección actual. Esto permite
  // enlaces directos (#free), botón atrás/adelante del navegador y, sobre todo,
  // navegar sin recargar: clave para que una futura sesión SCORM siga viva.
  const [screen, setScreenState] = useState<ScreenId>(screenFromHash)
  // El modo guiado alterna: elegir/escanear son contenido (scroll de página); la
  // fase de juego 3D es a pantalla completa. GuidedMode nos avisa al cambiar de fase.
  const [guidedFill, setGuidedFill] = useState(false)

  // Sincroniza el estado con el hash (al montar y cuando cambia por fuera:
  // atrás/adelante, enlace). Un hash inválido —incluido un #trivia-N fuera de
  // rango— muestra la portada y, además, limpia la URL: una redirección de verdad.
  useEffect(() => {
    const sync = () => {
      const next = screenFromHash()
      if (next === 'menu' && window.location.hash) window.location.hash = ''
      setScreenState(next)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  // Navegar = actualizar el hash (y el estado, para que el cambio sea inmediato).
  // 'menu' no lleva hash, para que la portada quede en la URL base.
  const setScreen = (id: ScreenId) => {
    setScreenState(id)
    const next = id === 'menu' ? '' : id
    if (window.location.hash.replace(/^#/, '') !== next) window.location.hash = next
  }

  if (screen === 'menu') {
    return <Menu onSelect={setScreen} />
  }

  const fill = screen === 'guided' ? guidedFill : FILL_SCREENS.includes(screen)

  return (
    <Screen onBack={() => setScreen('menu')} fill={fill}>
      {/* Secciones con contenido. El resto quedan vacías (solo el título). */}
      {screen === 'history' && <History />}
      {screen === 'inside' && <Inside />}
      {screen === 'trivia' && <TriviaPage />}
      {screen === 'introduction' && <Introduction />}
      {screen === 'guide' && <Guide />}
      {screen === 'free' && <CubeExperience mode="free" />}
      {screen === 'guided' && <GuidedMode onFillChange={setGuidedFill} />}
      {screen === 'practice' && <CubeExperience mode="practice" />}
      {screen === 'timed' && <CubeExperience mode="timed" />}
      {screen === 'ranking' && <Ranking />}
    </Screen>
  )
}

export default App
