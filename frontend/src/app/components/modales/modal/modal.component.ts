import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css']
})
export class ModalComponent {

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

  onConfirm() {
    this.confirmAction.emit();
  }

  onCancel() {
    this.cancelAction.emit();
  }
}
