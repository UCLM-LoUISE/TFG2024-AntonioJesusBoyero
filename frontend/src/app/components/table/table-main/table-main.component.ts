import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { TableType } from 'src/app/enums/tipos-tablas';
import { EstudiosPage } from 'src/app/pages/estudios/estudios.page';
import { GestionTareasPage } from 'src/app/pages/gestion-tareas/gestion-tareas.page';

@Component({
  selector: 'app-table-main',
  templateUrl: './table-main.component.html',
  styleUrls: ['./table-main.component.css']
})
export class TableMainComponent implements OnInit, OnChanges {

  //#region VARIABLES

  @Input() tableType: TableType | undefined
  @Input() tableHeaders: any[] = [];
  @Input() tableData: any[] = [];
  @Input() rowsPerPage: number = 3;


  displayedData: any[] = [];
  currentPage: number = 1;
  totalPages: number = 1;
  loading: boolean = false;


  //variable para deshabilitar el botón de descargar, temporalmente.
  puedoDescargar: boolean = false;

  //#endregion

  constructor() { }

  //#region HOOKS

  ngOnInit() {
    this.totalPages = this.calculateTotalPages();
    this.updateDisplayedData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tableData']) {
      this.tableData = [...this.tableData]; // Asegurar nueva referencia
      this.totalPages = this.calculateTotalPages();
      this.updateDisplayedData();
    }
  }


  updateDisplayedData() {
    // Recalcula el número total de páginas
    this.totalPages = this.calculateTotalPages();

    // Si no hay páginas, forzar currentPage a 1
    if (this.totalPages === 0) {
      this.currentPage = 1;
    } else if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    // Calcula los índices de inicio y fin para los datos mostrados
    const startIndex = (this.currentPage - 1) * this.rowsPerPage;
    const endIndex = this.currentPage * this.rowsPerPage;

    // Actualiza los datos mostrados
    this.displayedData = this.tableData.slice(startIndex, endIndex);
  }

  esUsuarioCreador(idEstudio: string): boolean {
    return EstudiosPage.Instance.esUsuarioCreador(idEstudio);
  }

  puedoDescargarDatosEstudioTabla(idEstudio: string): boolean {
    return EstudiosPage.Instance.puedoDescargarDatosEstudio(idEstudio);
  }

  //#endregion

  //#region PAGINACIÓN

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateDisplayedData();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateDisplayedData();
    }
  }

  calculateTotalPages(): number {
    return Math.ceil(this.tableData.length / this.rowsPerPage);
  }


  //#endregion

  //#region EVENTOS

  onView(id: string) {
    if (this.tableType === TableType.Tareas) {
      GestionTareasPage.Instance.verTarea(id);
    } else {
      EstudiosPage.Instance.verEstudio(id);
    }
  }

  onEdit(id: string) {
    if (this.tableType === TableType.Tareas) {
      GestionTareasPage.Instance.editarTarea(id);
    } else {
      EstudiosPage.Instance.editarEstudio(id);
    }
  }

  onDelete(id: string) {
    if (this.tableType === TableType.Tareas) {
      // GestionTareasPage.Instance.eliminarTarea(id);
      GestionTareasPage.Instance.showModalEliminarTareas(id);
    } else {
      EstudiosPage.Instance.showModal(id);
    }
    this.updateDisplayedData();
  }

  onSettings(id: string) {
    EstudiosPage.Instance.showModalConfiguracionEstudio(id);
  }

  onDownloadData(id: string) {
    console.log(`Descargando datos para el ID: ${id}`);
    EstudiosPage.Instance.onDownloadData(id);

  }



  //#endregion

}
