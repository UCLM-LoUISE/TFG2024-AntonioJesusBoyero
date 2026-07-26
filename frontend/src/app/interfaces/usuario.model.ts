
export type Rol = 'administrador' | 'investigador' | 'trabajador';
export type Estado = 'activo' | 'inactivo';

export interface Usuario {
  id?: string;
  uid?: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono?: string;
  rol: Rol;
  grupo: string | null;
  /** ahora viene del backend derivado de Auth.disabled */
  estado: Estado;
  fechaCreacion?: any;
}

export type UsuarioUI = Usuario & {
  loadingAccion?: 'estado' | 'borrar' | null;
};
