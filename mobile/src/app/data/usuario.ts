export class UsuarioBuffer {

  private static correo: string = '';

  static getCorreo(): string {
    return this.correo;
  }

  static setCorreo(correo: string): void {
    this.correo = correo;
  }
}
