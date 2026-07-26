import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ModalCrearTareasComponent } from 'src/app/components/modales/modal-crear-tareas/modal-crear-tareas.component';
import { taskTableHeaders } from 'src/app/config/gestion-tareas-table-config';
import { EstudioData } from 'src/app/data/estudios-data';
import { TableRow } from 'src/app/data/gestion-tareas-table-data-mock';
import { TableType } from 'src/app/enums/tipos-tablas';
import { ModalMode } from 'src/app/enums/modalMode';
import { BackService } from 'src/app/services/back.service';
import { EstadoEstudio, PasosEstudio } from 'src/app/enums/estados-estudios';
import { EstudiosPage } from '../estudios/estudios.page';
import { ZonasEstudioMuestreosPage } from '../zonas-estudio-muestreos/zonas-estudio-muestreos.page';
import { TipoModal } from 'src/app/enums/tipoModal-enum';

declare var bootstrap: any;
declare var window: any;

@Component({
  selector: 'app-gestion-tareas',
  templateUrl: './gestion-tareas.page.html',
  styleUrls: ['./gestion-tareas.page.css']
})
export class GestionTareasPage implements OnInit {

  //#region VARIABLES

  public static Instance: GestionTareasPage;

  hayTareas: boolean = false
  taskTableHeaders = taskTableHeaders;
  taskTableData: TableRow[] = [];
  tipoTabla: TableType = TableType.Tareas;

  nombreEstudio: any

  //variables para controlar el modo edicion
  editMode: boolean = EstudiosPage.Instance.editMode;
  idEstudio: any = EstudiosPage.Instance.idEstudioEdit;


  cargando: boolean = false

  eliminar: TipoModal = TipoModal.eliminarTarea
  idTareaEliminar: any

  //#endregion

  constructor(private router: Router, private backService: BackService, private afAuth: AngularFireAuth) { GestionTareasPage.Instance = this }

  ngOnInit(): void {
    // Cargar el nombre del estudio (si existe)
    const estudioData = EstudioData.getNuevoEstudioFormData();
    this.nombreEstudio = estudioData?.nombre || '';

    // Ocultar la columna Momentos si el estudio no tiene fases temporales
    if (!estudioData?.tieneMomentos) {
      this.taskTableHeaders = taskTableHeaders.filter(h => h.key !== 'momentosInfo');
    }

    if (this.editMode && this.idEstudio) {
      // Modo edición: cargar las tareas asociadas al estudio
      this.cargarTareasModoEdicion(this.idEstudio);
    } else {
      // Flujo normal: cargar tareas del buffer local
      this.cargarTareasDesdeBuffer();
    }
  }

  // Cargar tareas desde el buffer local
  private cargarTareasDesdeBuffer(): void {
    const tareasGuardadas = EstudioData.getTareasEstudioData();
    if (tareasGuardadas && tareasGuardadas.length > 0) {
      this.taskTableData = this.procesarTareasConMomentos(tareasGuardadas);
      this.hayTareas = true; // Indicar que hay tareas cargadas
    } else {
      this.hayTareas = false;
    }
  }

  // Cargar tareas asociadas al estudio en modo edición
  private cargarTareasModoEdicion(idEstudio: string): void {
    const estudioSeleccionado = EstudiosPage.Instance.estudios.find(
      (estudio) => estudio.id === idEstudio
    );

    if (!estudioSeleccionado) {
      console.error(`Estudio con ID ${idEstudio} no encontrado.`);
      this.hayTareas = false;
      return;
    }

    const tareasData = estudioSeleccionado.data?.TareasData;

    if (tareasData && tareasData.length > 0) {
      this.taskTableData = this.procesarTareasConMomentos(tareasData);
      this.hayTareas = true; // Indicar que hay tareas cargadas
    } else {
      console.log(`[GestionTareasPage] No se encontraron tareas asociadas al estudio con ID ${idEstudio}.`);
      this.hayTareas = false;
    }
  }

  // Procesar tareas para añadir información de momentos
  private procesarTareasConMomentos(tareas: any[]): any[] {
    const estudioData = EstudioData.getNuevoEstudioFormData();
    const momentosEstudio = estudioData?.momentos || [];
    const tieneMomentos = estudioData?.tieneMomentos || false;

    return tareas.map(tarea => {
      const tareaConInfo = { ...tarea };

      if (tieneMomentos && momentosEstudio.length > 0) {
        const tareaAny = tarea as any;

        if (tareaAny.tieneMomentos && tareaAny.momentos) {
          const momentosTarea = Object.keys(tareaAny.momentos);
          const cantidadMomentosTarea = momentosTarea.length;
          const cantidadMomentosEstudio = momentosEstudio.length;

          if (cantidadMomentosTarea === cantidadMomentosEstudio) {
            tareaConInfo.momentosInfo = 'Todos';
          } else if (cantidadMomentosTarea === 1) {
            tareaConInfo.momentosInfo = momentosTarea[0];
          } else {
            tareaConInfo.momentosInfo = `Parcial (${cantidadMomentosTarea}/${cantidadMomentosEstudio})`;
          }
        } else {
          tareaConInfo.momentosInfo = 'N/A';
        }
      } else {
        tareaConInfo.momentosInfo = '-';
      }

      return tareaConInfo;
    });
  }



  //#region COMÚN

  goBack() {
    this.router.navigate(['/zonas-estudio']);
  }

  async submit() {
    if (ZonasEstudioMuestreosPage.instance.cambioFigurasEnElMapa) {
      ZonasEstudioMuestreosPage.instance.showModalnoHasGuardado();
    } else {
      this.cargando = true
      // Obtener el idFormulario o id del estudio según el contexto
      const idFormulario = EstudioData.getNuevoEstudioFormData()?.idFormulario;
      const idEstudio = EstudiosPage.Instance.idEstudioEdit; // Solo si estás en modo edición

      if (!idFormulario && !idEstudio) {
        console.error("No se pudo obtener ni el idFormulario ni el id del estudio.");
        return;
      }

      try {
        // Llamar al nuevo método del backend para cambiar el estado
        const payload = {
          id: idEstudio || null,
          idFormulario: idFormulario || null,
          nuevoEstado: EstadoEstudio.SinEmpezar, // Cambiar al nuevo estado
        };

        const response = await firstValueFrom(
          await this.backService.cambiarEstadoEstudio(payload)
        );

        console.log("Estado del estudio actualizado:", response);
        EstudioData.reset(); // Reseteamos la info de los estudios
        setTimeout(() => {
          this.cargando = false; // Asegurarse de que dure al menos 1 segundo
          this.router.navigate(['/estudios']); // Redirigir a la lista de estudios
        }, 2000); // Esperar al menos 1 segundo para desactivar el estado de "cargando"
      } catch (error) {
        this.cargando = false
        console.error("Error al cambiar el estado del estudio:", error);
      }
    }
  }

  //#endregion

  //#region CONTROL TAREAS

  async eliminarTarea(id: string) {
    // Obtener la tarea a eliminar
    const tareaEliminada = this.taskTableData.find(task => task.id === id);

    // Si la tarea no existe, salir
    if (!tareaEliminada) {
      console.warn("No se encontró la tarea a eliminar.");
      return;
    }

    // Filtrar las tareas para eliminar la seleccionada
    this.taskTableData = this.taskTableData.filter(task => task.id !== id);

    // Actualizar el estado persistente en EstudioData
    EstudioData.setTareasEstudioData(this.taskTableData);

    // Si no hay tareas, actualizar la variable `hayTareas`
    this.hayTareas = this.taskTableData.length > 0;
    ZonasEstudioMuestreosPage.instance.verificarMarcadores()
    // Actualizar backend
    this.actualizarEstadoTareasEnElBackend(this.taskTableData);

    this.closeModalEliminarTareas();

    // 🔹 Llamar al método adecuado
    if (ZonasEstudioMuestreosPage.instance.drawnItems?.getLayers().length === 0) {
      console.log("No quedan zonas en el mapa. Guardando estado vacío.");
      ZonasEstudioMuestreosPage.instance.guardarZonasVacias();
    } else {
      ZonasEstudioMuestreosPage.instance.guardarZonas();
    }




  }

  public eliminarTareasPorZona(nombreZona: string): void {
    // Filtrar tareas para eliminar solo las que pertenecen a la zona
    this.taskTableData = this.taskTableData.filter(task => task.zona !== nombreZona);

    console.log(`Tareas de la zona "${nombreZona}" eliminadas.`);

    // Actualizar estado persistente en EstudioData
    EstudioData.setTareasEstudioData(this.taskTableData);

    // Si no hay tareas restantes, actualizar la bandera
    this.hayTareas = this.taskTableData.length > 0;

    // Actualizar backend con la nueva lista de tareas
    this.actualizarEstadoTareasEnElBackend(this.taskTableData);
  }

  public eliminarTodasLasTareas(): void {
    this.taskTableData = [];
    console.log(`🚨 Todas las tareas han sido eliminadas.`);
    EstudioData.setTareasEstudioData(this.taskTableData);
    this.hayTareas = false;
    this.actualizarEstadoTareasEnElBackend(this.taskTableData);
  }

  public existeTareaEnZona(nombreZona: string): boolean {
    return this.taskTableData.some(task => task.zona === nombreZona);
  }



  verTarea(id: string) {
    const task = this.taskTableData.find(t => t.id === id);
    if (task) {
      ModalCrearTareasComponent.Instance.setViewMode(task);
      this.showModal();
    }
  }

  editarTarea(id: string) {
    const task = this.taskTableData.find(t => t.id === id);
    if (task) {
      ModalCrearTareasComponent.Instance.setEditMode(task);
      this.showModal();
    }
  }

  openModeCreateTask() {
    ModalCrearTareasComponent.Instance.setCreateMode();
    this.showModal();
  }

  openModeCreateTaskLink() {
    ModalCrearTareasComponent.Instance.setCreateModeLink();
    this.showModal();
  }

  async crearOrActualizarTarea(data: any) {
    // Accede al estado actual del modo
    const mode = ModalCrearTareasComponent.Instance.mode;

    if (mode === ModalMode.Create) {
      // Modo de creación: añade una nueva tarea
      const nuevaTarea: any = {
        id: (this.taskTableData.length + 1).toString(),
        nombreTarea: data.taskName,
        trabajador: data.trabajador.filter((t: string) => t).join(", "), // Filtramos valores vacíos
        zona: data.zona,
        notas: data.notas || "",
        fecha: data.fecha || "",
        tipoTarea: data.tipoTarea
      };

      // Verificar si el estudio tiene momentos y se han seleccionado momentos para esta tarea
      if (data.tieneMomentos && data.momentos && data.momentos.length > 0) {
        // Crear estructura con momentos
        nuevaTarea.tieneMomentos = true;
        nuevaTarea.momentos = {};

        // Inicializar cada momento seleccionado
        data.momentos.forEach((momento: string) => {
          nuevaTarea.momentos[momento] = {
            status: "pending",
            assignedTo: data.trabajador.filter((t: string) => t).join(", "),
            archivosSubidos: [],
            fecha: data.fecha || ""
          };
        });
      }

      this.taskTableData = [...this.taskTableData, nuevaTarea];
      console.log("Tarea creada:", nuevaTarea);
    } else if (mode === ModalMode.Edit && ModalCrearTareasComponent.Instance.currentTask) {
      // Modo de edición: actualiza la tarea existente
      this.taskTableData = this.taskTableData.map(task => {
        if (task.id === ModalCrearTareasComponent.Instance.currentTask.id) {
          // Convertir a any para acceder a propiedades dinámicas
          const taskAny = task as any;

          // Actualiza los valores de la tarea actual con los datos nuevos
          const tareaActualizada: any = {
            ...task,
            nombreTarea: data.taskName,
            trabajador: data.trabajador.filter((t: string) => t).join(", "), // Filtramos valores vacíos
            zona: data.zona,
            notas: data.notas || "",
            fecha: data.fecha || "",
            tipoTarea: data.tipoTarea
          };

          // Actualizar momentos si existen
          if (data.tieneMomentos && data.momentos && data.momentos.length > 0) {
            tareaActualizada.tieneMomentos = true;
            tareaActualizada.momentos = {};

            data.momentos.forEach((momento: string) => {
              // Preservar datos existentes si el momento ya existía
              if (taskAny.momentos && taskAny.momentos[momento]) {
                tareaActualizada.momentos[momento] = {
                  ...taskAny.momentos[momento],
                  assignedTo: data.trabajador.filter((t: string) => t).join(", "),
                  fecha: data.fecha || ""
                };
              } else {
                // Crear nuevo momento
                tareaActualizada.momentos[momento] = {
                  status: "pending",
                  assignedTo: data.trabajador.filter((t: string) => t).join(", "),
                  archivosSubidos: [],
                  fecha: data.fecha || ""
                };
              }
            });
          }

          return tareaActualizada;
        }
        return task;
      });
      console.log("Tarea actualizada:", this.taskTableData);
    }

    // Reprocesar las tareas para actualizar la información de momentos en la tabla
    this.taskTableData = this.procesarTareasConMomentos(this.taskTableData);

    EstudioData.setTareasEstudioData(this.taskTableData)
    this.hayTareas = true;
    this.actualizarEstadoTareasEnElBackend(this.taskTableData)
    ZonasEstudioMuestreosPage.instance.guardarZonas();
  }

  //#endregion

  //#region CONTROL MODAL CREAR TAREAS

  showModal() {
    var modal = new window.bootstrap.Modal(document.getElementById('confirmModal'), {
      backdrop: 'static',  // Evita cerrar el modal haciendo clic fuera de él
      keyboard: false      // Evita cerrar el modal presionando la tecla Esc
    });
    modal.show();
  }


  closeModal() {
    const modalElement = document.getElementById('confirmModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }
  }


  showModalEliminarTareas(id: any) {
    this.idTareaEliminar = id; // Guarda el ID temporalmente
    var modal = new window.bootstrap.Modal(document.getElementById('eliminarTareasModal'), {
      backdrop: 'static',  // Evita cerrar el modal haciendo clic fuera de él
      keyboard: false      // Evita cerrar el modal presionando la tecla Esc
    });
    modal.show();
  }


  closeModalEliminarTareas() {
    const modalElement = document.getElementById('eliminarTareasModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }
  }

  async actualizarEstadoTareasEnElBackend(data: any) {
    try {
      // Enviar tarea al backend
      const user = await this.afAuth.currentUser;
      const email = user ? user.email : null;
      if (!email) {
        throw new Error("No se pudo obtener el email del usuario.");
      }

      const idFormulario = EstudioData.getNuevoEstudioFormData()?.idFormulario;

      if (!idFormulario) {
        throw new Error("No se pudo obtener el idFormulario.");
      }

      await firstValueFrom(
        await this.backService.crearEstudioPorPartesTareas(email, data, PasosEstudio.TAREAS, idFormulario)
      );
      this.actualizarEstadoLocal(idFormulario, data);
      console.log("Tarea enviada al backend:", data);
    } catch (error) {
      console.error("Error al enviar la tarea al backend:", error);
    }

  }


  private actualizarEstadoLocal(idFormulario: string, tareas: TableRow[]): void {
    console.log(idFormulario);
    const estudioSeleccionado = EstudiosPage.Instance.estudios.find(
      (estudio) => estudio.data?.NuevoEstudioFormData?.idFormulario === idFormulario
    );

    if (estudioSeleccionado) {
      estudioSeleccionado.data.TareasData = tareas; // Actualizamos las tareas en el estado local
      console.log(`[GestionTareasPage] Estado local actualizado para el formulario con ID ${idFormulario}:`, tareas);
    } else {
      console.warn(`[GestionTareasPage] No se encontró el estudio con idFormulario: ${idFormulario} para actualizar tareas.`);
    }
  }


  //#endregion

}
