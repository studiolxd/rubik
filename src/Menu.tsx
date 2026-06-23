import { useState } from 'react'
import { Heading } from '@studiolxd/brand/heading'
import { Link } from '@studiolxd/brand/link'
import { Logo } from '@studiolxd/brand/logo'
import { VisuallyHidden } from '@studiolxd/brand/visually-hidden'
import { MenuCube } from './MenuCube'
import { TriviaCard } from './Trivia'
import { MENU_GROUPS, type SectionId } from './sections'
import { Card } from '@studiolxd/brand/card'

/** Color de la card de cada grupo del menú (Aprende / Juega / Compite). */
const GROUP_COLORS = ['primary', 'accent-1', 'accent-2'] as const

/** Descripción de la card de cada grupo (mismo orden que MENU_GROUPS). */
const GROUP_DESCRIPTIONS = [
  'Conoce la historia del cubo de Rubik y cómo es por dentro. Aprende sus partes y a resolverlo paso a paso.',
  'Juega en modo guiado, práctica o libre.',
  'Compite contra el reloj y alcanza el puesto más alto en el ranking.',
]

/** Menú inicial: marca + slogan + acceso a cada sección. */
export function Menu({ onSelect }: { onSelect: (id: SectionId) => void }) {
  // Un overlay blanco cubre la portada hasta que el cubo WebGL pinta su primer
  // frame; entonces se desvanece rápido para que no se vea el arranque del Canvas.
  const [ready, setReady] = useState(false)

  return (
    // Contenedor desplazable: el menú ocupa toda la pantalla y el footer queda
    // debajo, así que solo aparece al hacer scroll.
    <div className="menu-page">
      <div className="menu">
        {/* Columna izquierda: cubo (arriba) + título, alineados abajo. */}
        <div className="menu__left">
          <div className="menu__brand">
            <Heading level={1} size={9} weight="regular">
              Aprende a resolver
              <br />
              el cubo de Rubik
            </Heading>
          </div>

          <MenuCube onReady={() => setReady(true)} />
        </div>

        {/* Columna derecha: cards de secciones + curiosidad, alineadas abajo. */}
        <div className="menu__right">
          <nav className="menu__nav" aria-label="Secciones">
            {/* Una Card por grupo. La navegación se decidirá luego. */}
            {MENU_GROUPS.map((group, i) => (
              <Card
                key={group.title}
                color={GROUP_COLORS[i]}
                title={group.title}
                description={GROUP_DESCRIPTIONS[i]}
                ctaLabel={`Ver ${group.title}`}
                href="#"
              />
            ))}
          </nav>

          <TriviaCard onOpen={() => onSelect('trivia')} />
        </div>
      </div>

      {/* Footer oscuro con el logo (en blanco) alineado a la derecha. */}
      <footer className="menu__footer">
        <Link href="https://studiolxd.com" external className="menu__logo">
          <Logo height={28} dark />
          <VisuallyHidden>Studio LXD (se abre en una pestaña nueva)</VisuallyHidden>
        </Link>
      </footer>

      <div className={`menu__overlay${ready ? ' is-hidden' : ''}`} aria-hidden="true" />
    </div>
  )
}
