import { useEffect, useState, type ReactNode } from 'react'
import { Kbd } from '@studiolxd/brand/kbd'
import type { CubeController, PracticeFeedback } from './three/cube/useCube'
import { moveToString, type Face, type Move } from './three/cube/engine'

const FACE_LABEL: Record<Face, string> = {
  U: 'Arriba',
  D: 'Abajo',
  L: 'Izquierda',
  R: 'Derecha',
  F: 'Frente',
  B: 'Atrás',
}

/** Tecla(s) a pulsar para un movimiento: cara, o Shift+cara si es inverso. */
export function KeyHint({ move }: { move: Move }) {
  return (
    <span className="keyhint">
      {move.power === 3 && (
        <>
          <Kbd size="sm">Shift</Kbd>
          <span className="keyhint__plus">+</span>
        </>
      )}
      <Kbd size="lg">{move.face}</Kbd>
    </span>
  )
}

// El modo libre ya no tiene panel: Mezclar y resolver (paso a paso / Kociemba) son
// botones de ViewControls. La explicación "¿Qué es el algoritmo de Kociemba?" pasó a
// la página de Historia.

/**
 * HUD del modo guiado (paso a paso): caja arriba del visor con el siguiente
 * movimiento, visible solo cuando el toggle de ViewControls lo activa. "Calculando"
 * y "¡Cubo resuelto!" se muestran siempre; con el movimiento oculto, no hay caja.
 */
export function StepHud({
  controller,
  showMove,
}: {
  controller: CubeController
  showMove: boolean
}) {
  const { mode, solving, solutionLength, nextMove } = controller
  const preparing = mode !== 'step' || solving

  let body: ReactNode = null
  if (preparing) {
    body = 'Calculando solución…'
  } else if (solutionLength === 0 || !nextMove) {
    body = '¡Cubo resuelto!'
  } else if (showMove) {
    body = (
      <>
        Gira <strong>{FACE_LABEL[nextMove.face]}</strong> ({moveToString(nextMove)}){' '}
        {turnSense(nextMove)}.
      </>
    )
  }

  if (!body) return null
  return <div className="move-hud">{body}</div>
}

/** Sentido legible de un giro (la solución solo usa potencias 1 y 3). */
function turnSense(move: Move): string {
  return move.power === 3 ? 'antihorario (con Shift)' : 'horario'
}

/**
 * HUD del modo práctica: caja (borde primary) arriba del visor con el mensaje
 * actual. El botón de Pista vive en ViewControls; aquí solo se muestra el texto de
 * la pista y el feedback del último intento. Prioridad del mensaje:
 * calculando → resuelto → feedback (efímero) → pista revelada → instrucción base.
 */
export function PracticeHud({ controller }: { controller: CubeController }) {
  const { mode, solving, solved, nextMove, hintLevel, practiceFeedback } = controller
  const preparing = mode !== 'practice' || solving

  // Feedback efímero de OK / error. Se oculta solo a los 1,6 s. El efecto depende
  // solo de `n` (un intento nuevo): si dependiera del objeto `practiceFeedback`,
  // un cambio de identidad en cualquier render reiniciaría el timeout y nunca
  // llegaría a dispararse (el texto se quedaba fijo hasta el siguiente intento).
  const [flash, setFlash] = useState<PracticeFeedback | null>(null)
  const feedbackN = practiceFeedback?.n
  useEffect(() => {
    if (!practiceFeedback) return
    setFlash(practiceFeedback)
    const id = setTimeout(() => setFlash(null), 1600)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackN])

  let tone: '' | 'correct' | 'wrong' = ''
  let body: ReactNode = null
  if (preparing) {
    body = 'Calculando solución…'
  } else if (solved) {
    body = '¡Cubo resuelto!'
  } else if (flash) {
    tone = flash.kind
    body = flash.kind === 'correct' ? '¡Correcto!' : 'No es correcto. Vuelve a intentarlo.'
  } else if (hintLevel >= 1 && nextMove) {
    body = (
      <>
        Gira la cara <strong>{FACE_LABEL[nextMove.face]}</strong> ({nextMove.face})
        {hintLevel >= 2 && (
          <>
            {' '}
            en sentido <strong>{turnSense(nextMove)}</strong>
          </>
        )}
        .
      </>
    )
  }

  // Sin mensaje (sin pista pedida ni feedback ni estado especial): no hay caja.
  if (!body) return null

  return <div className={`move-hud${tone ? ` move-hud--${tone}` : ''}`}>{body}</div>
}

// El modo cronometrado ya no tiene panel: el tiempo (HUD del visor) y su lógica
// viven en `useTimer` (src/useTimer.ts); "Comenzar"/"Reiniciar" son el primer botón
// (play/stop) de ViewControls.
