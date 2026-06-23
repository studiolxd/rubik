import type { ReactNode } from 'react'
import { Button } from '@studiolxd/brand/button'
import { Heading } from '@studiolxd/brand/heading'
import { Icon } from '@studiolxd/brand/icon'

/**
 * Envoltorio de cada pantalla de sección: cabecera con "Volver al menú"
 * (siempre vuelve al inicio) + título, y el contenido debajo.
 */
export function Screen({
  title,
  onBack,
  children,
}: {
  title: string
  onBack: () => void
  children?: ReactNode
}) {
  return (
    <div className="screen">
      <header className="screen__header">
        {/* Botón de volver: solo el chevron (punta a la izquierda); el texto va en
            el aria-label. asChild deja poner el aria-label en el <button> real, que
            el Button de marca no reenvía por sí mismo. */}
        <Button variant="text" asChild onClick={onBack}>
          <button type="button" aria-label="Volver al menú">
            <Icon name="chevron" className="screen__back-icon" />
          </button>
        </Button>
        <Heading level={1} size={5} weight="bold">
          {title}
        </Heading>
      </header>
      <div className="screen__body">{children}</div>
    </div>
  )
}
