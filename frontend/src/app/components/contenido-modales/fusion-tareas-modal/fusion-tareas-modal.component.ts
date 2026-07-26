import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { BackService } from 'src/app/services/back.service';

@Component({
  selector: 'app-fusion-tareas-modal',
  templateUrl: './fusion-tareas-modal.component.html',
  styleUrls: ['./fusion-tareas-modal.component.css']
})
export class FusionTareasModalComponent implements OnInit {

  @Output() cerrar = new EventEmitter<void>();
  @Output() fusionTerminada = new EventEmitter<any>(); // mandaremos el archivo fusionado al componente padre para que lo pueda mostrar
  @Input() tarea!: any;
  @Input() idEstudio!: any;

  archivoPrincipalSeleccionado: any = null;
  momentoSeleccionado: string | null = null; // 🆕 Momento seleccionado para fusionar
  momentosConConflictos: string[] = []; // 🆕 Lista de momentos que tienen múltiples JSONs

  // Estado del proceso de fusión por fases
  cargando: boolean = false;
  errorMsg: string | null = null;
  mensajeExito: string | null = null;
  completado: boolean = false;


  constructor(private backService: BackService) { }

  ngOnInit(): void {
    // 🆕 Si la tarea tiene momentos, detectar cuáles tienen conflictos (múltiples JSONs)
    if (this.tarea.tieneMomentos && this.tarea.momentos) {
      this.momentosConConflictos = Object.keys(this.tarea.momentos).filter(nombreMomento => {
        const archivos = this.tarea.momentos[nombreMomento]?.archivosSubidos || [];
        const archivosJSON = archivos.filter((a: any) => a.tipo === 'application/json');
        return archivosJSON.length > 1;
      });

      // Pre-seleccionar el primer momento PENDIENTE (las fusiones ya hechas se conservan)
      const pendientes = this.momentosPendientes;
      if (pendientes.length > 0) {
        this.momentoSeleccionado = pendientes[0];
      } else if (this.momentosConConflictos.length > 0) {
        // Al reabrir el modal con todo ya fusionado, mostrar el estado completado
        this.completado = true;
      }
    } else if (this.tarea.fusionada === true) {
      // Tarea sin momentos que ya fue fusionada en esta sesión
      this.completado = true;
    }

    this.preseleccionarArchivoPrincipal();
  }

  /** Momentos con conflicto que todavía no se han fusionado */
  get momentosPendientes(): string[] {
    return this.momentosConConflictos.filter(m => !this.tarea.momentos?.[m]?.fusionado);
  }

  /** Momentos con conflicto ya fusionados */
  get momentosFusionados(): string[] {
    return this.momentosConConflictos.filter(m => this.tarea.momentos?.[m]?.fusionado);
  }

  get porcentajeProgreso(): number {
    if (this.momentosConConflictos.length === 0) return 0;
    return Math.round((this.momentosFusionados.length / this.momentosConConflictos.length) * 100);
  }

  cerrarModal() {
    this.cerrar.emit();
  }


  verArchivo(url: string) {
    window.open(url, '_blank');
  }

  get archivosFiltradosJSON() {
    // 🆕 Si la tarea tiene momentos, filtrar por momento seleccionado
    if (this.tarea.tieneMomentos && this.tarea.momentos && this.momentoSeleccionado) {
      const archivos = this.tarea.momentos[this.momentoSeleccionado]?.archivosSubidos || [];
      return archivos.filter((a: any) => a.tipo === 'application/json');
    }

    // Lógica original para tareas SIN momentos
    return this.tarea?.archivosSubidos?.filter((a: any) => a.tipo === 'application/json') || [];
  }

  /** Selecciona por defecto el primer archivo JSON como archivo general */
  preseleccionarArchivoPrincipal(): void {
    const archivos = this.archivosFiltradosJSON;
    this.archivoPrincipalSeleccionado = archivos.length > 0 ? archivos[0] : null;
  }

  /** Cambio de momento desde el selector */
  onMomentoChange(): void {
    this.errorMsg = null;
    this.mensajeExito = null;
    this.preseleccionarArchivoPrincipal();
  }

  /** Cambio de momento pulsando un chip (solo momentos pendientes) */
  seleccionarMomento(momento: string): void {
    if (this.cargando) return;
    if (this.tarea.momentos?.[momento]?.fusionado) return; // ya fusionado, no seleccionable
    this.momentoSeleccionado = momento;
    this.onMomentoChange();
  }


  async fusionarTareas() {
    this.errorMsg = null;
    this.mensajeExito = null;

    if (!this.archivoPrincipalSeleccionado) {
      this.errorMsg = 'Debes seleccionar un archivo general antes de fusionar.';
      return;
    }

    const archivosAFusionar = this.archivosFiltradosJSON;
    const momentoFusionado = this.momentoSeleccionado; // congelar el momento actual

    console.log('Archivos a fusionar (filtrados):', archivosAFusionar);
    console.log('Archivo principal seleccionado:', this.archivoPrincipalSeleccionado);

    this.cargando = true;

    try {
      const archivosJson = await Promise.all(
        archivosAFusionar.map(async (a: any) => {
          // 🆕 Incluir momento al leer archivos si la tarea tiene momentos
          const contenido = await this.backService.leerArchivoTarea(
            this.idEstudio,
            this.tarea.id,
            a.nombre,
            momentoFusionado // Pasar momento si existe
          );
          return {
            nombre: a.nombre,
            subidoPor: a.subidoPor, // preservar el usuario por archivo
            contenido
          };
        })
      );

      console.log('Contenido de los archivos leídos del backend:', archivosJson);

      const principal = archivosJson.find(a =>
        a.nombre === this.archivoPrincipalSeleccionado.nombre
      );

      console.log('Archivo principal encontrado en los JSON leídos:', principal);

      if (!principal || !principal.contenido) {
        this.errorMsg = 'No se pudo leer el archivo general seleccionado. Inténtalo de nuevo.';
        this.cargando = false;
        return;
      }

      // Incrustar nombreUsuario en cada fila según el archivo de origen
      const fusionados = archivosJson.flatMap(a =>
        (a.contenido.contenido.datos || []).map((d: any) => ({ ...d, nombreUsuario: a.subidoPor }))
      );

      // Extraer features de los mapas de los archivos que NO son el principal
      const mapaRestanteFeatures = archivosJson
        .filter(a => a.nombre !== this.archivoPrincipalSeleccionado.nombre)
        .flatMap(a => a.contenido.contenido.datos || []);


      console.log('Datos fusionados de todos los archivos:', fusionados);
      console.log('Datos del archivo principal:', principal);
      console.log('Features de los mapas restantes:', mapaRestanteFeatures);



      const jsonFinal = {
        mapa: principal.contenido.contenido.mapa,
        datos: fusionados,
        mapaRestante: mapaRestanteFeatures,
      };

      console.log('✅ JSON fusionado:', jsonFinal);

      // El padre guarda la fusión en la tarea (marca fusionado = true) pero NO cierra el modal
      this.fusionTerminada.emit({
        idTarea: this.tarea.id,
        contenido: jsonFinal,
        momento: momentoFusionado // 🆕 Incluir el momento fusionado
      });

      this.cargando = false;

      if (this.tarea.tieneMomentos && this.tarea.momentos) {
        const pendientes = this.momentosPendientes;

        if (pendientes.length > 0) {
          // Quedan momentos por fusionar: avanzar al siguiente sin cerrar el modal
          this.mensajeExito = `Momento "${momentoFusionado}" fusionado correctamente. Continúa con el siguiente.`;
          this.momentoSeleccionado = pendientes[0];
          this.preseleccionarArchivoPrincipal();
        } else {
          // Todas las fusiones completadas: mostrar pantalla de éxito
          // (el usuario cierra con el botón Cerrar)
          this.completado = true;
        }
      } else {
        // Tarea sin momentos: una única fusión y terminamos
        this.completado = true;
      }

    } catch (error) {
      console.error('❌ Error al fusionar archivos:', error);
      this.errorMsg = 'Ha ocurrido un error al fusionar los archivos. Inténtalo de nuevo.';
      this.cargando = false;
    }
  }

}
