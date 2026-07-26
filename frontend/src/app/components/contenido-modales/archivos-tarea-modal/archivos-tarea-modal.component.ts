import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

interface GrupoArchivos {
  momento: string | null;
  archivos: any[];
}

@Component({
  selector: 'app-archivos-tarea-modal',
  templateUrl: './archivos-tarea-modal.component.html',
  styleUrls: ['./archivos-tarea-modal.component.css']
})
export class ArchivosTareaModalComponent implements OnInit {

  @Output() cerrar = new EventEmitter<void>();
  @Input() tarea!: any;

  grupos: GrupoArchivos[] = [];
  totalArchivos: number = 0;

  ngOnInit(): void {
    // Agrupar los archivos subidos: por momento si la tarea tiene fases,
    // o un único grupo si no las tiene
    if (this.tarea?.tieneMomentos && this.tarea.momentos) {
      this.grupos = Object.keys(this.tarea.momentos).map(nombreMomento => ({
        momento: nombreMomento,
        archivos: this.tarea.momentos[nombreMomento]?.archivosSubidos || []
      }));
    } else {
      this.grupos = [{
        momento: null,
        archivos: this.tarea?.archivosSubidos || []
      }];
    }

    this.totalArchivos = this.grupos.reduce((total, g) => total + g.archivos.length, 0);
  }

  cerrarModal() {
    this.cerrar.emit();
  }

  verArchivo(url: string) {
    window.open(url, '_blank');
  }

  esImagen(archivo: any): boolean {
    return (archivo?.tipo || '').startsWith('image/');
  }

  esAudio(archivo: any): boolean {
    return (archivo?.tipo || '').startsWith('audio/');
  }

  esJson(archivo: any): boolean {
    return (archivo?.tipo || '') === 'application/json';
  }

  iconoArchivo(archivo: any): string {
    if (this.esJson(archivo)) return 'bi-filetype-json icono-json';
    if (this.esImagen(archivo)) return 'bi-image icono-imagen';
    if (this.esAudio(archivo)) return 'bi-music-note-beamed icono-audio';
    return 'bi-file-earmark icono-otro';
  }

  categoriaArchivo(archivo: any): string {
    if (this.esJson(archivo)) return 'JSON';
    if (this.esImagen(archivo)) return 'Imagen';
    if (this.esAudio(archivo)) return 'Audio';
    return archivo?.tipo || 'Archivo';
  }

}
