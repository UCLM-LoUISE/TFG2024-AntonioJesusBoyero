import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { estudiosTableHeaders, estudiosTareasUsuarioTableHeaders } from 'src/app/config/estudios-table-config';
import { EstudioData } from 'src/app/data/estudios-data';
import { UserData } from 'src/app/data/user-data';
import { TipoModal } from 'src/app/enums/tipoModal-enum';
import { TableType } from 'src/app/enums/tipos-tablas';
import { estudiosTableRow } from 'src/app/interfaces/estudios-table-row';
import { AuthService } from 'src/app/services/auth.service';
import { BackService } from 'src/app/services/back.service';
import { LocalidadesService } from 'src/app/services/localidades.service';

declare var bootstrap: any;
declare var window: any;

@Component({
  selector: 'app-estudios',
  templateUrl: './estudios.page.html',
  styleUrls: ['./estudios.page.css'],
})
export class EstudiosPage implements OnInit {

  public static Instance: EstudiosPage;

  hayEstudios: boolean = false;
  estudios: any[] = [];
  estudiosPorTareasUsuario: any[] = [];
  emailUsuario: any;
  modoCalendario: boolean = true;
  loading: boolean = false; // Inicia como true para mostrar el skeleton
  pintoCalendario: boolean = false;
  pintoCalendarioTareas: boolean = false;
  diaSeleccionadoCalendario: any
  diaSeleccionadoCalendarioFormateado: any
  estudiosPorDia: boolean = true
  idEstudioAEliminar: any;
  modalMessage = '';

  //variables para la tabla
  tipoTabla: TableType = TableType.Estudios;
  taskTableHeaders = estudiosTableHeaders;
  taskTableData: estudiosTableRow[] = [];
  taskTableHeadersTareas = estudiosTareasUsuarioTableHeaders;
  taskTableDataTareas: estudiosTableRow[] = [];


  //variables para el filtro
  isFilterInvalid: boolean = false;
  showFilter: boolean = false;
  filterForm!: FormGroup;
  provinces: any[] = this.localidades.getProvinciasNuevo();
  municipalities: any[] = []; // Dependientes de la provincia seleccionada
  noResultadosAlFiltrar: boolean = false

  //variables para el modoEdicion
  editMode: boolean = false
  idEstudioEdit: any = ''

  //seleccion
  rolUser: any = ''
  opcionSeleccionada: string = 'estudios';
  verEstudioI: TipoModal = TipoModal.verEstudio

  //variables para ver el modal con la info del estudio
  puedoVerModalEstudio: boolean = false
  idEstudioView: any

  //variables para el modal de fusión de estudios y descargar sus datos en excel para exportarlos
  puedoVerModalFusion: boolean = false;
  idEstudioFusion: any;

  constructor(
    private router: Router,
    private backService: BackService,
    private localidades: LocalidadesService,
    private datePipe: DatePipe,
    private fb: FormBuilder,
    private auth: AuthService
  ) {
    EstudiosPage.Instance = this;
  }

  async ngOnInit(): Promise<void> {
    await this.inicializarVista();
  }


  async inicializarVista(): Promise<void> {
    if (UserData.getUserEmail()) {
      this.cargarEstudios(UserData.getUserEmail());
    }

    await this.auth.getUserData(UserData.getUserEmail());
    this.rolUser = UserData.getUserRol();

    if (this.rolUser == 'trabajador') {
      this.opcionSeleccionada = 'tareas';
      this.cargarTareasUsuario();
    }

    this.initFilterForm();
    this.cargarProvincias();
    EstudioData.reset();
  }


  // #region METODOS COMUNES

  cargarEstudios(email: string, fechaSeleccionada?: any, filtros?: any): void {
    this.loading = true;
    this.backService.obtenerEstudiosPorUsuario(email).then((observable) => {
      observable.subscribe({
        next: (response) => {
          this.estudios = response;
          this.pintoCalendario = true;
          console.log(this.estudios);

          // Mapeamos los estudios para obtener solo los datos necesarios para la tabla
          this.taskTableData = response.map((estudio: any) => ({
            nombreEstudio: estudio.data?.NuevoEstudioFormData?.nombre || '', // Nombre del estudio
            tipoEstudio: estudio.data?.NuevoEstudioFormData?.tipoSesion || '', // Tipo de estudio
            fechaInicio: this.datePipe.transform(
              estudio.data?.NuevoEstudioFormData?.fechaInicio || null,
              'dd/MM/yyyy'
            ), // Fecha de inicio
            estado: estudio.data?.NuevoEstudioFormData?.estado || '', // Estado del estudio
            provincia: estudio.data?.NuevoEstudioFormData?.provincia || '', // Provincia
            id: estudio.id, // ID del estudio para acciones
          }));
          if (filtros && this.tieneFiltrosValidos(filtros)) {
            this.filtrarEstudios(filtros);
          } else if (fechaSeleccionada) {
            this.filtrarEstudiosPorDia(fechaSeleccionada);
          }
        },
        error: (error) => {
          console.error('Error al obtener los estudios:', error);
          this.loading = false;
        },
        complete: () => {
          console.log('Obtención de estudios completada');
          setTimeout(() => {
            this.loading = false;
          }, 1000)
        },
      });
    });
  }

  async cargarTareasUsuario(fechaSeleccionada?: any, filtros?: any) {
    try {
      // Llamamos al método del servicio y nos suscribimos al Observable.
      (await this.backService.obtenerEstudiosPorTareasUsuario(UserData.getUserEmail())).subscribe({
        next: (response) => {
          this.estudiosPorTareasUsuario = response;
          this.pintoCalendarioTareas = true;
          console.log(this.estudios);

          // Mapeamos los estudios para obtener solo los datos necesarios para la tabla
          this.taskTableDataTareas = response.map((estudio: any) => ({
            nombreEstudio: estudio.data?.NuevoEstudioFormData?.nombre || '', // Nombre del estudio
            tipoEstudio: estudio.data?.NuevoEstudioFormData?.tipoSesion || '', // Tipo de estudio
            fechaInicio: this.datePipe.transform(
              estudio.data?.NuevoEstudioFormData?.fechaInicio || null,
              'dd/MM/yyyy'
            ), // Fecha de inicio
            estado: estudio.data?.NuevoEstudioFormData?.estado || '', // Estado del estudio
            provincia: estudio.data?.NuevoEstudioFormData?.provincia || '', // Provincia
            id: estudio.id, // ID del estudio para acciones
          }));
          if (filtros && this.tieneFiltrosValidos(filtros)) {
            this.filtrarEstudiosTareas(filtros);
          } else if (fechaSeleccionada) {
            this.filtrarEstudiosTareasPorDia(fechaSeleccionada);
          }
        },
        error: (error) => {
          console.error('Error al obtener los estudios:', error);
          this.loading = false;
        },
        complete: () => {
          console.log('Obtención de estudios completada');
          setTimeout(() => {
            this.loading = false;
          }, 1000)
        },
      });
    } catch (error) {
      console.error('Error en cargarTareasUsuario:', error);
    }
  }

  abrirNuevoEstudio() {
    this.router.navigate(['/nuevo-estudio'], { state: { mostrarModal: true } });
  }

  abrirNuevoEstudioConFecha(fecha: Date) {
    const formattedDate = fecha.toISOString().split('T')[0];
    this.router.navigate(
      ['/nuevo-estudio'],
      {
        queryParams: { fechaInicio: formattedDate },
        state: { mostrarModal: true }
      }
    );
  }

  editarEstudio(idEstudio: any) {
    this.editMode = true;
    this.idEstudioEdit = idEstudio;
    this.router.navigate(['/nuevo-estudio'], { queryParams: { id: idEstudio, editMode: true } });
  }

  async eliminarEstudio(id: any) {
    this.closeModal()
    console.log('ID a eliminar:', id);
    (await this.backService.eliminarEstudio(id)).subscribe({
      next: async (response) => {
        console.log('Estudio eliminado correctamente:', response);
        await this.cargarEstudios(UserData.getUserEmail(), this.diaSeleccionadoCalendario, this.filterForm.value);
      },
      error: (error) => {
        console.error('Error al eliminar el estudio:', error);
        // Aquí puedes manejar el error, como mostrar un mensaje de error en la UI
      },
    });
  }

  async verCalendario() {
    this.modoCalendario = true;
    await this.inicializarVista(); // TAREA-5 -> Siempre que volvemos al calendario recargamos los estudios y asi nos aseguramos de que se actualice la subida o bajada de tareas
  }

  closeModal() {
    const modalElement = document.getElementById('confirmModalEliminarEstudios');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }
  }

  showModal(id: any) {
    const estudio = this.estudios.find(e => e.id === id);
    this.idEstudioAEliminar = id; // Guarda el ID temporalmente
    const modalElement = document.getElementById('confirmModalEliminarEstudios');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement, {
        backdrop: 'static', // Esto evita que se cierre al hacer clic fuera
        keyboard: false // Esto evita que se cierre con la tecla "Escape"
      });
      if (estudio.data?.NuevoEstudioFormData?.estado == 'Sin empezar' || estudio.data?.NuevoEstudioFormData?.estado === 'Borrador') {
        this.modalMessage = '¿Deseas eliminar el estudio?';
      } else {
        this.modalMessage = `No se puede eliminar el estudio porque está "${estudio.data?.NuevoEstudioFormData?.estado}". Solo se pueden eliminar estudios que no hayan empezado.`;
      }
      modal.show();
    }
  }

  showModalEstudio() {
    setTimeout(() => {
      const modalElement = document.getElementById('verEstudio');
      if (modalElement) {
        var modal = new window.bootstrap.Modal(modalElement);
        modal.show();
      } else {
        console.error("No se encontró el elemento del modal en el DOM.");
      }
    }, 100);
  }


  closeModaEstudio() {
    const modalElement = document.getElementById('verEstudio');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }
    this.idEstudioView = null
    this.puedoVerModalEstudio = false
  }

  idConfiguracionEstudioModal: string = ''
  puedoVerModalConfiguracionEstudio: boolean = false

  showModalConfiguracionEstudio(id: string) {
    this.idConfiguracionEstudioModal = id;
    this.puedoVerModalConfiguracionEstudio = true;

    setTimeout(() => {
      const modalElement = document.getElementById('configuracionEstudio');
      if (modalElement) {
        modalElement.removeAttribute('inert');

        var modal = new window.bootstrap.Modal(modalElement, {
          backdrop: 'static',
          keyboard: false
        });

        // 🔥 Escuchar evento de cierre para limpiar el foco
        modalElement.addEventListener('hidden.bs.modal', () => {
          this.puedoVerModalConfiguracionEstudio = false; // 🔥 Destruir componente
          document.body.focus(); // 🔥 Mover el foco fuera del modal
        });

        modal.show();
      }
    }, 50);
  }




  closeModalConfiguracionEstudio() {
    const modalElement = document.getElementById('configuracionEstudio');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
        modalElement.setAttribute('inert', 'true');  // Bloquear el modal cuando está oculto
      }
    }
  }

  esUsuarioCreador(idEstudio: string): boolean {
    const estudio = this.estudios.find(est => est.id === idEstudio);
    if (!estudio || !estudio.email || !Array.isArray(estudio.email)) {
      return false;
    }
    return estudio.email[0] === UserData.getUserEmail(); // Verifica si el primer correo es el del usuario logueado
  }

  puedoDescargarDatosEstudio(idEstudio: string): boolean {
    const estudio = this.estudios.find(est => est.id === idEstudio);
    if (!estudio || !estudio.email || !Array.isArray(estudio.email)) {
      return false;
    }
    return estudio.data.subidaDatos.tengoDatosSubidos;
  }

  verEstudio(id: any) {
    console.log('id del estudio a ver', id);
    this.idEstudioView = id
    this.puedoVerModalEstudio = true
    this.showModalEstudio()
  }

  seleccionarOpcion(opcion: string): void {
    this.opcionSeleccionada = opcion;
    this.ocultarFiltro()
    this.resetFilters()
    if (this.opcionSeleccionada == 'tareas') {
      this.cargarTareasUsuario()
    }
  }

  // #endregion

  //#region FILTRO ESTUDIOS

  toggleFilter(): void {
    this.showFilter = !this.showFilter;
    this.isFilterInvalid = false
  }

  ocultarFiltro() {
    if (this.showFilter) {
      this.showFilter = false;
    }
  }


  initFilterForm() {
    this.filterForm = this.fb.group({
      fromDate: [''],
      toDate: [''],
      province: [''],
      municipality: [{ value: '', disabled: true }],
      status: [''],
      type: ['']

    });
  }

  private cargarProvincias(): void {
    this.provinces = this.localidades
      .getProvinciasNuevo()
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  onProvinciaChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const provinciaSeleccionada = selectElement.value;
    this.municipalities = this.localidades.getPoblacionesByProvinciaNuevo(
      provinciaSeleccionada
    );
    this.filterForm.get('municipality')?.enable();
  }

  applyFilters() {
    const filters = this.filterForm.value;
    const allEmpty = Object.values(filters).every(value => !value);

    if (allEmpty) {
      this.isFilterInvalid = true;
      return;
    }

    this.isFilterInvalid = false;
    console.log('Filtros aplicados:', filters);
    if (this.opcionSeleccionada == 'tareas') {
      this.filtrarEstudiosTareas(filters);
    } else {
      this.filtrarEstudios(filters);
    }
  }

  resetFilters() {
    this.initFilterForm();
    this.isFilterInvalid = false; // Restablecer el estado de error
    this.municipalities = [];
  }

  tieneFiltrosValidos(filtros: any): boolean {
    // Devuelve `true` si al menos un filtro tiene contenido
    return Object.values(filtros).some((valor) => valor !== null && valor !== '' && valor !== undefined);
  }

  filtrarEstudiosPorDia(dia: Date): void {
    this.ocultarFiltro()
    // Normaliza el día seleccionado (elimina la hora)
    const diaSeleccionado = new Date(
      dia.getFullYear(),
      dia.getMonth(),
      dia.getDate()
    )
      .toISOString()
      .split('T')[0]; // Formato YYYY-MM-DD

    // Filtramos los estudios basándonos en la fecha seleccionada
    this.taskTableData = this.estudios
      .filter((estudio) => {
        // Restamos un día a la fecha del estudio para compensar el desfase
        const fechaEstudio = new Date(estudio.data?.NuevoEstudioFormData?.fechaInicio);
        fechaEstudio.setDate(fechaEstudio.getDate() - 1); // Restamos un día
        const fechaEstudioNormalizada = fechaEstudio
          .toISOString()
          .split('T')[0]; // Formato YYYY-MM-DD

        // Comparamos ambas fechas normalizadas
        return fechaEstudioNormalizada === diaSeleccionado;
      })
      .map((estudio: any) => ({
        nombreEstudio: estudio.data?.NuevoEstudioFormData?.nombre,
        tipoEstudio: estudio.data?.NuevoEstudioFormData?.tipoSesion,
        fechaInicio:
          this.datePipe.transform(
            estudio.data?.NuevoEstudioFormData?.fechaInicio,
            'dd/MM/yyyy'
          ) || '', // Formato para la tabla
        estado: estudio.data?.NuevoEstudioFormData?.estado,
        provincia: estudio.data?.NuevoEstudioFormData?.provincia,
        poblacion: estudio.data?.NuevoEstudioFormData?.poblacion,
        id: estudio.id,
      }));

    // Actualizamos si hay estudios o no
    this.hayEstudios = true;
    this.estudiosPorDia = this.taskTableData.length > 0
  }

  filtrarEstudios(filters: any): void {
    this.loading = true;
    this.diaSeleccionadoCalendarioFormateado = undefined
    this.diaSeleccionadoCalendario = undefined
    const { fromDate, toDate, province, municipality, status, type } = filters;

    this.taskTableData = this.estudios.filter((estudio) => {
      const fechaInicioEstudio = new Date(estudio.data?.NuevoEstudioFormData.fechaInicio);
      const fechaInicio = fromDate ? new Date(fromDate) : null;
      const fechaFin = toDate ? new Date(toDate) : null;

      // Filtrado por rango de fechas
      const fechaValida =
        (!fechaInicio || fechaInicioEstudio >= fechaInicio) &&
        (!fechaFin || fechaInicioEstudio <= fechaFin);

      // Filtrado por provincia, municipio, estado y tipo
      const provinciaValida =
        !province || estudio.data?.NuevoEstudioFormData?.provincia === province;
      const municipioValido =
        !municipality || estudio.data?.NuevoEstudioFormData?.poblacion === municipality;
      const estadoValido =
        !status || estudio.data?.NuevoEstudioFormData?.estado === status;
      const tipoValido = !type || estudio.data?.NuevoEstudioFormData?.tipoSesion === type;

      // Devuelve true si todos los criterios son válidos
      return fechaValida && provinciaValida && municipioValido && estadoValido && tipoValido;
    });

    // Mapea los resultados para la tabla
    this.taskTableData = this.taskTableData.map((estudio: any) => ({
      nombreEstudio: estudio.data?.NuevoEstudioFormData?.nombre,
      tipoEstudio: estudio.data?.NuevoEstudioFormData?.tipoSesion,
      fechaInicio:
        this.datePipe.transform(
          estudio.data?.NuevoEstudioFormData?.fechaInicio,
          'dd/MM/yyyy'
        ) || '',
      estado: estudio.data?.NuevoEstudioFormData?.estado,
      provincia: estudio.data?.NuevoEstudioFormData?.provincia,
      poblacion: estudio.data?.NuevoEstudioFormData?.poblacion,
      id: estudio.id,
    }));
    // Actualiza el estado para la tabla
    // this.hayEstudios = this.taskTableData.length > 0;
    this.hayEstudios = true
    this.modoCalendario = false
    this.ocultarFiltro()
    console.log('Resultados del filtro:', this.taskTableData);
    setTimeout(() => {
      this.loading = false;
    }, 1000)
  }

  filtrarEstudiosTareasPorDia(dia: Date): void {
    this.ocultarFiltro()
    // Normaliza el día seleccionado (elimina la hora)
    const diaSeleccionado = new Date(
      dia.getFullYear(),
      dia.getMonth(),
      dia.getDate()
    )
      .toISOString()
      .split('T')[0]; // Formato YYYY-MM-DD

    // Filtramos los estudios basándonos en la fecha seleccionada
    this.taskTableDataTareas = this.estudiosPorTareasUsuario
      .filter((estudio) => {
        // Restamos un día a la fecha del estudio para compensar el desfase
        const fechaEstudio = new Date(estudio.data?.NuevoEstudioFormData?.fechaInicio);
        fechaEstudio.setDate(fechaEstudio.getDate() - 1); // Restamos un día
        const fechaEstudioNormalizada = fechaEstudio
          .toISOString()
          .split('T')[0]; // Formato YYYY-MM-DD

        // Comparamos ambas fechas normalizadas
        return fechaEstudioNormalizada === diaSeleccionado;
      })
      .map((estudio: any) => ({
        nombreEstudio: estudio.data?.NuevoEstudioFormData?.nombre,
        tipoEstudio: estudio.data?.NuevoEstudioFormData?.tipoSesion,
        fechaInicio:
          this.datePipe.transform(
            estudio.data?.NuevoEstudioFormData?.fechaInicio,
            'dd/MM/yyyy'
          ) || '', // Formato para la tabla
        estado: estudio.data?.NuevoEstudioFormData?.estado,
        provincia: estudio.data?.NuevoEstudioFormData?.provincia,
        poblacion: estudio.data?.NuevoEstudioFormData?.poblacion,
        id: estudio.id,
      }));

    // Actualizamos si hay estudios o no
    this.hayEstudios = true;
    this.estudiosPorDia = this.taskTableData.length > 0
  }

  filtrarEstudiosTareas(filters: any): void {
    this.loading = true;
    this.diaSeleccionadoCalendarioFormateado = undefined
    this.diaSeleccionadoCalendario = undefined
    const { fromDate, toDate, province, municipality, status, type } = filters;

    this.taskTableDataTareas = this.estudiosPorTareasUsuario.filter((estudio) => {
      const fechaInicioEstudio = new Date(estudio.data?.NuevoEstudioFormData.fechaInicio);
      const fechaInicio = fromDate ? new Date(fromDate) : null;
      const fechaFin = toDate ? new Date(toDate) : null;

      // Filtrado por rango de fechas
      const fechaValida =
        (!fechaInicio || fechaInicioEstudio >= fechaInicio) &&
        (!fechaFin || fechaInicioEstudio <= fechaFin);

      // Filtrado por provincia, municipio, estado y tipo
      const provinciaValida =
        !province || estudio.data?.NuevoEstudioFormData?.provincia === province;
      const municipioValido =
        !municipality || estudio.data?.NuevoEstudioFormData?.poblacion === municipality;
      const estadoValido =
        !status || estudio.data?.NuevoEstudioFormData?.estado === status;
      const tipoValido = !type || estudio.data?.NuevoEstudioFormData?.tipoSesion === type;

      // Devuelve true si todos los criterios son válidos
      return fechaValida && provinciaValida && municipioValido && estadoValido && tipoValido;
    });

    // Mapea los resultados para la tabla
    this.taskTableDataTareas = this.taskTableDataTareas.map((estudio: any) => ({
      nombreEstudio: estudio.data?.NuevoEstudioFormData?.nombre,
      tipoEstudio: estudio.data?.NuevoEstudioFormData?.tipoSesion,
      fechaInicio:
        this.datePipe.transform(
          estudio.data?.NuevoEstudioFormData?.fechaInicio,
          'dd/MM/yyyy'
        ) || '',
      estado: estudio.data?.NuevoEstudioFormData?.estado,
      provincia: estudio.data?.NuevoEstudioFormData?.provincia,
      poblacion: estudio.data?.NuevoEstudioFormData?.poblacion,
      id: estudio.id,
    }));
    // Actualiza el estado para la tabla
    // this.hayEstudios = this.taskTableData.length > 0;
    this.hayEstudios = true
    this.modoCalendario = false
    this.ocultarFiltro()
    console.log('Resultados del filtro:', this.taskTableData);
    setTimeout(() => {
      this.loading = false;
    }, 1000)
  }

  //#endregion

  // #region FUSION ESTUDIOS


  onDownloadData(idEstudio: string): void {
    this.idEstudioFusion = idEstudio;
    const estudio = this.estudios.find(est => est.id === idEstudio);
    if (!estudio) {
      return;
    }
    EstudioData.setEstudioFusionData(estudio);
    this.router.navigate(['/generar-datos-estudio']);
  }

  // #endregion

}





