import { useState } from 'react'
import { Heading } from '@studiolxd/brand/heading'
import { Link } from '@studiolxd/brand/link'
import { Logo } from '@studiolxd/brand/logo'
import { VisuallyHidden } from '@studiolxd/brand/visually-hidden'
import { MenuCube } from './MenuCube'
import { SECTIONS, type SectionId } from './sections'

/** Menú inicial: marca + slogan + acceso a cada sección. */
export function Menu({ onSelect }: { onSelect: (id: SectionId) => void }) {
  // Un overlay blanco cubre la portada hasta que el cubo WebGL pinta su primer
  // frame; entonces se desvanece rápido para que no se vea el arranque del Canvas.
  const [ready, setReady] = useState(false)

  return (
    <div className="menu">
      <div className="menu__brand">
        <Heading level={1} size={9} weight="bold">
          Rubik
        </Heading>
      </div>

      <MenuCube onReady={() => setReady(true)} />

      <nav className="menu__nav" aria-label="Secciones">
        <ul className="menu__nav-list">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <button type="button" className="menu__nav-link" onClick={() => onSelect(s.id)}>
                {s.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <Link href="https://studiolxd.com" external className="menu__logo">
        <Logo height={28} />
        <VisuallyHidden>Studio LXD (se abre en una pestaña nueva)</VisuallyHidden>
      </Link>

      <div className={`menu__overlay${ready ? ' is-hidden' : ''}`} aria-hidden="true" />
    </div>
  )
}
