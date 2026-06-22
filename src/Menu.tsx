import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { Button } from '@studiolxd/brand/button'
import { Logo } from '@studiolxd/brand/logo'
import { MenuCube } from './MenuCube'
import { SECTIONS, type SectionId } from './sections'

/** Menú inicial: marca + slogan + acceso a cada sección. */
export function Menu({ onSelect }: { onSelect: (id: SectionId) => void }) {
  return (
    <div className="menu">
      <div className="menu__brand">
        <Heading level={1} size={9} weight="bold">
          Rubik
        </Heading>
        <Paragraph size="large">Gira. Aprende. Resuelve. Compite.</Paragraph>
      </div>

      <MenuCube />

      <nav className="menu__grid">
        {SECTIONS.map((s) => (
          <Button key={s.id} variant="outline" block onClick={() => onSelect(s.id)}>
            {s.title}
          </Button>
        ))}
      </nav>

      <a
        className="menu__logo"
        href="https://studiolxd.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Studio LXD (se abre en una pestaña nueva)"
      >
        <Logo height={28} />
      </a>
    </div>
  )
}
