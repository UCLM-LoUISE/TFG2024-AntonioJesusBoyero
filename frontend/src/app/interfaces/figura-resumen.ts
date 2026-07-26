export interface FiguraResumen {
  id: string; // Identificador único de la figura
  tipo: string; // Tipo de figura (Círculo, Polígono, etc.)
  nombre: string; // Nombre de la figura
  hijos: FiguraResumen[]; // Figuras contenidas dentro de esta
}
