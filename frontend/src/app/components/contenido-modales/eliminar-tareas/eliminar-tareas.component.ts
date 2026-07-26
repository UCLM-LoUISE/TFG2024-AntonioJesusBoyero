import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-eliminar-tareas',
  templateUrl: './eliminar-tareas.component.html',
  styleUrls: ['./eliminar-tareas.component.css']
})
export class EliminarTareasComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  @Input() title: string = '';
  @Input() message: string = '';
  @Input() showCancelButton: boolean = true;
  @Input() cancelButtonText: string = 'Cancelar';
  @Input() confirmButtonText: string = 'Eliminar';
  @Input() studyId: any; // Agregamos el ID del estudio
  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirm(): void {
    this.confirm.emit();
  }

}
