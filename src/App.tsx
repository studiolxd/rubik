import { useState } from 'react'
import { Menu } from './Menu'
import { Screen } from './Screen'
import { CubeExperience } from './CubeExperience'
import { History } from './History'
import { Inside } from './Inside'
import { TriviaPage } from './Trivia'
import { Introduction } from './Introduction'
import { Guide } from './Guide'
import { GuidedMode } from './GuidedMode'
import { Ranking } from './Ranking'
import { type SectionId } from './sections'
import './styles/index.css'

type ScreenId = SectionId | 'menu'

/** Secciones que son experiencias 3D a pantalla completa: el header queda fijo y el
 *  cuerpo llena el viewport. El resto son páginas de contenido que hacen scroll. */
const FILL_SCREENS: ScreenId[] = ['introduction', 'guide', 'free', 'guided', 'practice', 'timed']

function App() {
  const [screen, setScreen] = useState<ScreenId>('menu')

  if (screen === 'menu') {
    return <Menu onSelect={setScreen} />
  }

  return (
    <Screen onBack={() => setScreen('menu')} fill={FILL_SCREENS.includes(screen)}>
      {/* Secciones con contenido. El resto quedan vacías (solo el título). */}
      {screen === 'history' && <History />}
      {screen === 'inside' && <Inside />}
      {screen === 'trivia' && <TriviaPage />}
      {screen === 'introduction' && <Introduction />}
      {screen === 'guide' && <Guide />}
      {screen === 'free' && <CubeExperience mode="free" />}
      {screen === 'guided' && <GuidedMode />}
      {screen === 'practice' && <CubeExperience mode="practice" />}
      {screen === 'timed' && <CubeExperience mode="timed" />}
      {screen === 'ranking' && <Ranking />}
    </Screen>
  )
}

export default App
