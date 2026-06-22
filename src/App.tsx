import { useState } from 'react'
import { Menu } from './Menu'
import { Screen } from './Screen'
import { CubeExperience } from './CubeExperience'
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
      {screen === 'libre' && <CubeExperience mode="free" />}
      {screen === 'guiado' && <CubeExperience mode="step" />}
    </Screen>
  )
}

export default App
