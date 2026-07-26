import { Component, Input } from '@angular/core';
import { FiguraResumen } from 'src/app/interfaces/figura-resumen';

@Component({
  selector: 'app-tree-node',
  template: `
    <ul *ngIf="figura.hijos.length > 0">
      <ng-container *ngFor="let hijo of figura.hijos">
        <li>
          {{ hijo.nombre }}
          <app-tree-node [figura]="hijo"></app-tree-node>
        </li>
      </ng-container>
    </ul>
  `,
})
export class TreeNodeComponent {
  @Input() figura!: FiguraResumen;
}
