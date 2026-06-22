import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { Button } from '@studiolxd/brand/button'
import { Link } from '@studiolxd/brand/link'
import { Logo } from '@studiolxd/brand/logo'
import { VisuallyHidden } from '@studiolxd/brand/visually-hidden'
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

      <Link href="https://studiolxd.com" external className="menu__logo">
        <Logo height={28} />
        <VisuallyHidden>Studio LXD (se abre en una pestaña nueva)</VisuallyHidden>
      </Link>
    </div>
  )
}
