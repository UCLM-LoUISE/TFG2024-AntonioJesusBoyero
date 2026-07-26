export class EstudiosBuffer {
  private static estudios: any[] = [];
  private static estudio: any = null;
  private static tarea: any = null;
  /** Id del estudio importado desde archivo (solo puede haber uno cargado). */
  private static idEstudioImportado: any = null;
  private static provinciaEstudio: any = null;
  private static momentoSeleccionado: string = '';

  static getEstudios(): any[] {
    return this.estudios;
  }

  static setEstudios(nuevosEstudios: any[]): void {
    this.estudios = nuevosEstudios;
  }

  static getEstudioDetalle(): any {
    return this.estudio;
  }

  static setEstudioDetalle(estudio: any): void {
    this.estudio = estudio;
  }

  static getIdEstudioImportado(): any {
    return this.idEstudioImportado;
  }

  static setIdEstudioImportado(id: any): void {
    this.idEstudioImportado = id;
  }

  static getTarea(): any {
    return this.tarea;
  }

  static setTarea(tarea: any): void {
    this.tarea = tarea;
  }

  static getProvinciaEstudio(): any {
    return this.provinciaEstudio;
  }

  static setProvinciaEstudio(provinciaEstudio: any): void {
    this.provinciaEstudio = provinciaEstudio;
  }

  static getMomentoSeleccionado(): string {
    return this.momentoSeleccionado;
  }

  static setMomentoSeleccionado(momento: string): void {
    this.momentoSeleccionado = momento;
  }
}
