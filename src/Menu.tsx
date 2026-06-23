import { useRef, useState } from 'react'
import { Heading } from '@studiolxd/brand/heading'
import { Icon } from '@studiolxd/brand/icon'
import { Link } from '@studiolxd/brand/link'
import { Logo } from '@studiolxd/brand/logo'
import { VisuallyHidden } from '@studiolxd/brand/visually-hidden'
import { Button } from '@studiolxd/brand/button'
import { Arrow } from '@studiolxd/brand/arrow'
import { List } from '@studiolxd/brand/list'
import { MenuCube } from './MenuCube'
import { TriviaCard } from './Trivia'
import { MENU_GROUPS, SECTION_TITLE, type SectionId } from './sections'
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
  // Grupo abierto en la columna derecha (índice en MENU_GROUPS) o null = ver cards.
  const [group, setGroup] = useState<number | null>(null)
  // Columna de secciones: el chevron de la portada hace scroll hasta aquí.
  const sectionsRef = useRef<HTMLDivElement>(null)

  return (
    // Contenedor desplazable: el menú ocupa toda la pantalla y el footer queda
    // debajo, así que solo aparece al hacer scroll.
    <div className="menu-page">
      <div className="menu">
        {/* Marca de la portada: logo en la esquina superior izquierda. Superpuesto
            (absolute) para no alterar el layout de columnas. */}
        <header className="menu__header">
          <Logo height={64} />
        </header>

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

          {/* Indicador de scroll (solo < 1280px): baja hasta las secciones para
              que "Aprende" quede alineado arriba. El chevron de marca apunta a la
              derecha; lo giramos hacia abajo (.menu__scroll-icon). */}
          <button
            type="button"
            className="menu__scroll-hint"
            onClick={() =>
              sectionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          >
            <Icon name="chevron" size="lg" className="menu__scroll-icon" />
            <VisuallyHidden>Ir a las secciones</VisuallyHidden>
          </button>
        </div>

        {/* Columna derecha: cards de grupo + curiosidad, o las opciones del grupo
            abierto (h2 + lista). Todo alineado abajo. */}
        <div className="menu__right" ref={sectionsRef}>
          {group === null ? (
            <nav className="menu__nav" aria-label="Secciones">
              {/* Una Card por grupo; al pulsarla abre sus opciones en esta columna.
                  El Card de marca es un <a href>; envolvemos para interceptar el
                  click (evitando el salto del href "#"). */}
              {MENU_GROUPS.map((g, i) => (
                <div
                  key={g.title}
                  className="menu__group-card"
                  onClick={(e) => {
                    e.preventDefault()
                    setGroup(i)
                  }}
                >
                  <Card
                    color={GROUP_COLORS[i]}
                    title={g.title}
                    description={GROUP_DESCRIPTIONS[i]}
                    ctaLabel={`Ver ${g.title}`}
                    href="#"
                  />
                </div>
              ))}
            </nav>
          ) : (
            // Panel con la superficie de la card de marca para conservar el color
            // del grupo (primary / accent-1 / accent-2). `surface-dark` reajusta los
            // tokens del Button (texto en blanco) sobre el fondo oscuro de `primary`.
            <div
              className={`menu__section card card--${GROUP_COLORS[group]}${
                GROUP_COLORS[group] === 'primary' ? ' surface-dark' : ''
              }`}
            >
              <Heading level={2} size={8}>
                {MENU_GROUPS[group].title}
              </Heading>
              <List type="plain">
                {MENU_GROUPS[group].ids.map((id) => (
                  <li key={id}>
                    <Button variant="text" onClick={() => onSelect(id)}>
                      {SECTION_TITLE.get(id)}
                    </Button>
                  </li>
                ))}
              </List>
              {/* Volver a las 3 cards, al fondo del panel. Solo icono: la etiqueta
                  accesible va con VisuallyHidden dentro del propio Button. */}
              <Button variant="text" onClick={() => setGroup(null)}>
                <Arrow size="lg" className="menu__back-icon" />
                <VisuallyHidden>Volver a las secciones</VisuallyHidden>
              </Button>
            </div>
          )}

          {/* La curiosidad "¿Sabías que…?" se mantiene visible también con un grupo
              abierto. */}
          <TriviaCard onOpen={() => onSelect('trivia')} />
        </div>
      </div>

      {/* Footer oscuro: enlace de texto a la izquierda y logo (en blanco) a la
          derecha. `surface-dark` recolorea el Link para que se lea sobre el fondo. */}
      <footer className="menu__footer surface-dark">
        <Link href="https://studiolxd.com" external>
          Visita studiolxd.com
        </Link>
        <span className="menu__logo">
          <Logo height={28} dark />
        </span>
      </footer>

      <div className={`menu__overlay${ready ? ' is-hidden' : ''}`} aria-hidden="true" />
    </div>
  )
}
