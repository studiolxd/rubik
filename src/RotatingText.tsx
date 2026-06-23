import { useEffect, useState } from 'react'

/**
 * Texto rotatorio: muestra una palabra y la cambia por la siguiente con un
 * efecto de "roll" de la palabra completa (entra desde abajo, sale por arriba).
 * CSS puro, sin dependencias de animación.
 */

/** Duración (s) de la animación de entrada/salida de la palabra. */
const DURATION = 0.5
/** Tiempo (ms) que permanece cada palabra una vez ha terminado de entrar. */
const HOLD = 1800

export function RotatingText({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'in' | 'out'>('in')

  useEffect(() => {
    const animMs = DURATION * 1000
    let outTimer: ReturnType<typeof setTimeout>
    // Espera a que la palabra entre y se lea, luego la saca y avanza.
    const holdTimer = setTimeout(() => {
      setPhase('out')
      outTimer = setTimeout(() => {
        setIndex((i) => (i + 1) % words.length)
        setPhase('in')
      }, animMs)
    }, animMs + HOLD)
    return () => {
      clearTimeout(holdTimer)
      clearTimeout(outTimer)
    }
  }, [index, words])

  return (
    <span className="rotating-text">
      <span key={index} className={`rotating-text__word is-${phase}`}>
        {words[index]}
      </span>
    </span>
  )
}
