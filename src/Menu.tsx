import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { Button } from '@studiolxd/brand/button'
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

      <nav className="menu__grid">
        {SECTIONS.map((s) => (
          <Button key={s.id} variant="outline" block onClick={() => onSelect(s.id)}>
            {s.title}
          </Button>
        ))}
      </nav>
    </div>
  )
}
