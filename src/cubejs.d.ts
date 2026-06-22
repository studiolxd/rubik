/**
 * Tipado mínimo para `cubejs` (no publica tipos propios).
 * Solo se declaran los métodos que usamos.
 */
declare module 'cubejs' {
  class Cube {
    constructor(other?: Cube)
    /** Aplica un algoritmo en notación WCA, p.ej. "R U R' U2". */
    move(alg: string): this
    /** Devuelve una solución (Kociemba) como cadena de movimientos. */
    solve(maxDepth?: number): string
    isSolved(): boolean
    clone(): Cube
    asString(): string
    static fromString(s: string): Cube
    static random(): Cube
    /** Devuelve una mezcla aleatoria como cadena de movimientos. */
    static scramble(): string
    /** Precalcula las tablas del solucionador (lento; hacer una sola vez). */
    static initSolver(): void
  }
  export default Cube
}
