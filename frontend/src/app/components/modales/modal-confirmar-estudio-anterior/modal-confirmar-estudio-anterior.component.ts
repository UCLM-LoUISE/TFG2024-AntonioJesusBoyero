import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal-confirmar-estudio-anterior',
  templateUrl: './modal-confirmar-estudio-anterior.component.html',
  styleUrls: ['./modal-confirmar-estudio-anterior.component.css']
})
export class ModalConfirmarEstudioAnteriorComponent{

  @Input() title: string = 'Confirmar';
  @Input() message: string = '¿Estás seguro de que deseas continuar?';
  @Input() confirmButtonText: string = 'Aceptar';
  @Input() cancelButtonText: string = 'Cancelar';
  @Input() showCancelButton: boolean = true;

  @Output() confirmAction = new EventEmitter<void>();
  @Output() cancelAction = new EventEmitter<void>();

  onConfirm() {
    this.confirmAction.emit();
  }

  onCancel() {
    this.cancelAction.emit();
  }
}
