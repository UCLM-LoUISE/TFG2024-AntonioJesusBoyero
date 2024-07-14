import { Component, OnInit } from '@angular/core';
import { TABLE_HEADERS, TableRow, MOCK_DATA } from './config/table-config';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css']
})
export class TableComponent implements OnInit {
  tableHeaders = TABLE_HEADERS;
  mockData: TableRow[] = MOCK_DATA;
  displayedData: TableRow[] = [];

  rowsPerPage: number = 4; // Número de filas por página
  currentPage: number = 1; // Página actual
  totalPages: number = 1; // Número total de páginas

  loading: boolean = false; // Estado de carga

  constructor() { }

  ngOnInit(): void {
    this.updatePagination();
  }

  onNewStudy(): void {
    console.log('Crear nuevo estudio');
    // Aquí puedes redirigir a un formulario de creación de nuevo estudio
  }

  //#region EVENTOS

  onView(id: number): void {
    console.log('Ver fila con ID:', id);
  }

  onEdit(id: number): void {
    console.log('Editar fila con ID:', id);
  }

  onDelete(id: number): void {
    console.log('Borrar fila con ID:', id);
  }

  //#endregion


  //#region PAGINACION

  updatePagination(): void {
    this.loading = true; // Mostrar spinner
    setTimeout(() => {
      this.totalPages = Math.ceil(this.mockData.length / this.rowsPerPage);
      this.displayedData = this.mockData.slice((this.currentPage - 1) * this.rowsPerPage, this.currentPage * this.rowsPerPage);
      this.loading = false; // Ocultar spinner
    }, 500); // Simular un retardo de carga
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  //#endregion
}
