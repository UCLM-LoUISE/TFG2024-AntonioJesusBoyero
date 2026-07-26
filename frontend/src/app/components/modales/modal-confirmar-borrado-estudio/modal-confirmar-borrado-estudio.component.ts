import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal-confirmar-borrado-estudio',
  templateUrl: './modal-confirmar-borrado-estudio.component.html',
  styleUrls: ['./modal-confirmar-borrado-estudio.component.css']
})
export class ModalConfirmarBorradoEstudioComponent   {

  @Input() title: string = 'Confirmar';
  @Input() message: string = '¿Estás seguro de que deseas continuar?';
  @Input() confirmButtonText: string = 'Aceptar';
  @Input() cancelButtonText: string = 'Cancelar';
  @Input() showCancelButton: boolean = true;

  @Input() studyId: any; // Agregamos el ID del estudio

  @Output() confirmAction = new EventEmitter<any>(); // Cambiamos el tipo para emitir el ID
  @Output() cancelAction = new EventEmitter<void>();

  onConfirm() {
    this.confirmAction.emit(this.studyId); // Emitimos el ID al confirmar
  }

  onCancel() {
    this.cancelAction.emit();
  }
}
