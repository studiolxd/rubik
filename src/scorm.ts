import { useEffect, useRef } from 'react'
import { useScormSession, useScormAutoTerminate, useScormAutoCommit } from '@studiolxd/scorm/react'

/**
 * Ciclo de vida de la sesión SCORM. Se llama una sola vez dentro del provider
 * (desde App): inicializa al montar, va guardando el tiempo de sesión y, en el
 * primer arranque, marca el estado como "iniciado" (incomplete en SCORM 1.2).
 */
export function useScormLifecycle() {
  useScormAutoTerminate({ trackSessionTime: true }) // init + tiempo + commit/terminate al cerrar
  useScormAutoCommit(60_000) // flush periódico por si no llega el unload
  useMarkStarted()
}

/**
 * En cuanto la sesión está viva, marca "iniciado" (incomplete) salvo que ya viniera
 * "completed" de una sesión anterior: nunca degradamos un curso ya completado.
 */
function useMarkStarted() {
  const { initialized, api, commit } = useScormSession()
  const done = useRef(false)
  useEffect(() => {
    if (!initialized || !api || done.current) return
    done.current = true
    const status = api.getCompletionStatus()
    if (status.ok && status.value === 'completed') return
    api.setIncomplete()
    commit()
  }, [initialized, api, commit])
}

/** Marca el SCORM como "completado" la primera vez que `solved` pasa a true. */
export function useScormCompleteOnSolve(solved: boolean) {
  const { api, commit } = useScormSession()
  const fired = useRef(false)
  useEffect(() => {
    if (!solved || fired.current || !api) return
    fired.current = true
    api.setComplete()
    commit()
  }, [solved, api, commit])
}
