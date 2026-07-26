import { EstadoTarea } from "../enums/estado-tarea-enum";

export interface estudiosTableRow {
  id: string;
  nombreEstudio: string;
  tipoEstudio: string;
  fechaInicio: string; // Fecha de inicio de la tarea
  estado: EstadoTarea; // Estado de la tarea
  provincia: string; // Provincia asociada a la tarea
  poblacion: string; // Provincia asociada a la tarea
}
