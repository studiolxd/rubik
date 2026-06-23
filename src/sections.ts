/** Secciones de la aplicación, en el orden del menú inicial. */
export type SectionId =
  | 'history'
  | 'inside'
  | 'introduction'
  | 'guide'
  | 'guided'
  | 'practice'
  | 'free'
  | 'timed'
  | 'ranking'
  | 'trivia'

export interface Section {
  id: SectionId
  title: string
}

export const SECTIONS: Section[] = [
  { id: 'history', title: 'Origen' },
  { id: 'inside', title: 'El cubo por dentro' },
  { id: 'introduction', title: 'Partes y movimientos' },
  { id: 'guide', title: 'Guía paso a paso' },
  { id: 'guided', title: 'Modo guiado' },
  { id: 'practice', title: 'Modo práctica' },
  { id: 'free', title: 'Modo libre' },
  { id: 'timed', title: 'Modo cronometrado' },
  { id: 'ranking', title: 'Ranking' },
  // Va en el grupo "Aprende" y también se llega desde la tarjeta de curiosidad.
  { id: 'trivia', title: 'Curiosidades' },
]

/** Grupos del menú de la portada (en escritorio, una columna por grupo). */
export interface MenuGroup {
  title: string
  ids: SectionId[]
}

export const MENU_GROUPS: MenuGroup[] = [
  { title: 'Aprende', ids: ['history', 'introduction', 'inside', 'guide', 'trivia'] },
  { title: 'Juega', ids: ['guided', 'practice', 'free'] },
  { title: 'Compite', ids: ['timed', 'ranking'] },
]

/** Título de cada sección por id (para el menú agrupado). */
export const SECTION_TITLE = new Map(SECTIONS.map((s) => [s.id, s.title]))

/** Conjunto de ids válidos: sirve para validar el id que llega por el hash de la URL. */
export const SECTION_IDS = new Set<SectionId>(SECTIONS.map((s) => s.id))
