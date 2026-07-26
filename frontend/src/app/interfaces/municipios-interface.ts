export interface Municipio {
  municipio: string;
  latitud: number;
  longitud: number;
  altitud: number;
}

export interface Provincia {
  [nombreProvincia: string]: Municipio[];
}
