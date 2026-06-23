import type { ReactNode } from 'react'
import { Button } from '@studiolxd/brand/button'
import { Icon } from '@studiolxd/brand/icon'
import { VisuallyHidden } from '@studiolxd/brand/visually-hidden'

/**
 * Envoltorio de cada pantalla de sección: cabecera con "Volver al menú"
 * (siempre vuelve al inicio) y el contenido debajo.
 */
export function Screen({
  onBack,
  fill = false,
  children,
}: {
  onBack: () => void
  /** `true` para experiencias 3D a pantalla completa (cubo/intro/guía): el header
   *  queda fijo y el cuerpo llena el viewport. `false` (defecto) en páginas de
   *  contenido: la página entera (header incluido) hace scroll. */
  fill?: boolean
  children?: ReactNode
}) {
  return (
    <div className={`screen${fill ? ' screen--fill' : ''}`}>
      <header className="screen__header">
        {/* Botón de volver: solo el chevron (punta a la izquierda); la etiqueta
            accesible va con VisuallyHidden dentro del propio Button. */}
        <Button variant="text" onClick={onBack}>
          <Icon name="chevron" size="lg" className="screen__back-icon" />
          <VisuallyHidden>Volver al menú</VisuallyHidden>
        </Button>
      </header>
      <div className="screen__body">{children}</div>
    </div>
  )
}
