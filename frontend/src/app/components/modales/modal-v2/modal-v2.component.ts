import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TipoModal } from 'src/app/enums/tipoModal-enum';
import { GestionTareasPage } from 'src/app/pages/gestion-tareas/gestion-tareas.page';

@Component({
  selector: 'app-modal-v2',
  templateUrl: './modal-v2.component.html',
  styleUrls: ['./modal-v2.component.css']
})
export class ModalV2Component {


  @Input() tipoModal: TipoModal | undefined;

  @Input() title: string = 'Confirmar';
  @Input() message: string = '¿Estás seguro de que deseas continuar?';
  @Input() confirmButtonText: string = 'Aceptar';
  @Input() cancelButtonText: string = 'Cancelar';

  // Nuevo input para controlar si se muestra el botón de cancelar
  @Input() showCancelButton: boolean = true;

  // Clase opcional para el botón de confirmar (rojo por defecto)
  @Input() confirmButtonClass: string = 'btn-danger'; // por defecto rojo

  @Output() confirmAction = new EventEmitter<void>();
  @Output() cancelAction = new EventEmitter<void>();


  noHayFiguras: TipoModal = TipoModal.noHasIntroducidoFiguras
  nombre: TipoModal = TipoModal.introducirNombre
  noHasGuardado: TipoModal = TipoModal.noHasGuardado
  eliminar: TipoModal = TipoModal.eliminarTarea
  ver: TipoModal = TipoModal.verEstudio
  eliminarZona: TipoModal = TipoModal.eliminarZona



  idTareaEliminar: any =  GestionTareasPage.Instance.idTareaEliminar


  onConfirm() {
    this.confirmAction.emit();
  }

  onCancel() {
    this.cancelAction.emit();
  }


  eliminarTarea(){
    GestionTareasPage.Instance.eliminarTarea(GestionTareasPage.Instance.idTareaEliminar)
  }

  closeModalEliminarTarea(){
    GestionTareasPage.Instance.closeModalEliminarTareas()
  }

}
