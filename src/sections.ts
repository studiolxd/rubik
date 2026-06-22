/** Secciones de la aplicación, en el orden del menú inicial. */
export type SectionId =
  | 'sobre'
  | 'saber-mas'
  | 'introduccion'
  | 'guia'
  | 'guiado'
  | 'practica'
  | 'libre'
  | 'cronometrado'
  | 'ranking'

export interface Section {
  id: SectionId
  title: string
}

export const SECTIONS: Section[] = [
  { id: 'sobre', title: 'Sobre Studio LXD' },
  { id: 'saber-mas', title: 'Saber más' },
  { id: 'introduccion', title: 'Introducción al cubo' },
  { id: 'guia', title: 'Guía paso a paso' },
  { id: 'guiado', title: 'Modo guiado' },
  { id: 'practica', title: 'Modo práctica' },
  { id: 'libre', title: 'Modo libre' },
  { id: 'cronometrado', title: 'Modo cronometrado' },
  { id: 'ranking', title: 'Ranking' },
]
