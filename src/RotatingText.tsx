import { useEffect, useState } from 'react'

/**
 * Texto rotatorio: muestra una palabra y la cambia por la siguiente con un
 * efecto de "roll" letra a letra (entra desde abajo, sale por arriba), con un
 * pequeño desfase entre caracteres. CSS puro, sin dependencias de animación.
 */

/** Duración (s) de la animación de entrada/salida de cada carácter. */
const CHAR_DURATION = 0.5
/** Desfase (s) entre caracteres consecutivos. */
const STAGGER = 0.03
/** Tiempo (ms) que permanece cada palabra una vez ha terminado de entrar. */
const HOLD = 1800

export function RotatingText({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'in' | 'out'>('in')

  useEffect(() => {
    const word = words[index]
    const animMs = (CHAR_DURATION + (word.length - 1) * STAGGER) * 1000
    let outTimer: ReturnType<typeof setTimeout>
    // Espera a que la palabra termine de entrar y se lea, luego la saca y
    // avanza a la siguiente.
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

  const word = words[index]
  const chars = Array.from(word)

  return (
    <span className="rotating-text" role="text" aria-label={word}>
      {chars.map((ch, i) => (
        <span
          key={i}
          className={`rotating-text__char is-${phase}`}
          style={{ animationDelay: `${i * STAGGER}s` }}
          aria-hidden="true"
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  )
}
