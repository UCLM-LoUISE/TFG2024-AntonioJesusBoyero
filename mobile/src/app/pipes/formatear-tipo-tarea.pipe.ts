// src/app/pipes/formatear-tipo-tarea.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatearTipoTarea'
})
export class FormatearTipoTareaPipe implements PipeTransform {
  transform(value: string): string {
    switch (value) {
      case 'medicion_arboles':
        return 'Medición de arbolado';
      case 'medicion_sotobosque':
        return 'Medición del sotobosque';
      default:
        return value;
    }
  }
}
