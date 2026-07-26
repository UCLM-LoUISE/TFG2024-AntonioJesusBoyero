import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { ZonasEstudioMuestreosPage } from 'src/app/pages/zonas-estudio-muestreos/zonas-estudio-muestreos.page';

@Component({
  selector: 'app-eliminar-zona',
  templateUrl: './eliminar-zona.component.html',
  styleUrls: ['./eliminar-zona.component.css']
})
export class EliminarZonaComponent {

  onCancel(): void {
    ZonasEstudioMuestreosPage.instance.closeModalZonas();
  }

  onConfirmarEliminar(): void {
    ZonasEstudioMuestreosPage.instance.confirmarEliminarZona();
  }



}
