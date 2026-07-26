export class EstudioData {
  private static NuevoEstudioFormData: any = {};
  private static ParcelasData: any = {};
  private static TareasEstudioData: any = {};
  private static EstudioFusionData: any;

  // Set y Get para NuevoEstudioFormData
  static setNuevoEstudioFormData(value: any) {
    this.NuevoEstudioFormData = value;
  }

  static getNuevoEstudioFormData() {
    return this.NuevoEstudioFormData;
  }

  // Set y Get para ParcelasData
  static setParcelasData(value: any) {
    this.ParcelasData = value;
  }

  static getParcelasData() {
    return this.ParcelasData;
  }

  // Set y Get para TareasEstudioData
  static setTareasEstudioData(value: any) {
    this.TareasEstudioData = value;
  }

  static getTareasEstudioData() {
    return this.TareasEstudioData;
  }

  // Obtener toda la información
  static getAll() {
    return {
      NuevoEstudioFormData: this.NuevoEstudioFormData,
      ParcelasData: this.ParcelasData,
      TareasEstudioData: this.TareasEstudioData,
    };
  }

  // Resetear toda la información
  static reset() {
    this.NuevoEstudioFormData = {};
    this.ParcelasData = {};
    this.TareasEstudioData = {};
  }

  static hayDatosEstudios(): boolean {
    return (
      Object.keys(this.NuevoEstudioFormData).length > 0 || // Verifica si hay datos en el formulario
      Object.keys(this.ParcelasData).length > 0 || // Verifica si hay datos en las parcelas
      (Array.isArray(this.TareasEstudioData) &&
        this.TareasEstudioData.length > 0) // Verifica si hay tareas
    );
  }

  // Set y Get para EstudioFusionData
  static setEstudioFusionData(value: any) {
    this.EstudioFusionData = value;
  }

  static getEstudioFusionData() {
    return this.EstudioFusionData;
  }
}
