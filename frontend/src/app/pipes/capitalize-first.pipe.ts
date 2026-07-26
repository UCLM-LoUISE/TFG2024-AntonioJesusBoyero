import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'capitalizeFirst'
})
export class CapitalizeFirstPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    return value.replace(/\b\w/g, char => char.toUpperCase());
  }
}
