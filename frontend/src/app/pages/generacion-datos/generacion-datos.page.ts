import { BackService } from 'src/app/services/back.service';
import { Component, OnInit } from '@angular/core';
import { EstudiosPage } from '../estudios/estudios.page';
import { EstudioData } from 'src/app/data/estudios-data';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';

declare var bootstrap: any;
declare var window: any;

@Component({
  selector: 'app-generacion-datos',
  templateUrl: './generacion-datos.page.html',
  styleUrls: ['./generacion-datos.page.css']
})
export class GeneracionDatosPage implements OnInit {

  public static Instance: GeneracionDatosPage;

  idEstudio: any;
  estudio: any;
  mostrarInfo: boolean = true;
  tareas: any

  // Modal fusion
  puedoVerModalFusion: boolean = false;
  tareaSeleccionadaFusion: any;

  // Modal mapa
  puedoVerModalMapa: boolean = false;
  tareaSeleccionadaMapa: any;

  // Modal archivos subidos
  puedoVerModalArchivos: boolean = false;
  tareaSeleccionadaArchivos: any;



  constructor(private router: Router, private backService: BackService) { GeneracionDatosPage.Instance = this; }

  ngOnInit(): void {
    //recupero el id del estudio desde el singleton de estudios
    if (EstudiosPage.Instance.idEstudioFusion) {
      this.idEstudio = EstudiosPage.Instance.idEstudioFusion;
    }

    //recupero toda la informacion del estudio
    if (EstudioData.getEstudioFusionData()) {
      this.estudio = EstudioData.getEstudioFusionData();
    }

    this.tareas = this.estudio?.data?.TareasData || [];

    console.log(this.idEstudio);
    console.log(this.estudio);
    console.log(this.tareas);

  }

  goBack() {
    this.router.navigate(['/estudios']);
  }

  // #region TABLA

  fusionarArchivos(tarea: any) {
    console.log('Fusionando archivos de la tarea:', tarea);
    this.tareaSeleccionadaFusion = tarea;
    this.puedoVerModalFusion = true;
    this.showModalFusion();
  }

  esFusionable(tarea: any): boolean {
    // 🆕 Si la tarea tiene momentos, verificar si algún momento tiene múltiples JSONs
    if (tarea.tieneMomentos && tarea.momentos) {
      return Object.keys(tarea.momentos).some(nombreMomento => {
        const archivos = tarea.momentos[nombreMomento]?.archivosSubidos || [];
        const archivosJSON = archivos.filter((a: any) => a.tipo === 'application/json');
        return archivosJSON.length > 1;
      });
    }

    // Lógica original para tareas SIN momentos
    if (!Array.isArray(tarea.archivosSubidos)) return false;
    const archivosJSON = tarea.archivosSubidos.filter((a: { tipo: string; }) => a.tipo === 'application/json');
    return archivosJSON.length > 1;
  }

  guardarFusionTarea(evento: { idTarea: string, contenido: any, momento?: string }) {
    const tarea = this.tareas.find((t: any) => t.id === evento.idTarea);
    if (!tarea) {
      console.warn('⚠️ No se encontró la tarea con ID:', evento.idTarea);
      return;
    }

    // 🆕 Si la tarea tiene momentos, guardar fusión SOLO para ese momento
    if (tarea.tieneMomentos && tarea.momentos && evento.momento) {
      if (!tarea.momentos[evento.momento]) {
        console.error(`❌ El momento "${evento.momento}" no existe en la tarea`);
        return;
      }
      // Marcar este momento como fusionado y guardar los datos fusionados
      tarea.momentos[evento.momento].fusionado = true;
      tarea.momentos[evento.momento].fusion = evento.contenido;
      console.log(`✅ Fusión guardada para el momento "${evento.momento}":`, tarea.momentos[evento.momento]);
    } else {
      // Lógica original para tareas SIN momentos
      tarea.fusionada = true;
      tarea.fusion = evento.contenido;
      console.log('✅ Fusión guardada en la tarea:', tarea);
    }

    // El modal gestiona su propio cierre: permanece abierto mientras queden
    // momentos por fusionar y se cierra solo al completar todo el proceso.
  }


  verTarea(tarea: any) {
    console.log('Visualizando datos subidos de la tarea:', tarea);
    this.tareaSeleccionadaMapa = tarea;
    this.puedoVerModalMapa = true
    this.showModalMapa();

    // Aquí podrías navegar a un nuevo componente o abrir un modal
  }

  puedeVerTarea(tarea: any): boolean {
    // 🆕 Si la tarea tiene momentos, verificar cada momento
    if (tarea.tieneMomentos && tarea.momentos) {
      // ⛔ Si hay conflictos sin fusionar, NO permitir ver
      const hayConflictosSinFusionar = Object.keys(tarea.momentos).some(nombreMomento => {
        const momento = tarea.momentos[nombreMomento];
        const archivosJSON = momento.archivosSubidos?.filter((a: any) => a.tipo === 'application/json') || [];
        // Hay conflicto si tiene más de 1 JSON y NO está fusionado
        return archivosJSON.length > 1 && !momento.fusionado;
      });

      if (hayConflictosSinFusionar) {
        return false; // NO permitir ver hasta que se fusionen todos los conflictos
      }

      // Verificar si al menos un momento tiene archivos JSON subidos
      const algunMomentoTieneJSON = Object.keys(tarea.momentos).some(momento => {
        const archivos = tarea.momentos[momento]?.archivosSubidos || [];
        return archivos.some((a: any) => a.tipo === 'application/json');
      });
      return algunMomentoTieneJSON;
    }

    // Lógica original para tareas SIN momentos
    if (!Array.isArray(tarea.archivosSubidos)) return false;
    const archivosJSON = tarea.archivosSubidos.filter((a: { tipo: string; }) => a.tipo === 'application/json');

    // Si hay archivos JSON:
    if (archivosJSON.length > 0) {
      // Si es fusionable, solo se puede ver si ya fue fusionada
      if (this.esFusionable(tarea)) {
        return tarea.fusionada === true;
      }
      // Si no es fusionable, se puede ver directamente
      return true;
    }

    // No hay JSONs → no se puede ver
    return false;
  }



  /** Estado visual de la tarea para la tabla */
  estadoTarea(tarea: any): 'lista' | 'pendiente' | 'sin-datos' {
    if (this.puedeVerTarea(tarea)) return 'lista';
    if (this.esFusionable(tarea)) return 'pendiente';
    return 'sin-datos';
  }

  /** Número de conflictos (momentos o tarea) aún sin fusionar */
  conflictosPendientes(tarea: any): number {
    if (tarea.tieneMomentos && tarea.momentos) {
      return Object.keys(tarea.momentos).filter(nombreMomento => {
        const momento = tarea.momentos[nombreMomento];
        const archivosJSON = momento.archivosSubidos?.filter((a: any) => a.tipo === 'application/json') || [];
        return archivosJSON.length > 1 && !momento.fusionado;
      }).length;
    }
    return this.esFusionable(tarea) && tarea.fusionada !== true ? 1 : 0;
  }

  /** Formatea el tipo de tarea para mostrarlo legible */
  formatoTipo(tipo: string): string {
    return (tipo || '').replace(/_/g, ' ');
  }

  /** Indica si la tarea tiene algún archivo subido (de cualquier tipo) */
  tieneArchivos(tarea: any): boolean {
    if (tarea.tieneMomentos && tarea.momentos) {
      return Object.keys(tarea.momentos).some(nombreMomento =>
        (tarea.momentos[nombreMomento]?.archivosSubidos || []).length > 0
      );
    }
    return Array.isArray(tarea.archivosSubidos) && tarea.archivosSubidos.length > 0;
  }

  verArchivosTarea(tarea: any) {
    console.log('Visualizando archivos subidos de la tarea:', tarea);
    this.tareaSeleccionadaArchivos = tarea;
    this.puedoVerModalArchivos = true;
    this.showModalArchivos();
  }

  // #endregion


  // #region MODAL

  showModalFusion() {
    setTimeout(() => {
      const modalElement = document.getElementById('fusionTareas');
      if (modalElement) {
        var modal = new window.bootstrap.Modal(modalElement);
        modal.show();
      } else {
        console.error("No se encontró el elemento del modal en el DOM.");
      }
    }, 100);
  }


  closeModalFusion() {
    const modalElement = document.getElementById('fusionTareas');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }
    this.puedoVerModalFusion = false
  }


  showModalMapa() {
    setTimeout(() => {
      const modalElement = document.getElementById('verMapaFusion');
      if (modalElement) {
        var modal = new window.bootstrap.Modal(modalElement);
        modal.show();
      } else {
        console.error("No se encontró el elemento del modal en el DOM.");
      }
    }, 100);
  }


  closeModalMapa() {
    const modalElement = document.getElementById('verMapaFusion');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }
    this.puedoVerModalMapa = false
  }


  showModalArchivos() {
    setTimeout(() => {
      const modalElement = document.getElementById('archivosTarea');
      if (modalElement) {
        var modal = new window.bootstrap.Modal(modalElement);
        modal.show();
      } else {
        console.error("No se encontró el elemento del modal en el DOM.");
      }
    }, 100);
  }


  closeModalArchivos() {
    const modalElement = document.getElementById('archivosTarea');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }
    this.puedoVerModalArchivos = false;
  }


  // #endregion

  // #region EXCEL


  puedeGenerarExcel(): boolean {
    return this.tareas.every((tarea: any) => {
      // 🆕 Para tareas con momentos, verificar que todos los momentos con conflictos estén fusionados
      if (tarea.tieneMomentos && tarea.momentos) {
        return Object.keys(tarea.momentos).every(nombreMomento => {
          const momento = tarea.momentos[nombreMomento];
          const archivosJSON = momento.archivosSubidos?.filter((a: any) => a.tipo === 'application/json') || [];
          // Si tiene más de 1 JSON, debe estar fusionado
          return archivosJSON.length <= 1 || momento.fusionado === true;
        });
      }

      // Lógica original para tareas SIN momentos
      const esFusionable = this.esFusionable(tarea);
      // Si no es fusionable, está lista. Si es fusionable, debe estar fusionada.
      return !esFusionable || tarea.fusionada === true;
    });
  }




  async generarExcel(): Promise<void> {
    console.log('Generando Excel con los datos de las tareas:', this.tareas);

    const workbook: XLSX.WorkBook = XLSX.utils.book_new();

    for (const tarea of this.tareas) {
      let datosCombinados: any[] = [];

      // 🆕 Si la tarea tiene momentos, combinar datos de todos los momentos
      if (tarea.tieneMomentos && tarea.momentos) {
        for (const nombreMomento of Object.keys(tarea.momentos)) {
          const momento = tarea.momentos[nombreMomento];

          // 🆕 Si este momento está fusionado, usar datos fusionados
          if (momento.fusionado && momento.fusion?.datos) {
            let datos = momento.fusion.datos;
            // Cada fila ya tiene nombreUsuario incrustado desde la fusión
            datos = datos.map((d: any) => ({ ...d, momento: nombreMomento }));
            datosCombinados.push(...datos);
          } else {
            // Usar datos originales del archivo JSON
            const archivoJSON = momento.archivosSubidos?.find((a: any) => a.tipo === 'application/json');

            if (archivoJSON) {
              try {
                const json = await this.backService.leerArchivoTarea(this.idEstudio, tarea.id, archivoJSON.nombre, nombreMomento);
                let datos = json?.contenido?.datos || [];
                const nombreUsuario = json?.contenido?.nombreUsuario || '';
                datos = datos.map((d: any) => ({ ...d, momento: nombreMomento, nombreUsuario }));
                datosCombinados.push(...datos);
              } catch (error) {
                console.error(`❌ Error al leer archivo del momento ${nombreMomento}:`, error);
              }
            }
          }
        }
      } else if (tarea.fusionada && tarea.fusion?.datos) {
        // Cada fila ya tiene nombreUsuario incrustado desde la fusión
        datosCombinados = tarea.fusion.datos;
      } else {
        const archivo = tarea.archivosSubidos.find((a: any) => a.tipo === 'application/json');
        if (!archivo) {
          console.warn(`⚠️ Tarea sin archivo JSON: ${tarea.nombreTarea}`);
          continue;
        }

        try {
          const json = await this.backService.leerArchivoTarea(this.idEstudio, tarea.id, archivo.nombre);
          const nombreUsuario = json?.contenido?.nombreUsuario || '';
          datosCombinados = (json?.contenido?.datos || []).map((d: any) => ({ ...d, nombreUsuario }));
        } catch (error) {
          console.error(`❌ Error al leer archivo de la tarea ${tarea.nombreTarea}:`, error);
          continue;
        }
      }

      if (datosCombinados.length > 0) {
        // 🆕 Expandir ocurrencias si es sotobosque
        datosCombinados = this.expandirOcurrencias(datosCombinados);
        const columnas = this.obtenerColumnas(datosCombinados, tarea, tarea.tieneMomentos); // ← pasamos tieneMomentos
        const tabla = datosCombinados.map((d: any) => this.ordenarObjetoPorColumnas(d, columnas, tarea.tieneMomentos, tarea.tipoTarea));

        // ➕ Añadir estadísticas
        const estadisticas = this.calcularEstadisticas(datosCombinados, columnas, tarea.tipoTarea);
        const filaEspecies = {
          Nombre: `Especies distintas: ${this.contarEspeciesUnicas(datosCombinados)}`,
          Tipo: '',
        };

        tabla.push(estadisticas, filaEspecies);

        // 📄 Crear hoja y añadirla
        const hoja = XLSX.utils.json_to_sheet(tabla);
        XLSX.utils.book_append_sheet(workbook, hoja, tarea.nombreTarea.slice(0, 31));
      }
    }

    const nombreEstudio = this.estudio?.data?.NuevoEstudioFormData?.nombre || 'Estudio';
    const poblacion = this.estudio?.data?.NuevoEstudioFormData?.poblacion || 'SinPoblacion';
    const nombreArchivo = `${nombreEstudio}_${poblacion}.xlsx`.replace(/\s+/g, '_');

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  obtenerColumnas(datos: any[], tarea: any, tieneMomentos: boolean = false): string[] {
    const primerItem = datos?.[0]?.datos || {};
    if (!tarea || !tarea.tipoTarea) return Object.keys(primerItem);

    let columnas: string[] = [];
    switch (tarea.tipoTarea) {
      case 'medicion_arboles':
        columnas = ['especie', 'dn', 'ht', 'hs', 'hv', 'dc1', 'dc2', 'superficieCopa', 'edad', 'notas', 'usuario'];
        break;
      case 'medicion_sotobosque':
        columnas = ['especie', 'longitud', 'altura', 'porcionVerde', 'porcionSeca', 'total', 'notas', 'usuario'];
        break;
      default:
        columnas = Object.keys(primerItem);
    }

    // 🆕 Agregar columna Momento al FINAL si la tarea tiene momentos
    if (tieneMomentos) {
      columnas.push('momento'); // Agregar al final
    }

    return columnas;
  }



  // obtenerColumnas(datos: any[]): string[] {
  //   const columnas = new Set<string>();
  //   datos.forEach(d => Object.keys(d.datos || {}).forEach(key => columnas.add(key)));
  //   return Array.from(columnas);
  // }

  ordenarObjetoPorColumnas(obj: any, columnas: string[], tieneMomentos: boolean = false, tipoTarea?: string) {
    const resultado: any = {
      Nombre: obj.nombre,
      Tipo: obj.tipo,
    };
    columnas.forEach(col => {
      const colNombre = this.renombrarColumna(col, tipoTarea);
      if (col === 'momento') {
        resultado['Momento'] = obj.momento ?? '';
      } else if (col === 'usuario') {
        resultado[colNombre] = obj.nombreUsuario ?? '';
      } else {
        resultado[colNombre] = obj.datos?.[col] ?? '';
      }
    });
    return resultado;
  }

  private calcularEstadisticas(datos: any[], columnas: string[], tipoTarea?: string): any {
    const estadisticas: any = {
      Nombre: 'Media',
      Tipo: '',
    };

    columnas.forEach(col => {
      const colNombre = this.renombrarColumna(col, tipoTarea);
      if (col === 'momento') {
        estadisticas['Momento'] = '-';
        return;
      }
      if (col === 'usuario') {
        estadisticas[colNombre] = '-';
        return;
      }
      const valores = datos
        .map(d => parseFloat(d.datos?.[col]))
        .filter(v => !isNaN(v));

      const media =
        valores.length > 0
          ? (valores.reduce((sum, val) => sum + val, 0) / valores.length).toFixed(2)
          : '-';

      estadisticas[colNombre] = media;
    });

    return estadisticas;
  }

  private renombrarColumna(col: string, tipoTarea?: string): string {
    if (tipoTarea === 'medicion_arboles') {
      const mapa: { [key: string]: string } = {
        'especie': 'Especie',
        'dn': 'Dn (cm)',
        'ht': 'Ht (m)',
        'hs': 'Hs (m)',
        'hv': 'Hv (m)',
        'dc1': 'Dc1 (m)',
        'dc2': 'Dc2 (m)',
        'superficieCopa': 'Sc (m²)',
        'edad': 'Edad',
        'notas': 'Notas',
        'usuario': 'Usuario'
      };
      return mapa[col] || (col.charAt(0).toUpperCase() + col.slice(1));
    } else if (tipoTarea === 'medicion_sotobosque') {
      const mapa: { [key: string]: string } = {
        'especie': 'Especie',
        'longitud': 'Longitud intercepción (cm)',
        'altura': 'Altura total (cm)',
        'porcionVerde': 'Altura verde (cm)',
        'porcionSeca': 'Altura seca (cm)',
        'total': 'Total',
        'notas': 'Notas',
        'usuario': 'Usuario'
      };
      return mapa[col] || (col.charAt(0).toUpperCase() + col.slice(1));
    }
    return col === 'momento' ? 'Momento' : (col.charAt(0).toUpperCase() + col.slice(1));
  }

  private contarEspeciesUnicas(datos: any[]): number {
    const especies = new Set(datos.map(d => d.datos?.especie?.toLowerCase()?.trim()).filter(Boolean));
    return especies.size;
  }

  /**
   * 🆕 Expande las ocurrencias de sotobosque en filas individuales para el Excel
   */
  private expandirOcurrencias(datos: any[]): any[] {
    const resultado: any[] = [];

    datos.forEach(item => {
      // Si tiene ocurrencias (sotobosque nuevo formato)
      if (item.ocurrencias && Array.isArray(item.ocurrencias)) {
        item.ocurrencias.forEach((ocurrencia: any, index: number) => {
          resultado.push({
            nombre: `${item.nombre}-${ocurrencia.id || index + 1}`,
            tipo: item.tipo,
            momento: item.momento,
            nombreUsuario: item.nombreUsuario ?? '',
            datos: {
              especie: ocurrencia.especie,
              longitud: ocurrencia.longitud,
              altura: ocurrencia.altura,
              porcionVerde: ocurrencia.porcionVerde,
              porcionSeca: ocurrencia.porcionSeca,
              total: ocurrencia.total,
              notas: ocurrencia.notas
            }
          });
        });
      } else {
        // Formato antiguo (arboles o sotobosque viejo)
        resultado.push(item);
      }
    });

    return resultado;
  }

  // #endregion

}
