import { useEffect, useRef, useState } from 'react'

/** Formatea milisegundos como mm:ss.cs. */
export function formatTime(ms: number): string {
  const totalCs = Math.floor(ms / 10)
  const cs = totalCs % 100
  const totalS = Math.floor(totalCs / 100)
  const s = totalS % 60
  const m = Math.floor(totalS / 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(m)}:${pad(s)}.${pad(cs)}`
}

/**
 * Cronómetro: cuenta ms desde "Comenzar"; se congela exactamente al resolver y se
 * pone a cero cuando `started` vuelve a false (reiniciar). El display lo pinta el
 * HUD del visor (CubeExperience); este hook solo es la fuente del tiempo.
 */
export function useTimer(started: boolean, solved: boolean): number {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number | null>(null)
  const running = started && !solved

  // El reloj arranca al comenzar y se pone a cero al reiniciar (started → false).
  useEffect(() => {
    if (started) {
      startRef.current = performance.now()
    } else {
      startRef.current = null
      setElapsed(0)
    }
  }, [started])

  // Mientras corre, refresca el display cada frame.
  useEffect(() => {
    if (!running) return
    let raf = 0
    const tick = () => {
      if (startRef.current !== null) setElapsed(performance.now() - startRef.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])

  // Al resolver, congela el tiempo final exacto.
  useEffect(() => {
    if (solved && startRef.current !== null) setElapsed(performance.now() - startRef.current)
  }, [solved])

  return elapsed
}
