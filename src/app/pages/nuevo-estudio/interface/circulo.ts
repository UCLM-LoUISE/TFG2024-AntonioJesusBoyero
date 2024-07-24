import { FiguraTipo } from "../enum/figuras";

export interface Circulo {
  tipo: FiguraTipo;
  coordenadas: [number, number];
  radio?: number;
}
