import type { ReactNode } from 'react'
import { Button } from '@studiolxd/brand/button'
import { Heading } from '@studiolxd/brand/heading'

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
        <Button variant="text" onClick={onBack}>
          ← Volver al menú
        </Button>
        <Heading level={1} size={5} weight="bold">
          {title}
        </Heading>
      </header>
      <div className="screen__body">{children}</div>
    </div>
  )
}
