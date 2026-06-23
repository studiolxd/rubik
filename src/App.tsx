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
import { SECTIONS, type SectionId } from './sections'
import './App.css'

type ScreenId = SectionId | 'menu'

function App() {
  const [screen, setScreen] = useState<ScreenId>('menu')

  if (screen === 'menu') {
    return <Menu onSelect={setScreen} />
  }

  const section = SECTIONS.find((s) => s.id === screen)!

  return (
    <Screen title={section.title} onBack={() => setScreen('menu')}>
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
    </Screen>
  )
}

export default App
