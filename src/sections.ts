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
  { id: 'history', title: 'Historia' },
  { id: 'inside', title: '¿Cómo es por dentro?' },
  { id: 'introduction', title: 'Introducción al cubo' },
  { id: 'guide', title: 'Guía paso a paso' },
  { id: 'guided', title: 'Modo guiado' },
  { id: 'practice', title: 'Modo práctica' },
  { id: 'free', title: 'Modo libre' },
  { id: 'timed', title: 'Modo cronometrado' },
  { id: 'ranking', title: 'Ranking' },
  // Se llega desde la tarjeta de curiosidad de la portada (no va en el menú).
  { id: 'trivia', title: 'Curiosidades' },
]

/** Grupos del menú de la portada (en escritorio, una columna por grupo). */
export interface MenuGroup {
  title: string
  ids: SectionId[]
}

export const MENU_GROUPS: MenuGroup[] = [
  { title: 'Aprende', ids: ['history', 'inside', 'introduction', 'guide'] },
  { title: 'Juega', ids: ['guided', 'practice', 'free'] },
  { title: 'Compite', ids: ['timed', 'ranking'] },
]

/** Título de cada sección por id (para el menú agrupado). */
export const SECTION_TITLE = new Map(SECTIONS.map((s) => [s.id, s.title]))
