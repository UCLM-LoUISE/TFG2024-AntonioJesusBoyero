import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';

type TituloAlignment = 'start' | 'center' | 'end';
type TituloSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'app-titulo',
  templateUrl: './titulo.component.html',
  styleUrls: ['./titulo.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TituloComponent {
  @Input() text = '';
  @Input() subtitle?: string;
  @Input() alignment: TituloAlignment = 'start';
  @Input() color?: string;
  @Input() size: TituloSize = 'medium';
  @Input() uppercase = false;

  @HostBinding('class')
  get hostClasses(): string {
    return `titulo-component align-${this.alignment}`;
  }

  get titleClasses(): string[] {
    const classes = ['titulo', `titulo--${this.size}`];
    if (this.uppercase) {
      classes.push('titulo--uppercase');
    }
    if (this.subtitle) {
      classes.push('titulo--with-subtitle');
    }
    return classes;
  }
}
