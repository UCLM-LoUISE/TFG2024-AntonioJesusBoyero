import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-table-title',
  templateUrl: './table-title.component.html',
  styleUrls: ['./table-title.component.css']
})
export class TableTitleComponent {

  @Input() title: string = 'Título por defecto';
  @Input() buttonLabel: string = 'Nuevo';
  @Input() routerLink: string = '/'; // Ruta por defecto

  constructor() { }


}




