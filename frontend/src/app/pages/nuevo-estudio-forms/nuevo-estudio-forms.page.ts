import { BackService } from 'src/app/services/back.service';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EstudioData } from 'src/app/data/estudios-data';
import { LocalidadesService } from 'src/app/services/localidades.service';
import { EstudiosPage } from '../estudios/estudios.page';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { firstValueFrom } from 'rxjs';
import { EstadoEstudio, PasosEstudio } from 'src/app/enums/estados-estudios';

declare var bootstrap: any;

@Component({
  selector: 'app-nuevo-estudio-forms',
  templateUrl: './nuevo-estudio-forms.page.html',
  styleUrls: ['./nuevo-estudio-forms.page.css'],
})

export class NuevoEstudioFormsPage implements OnInit {

  nuevoEstudioForm!: FormGroup;
  provincias: any[] = this.localidadesService.getProvinciasNuevo();
  poblaciones: any[] = [];

  //variables para controlar el modo edicion
  editMode: boolean = EstudiosPage.Instance.editMode;
  idEstudio: any = EstudiosPage.Instance.idEstudioEdit;

  hasSubmitted: boolean = false;

  // Variables para gestión de momentos temporales
  tieneMomentos: boolean = false;
  momentos: string[] = [];
  nuevoMomento: string = '';
  momentosOriginalesBackend: string[] = []; // Momentos que existen en el backend
  private procesandoCambioCheckbox: boolean = false; // Bandera para evitar bucles infinitos

  // Variables para el modal de confirmación de momentos
  modalMomentosTitulo: string = '';
  modalMomentosMensaje: string = '';
  modalMomentosShowCancel: boolean = true;
  modalMomentosAccion: 'desmarcar' | 'eliminar' | null = null;
  modalMomentoIndex: number = -1;
  modalMomentoNombre: string = '';

  // Variables para el modal de notificaciones
  modalNotificacionTitulo: string = '';
  modalNotificacionMensaje: string = '';
  modalNotificacionTipo: 'success' | 'error' = 'success';


  constructor(
    private fb: FormBuilder,
    private localidadesService: LocalidadesService,
    private router: Router,
    private route: ActivatedRoute,
    private backend: BackService,
    private afAuth: AngularFireAuth
  ) { }

  ngOnInit(): void {
    if (this.editMode && this.idEstudio) {
      // Modo edición: cargar datos del estudio a partir del ID
      this.cargarDatosEstudioEditMode(this.idEstudio);
    } else {
      const fechaInicio = this.obtenerFechaInicio();
      this.cargarProvincias();
      this.initializeForm(fechaInicio)
    }
  }


  private initializeForm(fechaInicio?: string | null): void {
    // Cargar datos previamente guardados, si existen
    const savedData = EstudioData.getNuevoEstudioFormData(); // Obtén los datos guardados

    // Habilitar población si ya hay datos
    if (savedData?.provincia) {
      this.poblaciones = this.localidadesService.getPoblacionesByProvinciaNuevo(
        savedData.provincia
      );
    }

    // Cargar datos de momentos si existen
    if (savedData?.tieneMomentos !== undefined) {
      this.tieneMomentos = savedData.tieneMomentos;
    }
    if (savedData?.momentos && Array.isArray(savedData.momentos)) {
      this.momentos = [...savedData.momentos];
    }

    // Inicializamos el formulario con los datos guardados o valores vacíos
    this.nuevoEstudioForm = this.fb.group({
      nombre: [savedData?.nombre || '', Validators.required],
      fechaInicio: [
        savedData?.fechaInicio || fechaInicio || '',
        Validators.required,
      ],
      fechaFin: [savedData?.fechaFin || ''],
      // El tipo de sesión ya no se pide en el formulario: se mantiene en el
      // payload (vacío en estudios nuevos) por compatibilidad con el backend
      tipoSesion: [savedData?.tipoSesion || ''],
      provincia: [savedData?.provincia || '', Validators.required],
      poblacion: [
        { value: savedData?.poblacion || '', disabled: !savedData?.provincia },
        Validators.required,
      ],
      notes: [savedData?.notes || ''],
      estado: [savedData?.estado || EstadoEstudio.Borrador],
      idFormulario: [savedData?.idFormulario || crypto.randomUUID()],
      tieneMomentos: [this.tieneMomentos],
      momentos: [this.momentos]
    },
      { validators: [this.validateDateRange] } // Validación personalizada
    );
  }

  private validateDateRange(control: AbstractControl): { [key: string]: boolean } | null {
    const fechaInicio = control.get('fechaInicio')?.value;
    const fechaFin = control.get('fechaFin')?.value;

    if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
      return { invalidDateRange: true }; // Error si la fecha de inicio es mayor que la de fin
    }
    return null; // No hay error
  }



  private cargarDatosEstudioEditMode(idEstudio: string): void {
    // Buscar el estudio en la lista de estudios de EstudiosPage
    const estudioSeleccionado = EstudiosPage.Instance.estudios.find(
      (estudio) => estudio.id === idEstudio
    );

    if (!estudioSeleccionado) {
      console.error(`Estudio con ID ${idEstudio} no encontrado.`);
      return;
    }

    const data = estudioSeleccionado.data?.NuevoEstudioFormData;

    if (!data) {
      console.error(`No se encontraron datos para el estudio con ID ${idEstudio}.`);
      return;
    }

    // Habilitar población si ya hay datos
    if (data.provincia) {
      this.poblaciones = this.localidadesService.getPoblacionesByProvinciaNuevo(
        data.provincia
      );
    }

    // Cargar datos de momentos si existen
    if (data.tieneMomentos !== undefined) {
      this.tieneMomentos = data.tieneMomentos;
    }
    if (data.momentos && Array.isArray(data.momentos)) {
      this.momentos = [...data.momentos];
      // Guardar los momentos originales del backend
      this.momentosOriginalesBackend = [...data.momentos];
    }

    // Inicializar el formulario con los datos del estudio seleccionado
    this.nuevoEstudioForm = this.fb.group({
      nombre: [data.nombre || '', Validators.required],
      fechaInicio: [data.fechaInicio || '', Validators.required],
      fechaFin: [data.fechaFin || ''],
      // Sin campo en la UI: se conserva el valor que ya tuviera el estudio
      tipoSesion: [data.tipoSesion || ''],
      provincia: [data.provincia || '', Validators.required],
      poblacion: [
        { value: data.poblacion || '', disabled: !data.provincia },
        Validators.required,
      ],
      notes: [data.notes || ''],
      estado: [data.estado],
      idFormulario: [data.idFormulario || crypto.randomUUID()],
      tieneMomentos: [this.tieneMomentos],
      momentos: [this.momentos]
    });

    console.log('Datos del estudio cargados en el formulario:', data);
  }


  private obtenerEstadoModal(): boolean {
    const navigationState = this.router.getCurrentNavigation()?.extras.state;
    return navigationState?.['mostrarModal'] || history.state?.mostrarModal || false;
  }

  private obtenerFechaInicio(): string | null {
    const fechaInicioParam = this.route.snapshot.queryParamMap.get('fechaInicio');
    if (fechaInicioParam) {
      const fecha = new Date(fechaInicioParam);
      fecha.setDate(fecha.getDate() + 1); // Sumar 1 día
      return this.formatDate(fecha); // Formatear la fecha al formato esperado
    }
    if (EstudiosPage.Instance.diaSeleccionadoCalendario) {
      return this.formatDate(EstudiosPage.Instance.diaSeleccionadoCalendario);
    }
    return null;
  }

  private cargarProvincias(): void {
    this.provincias = this.localidadesService
      .getProvinciasNuevo()
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  // Método para formatear la fecha (si no lo tienes ya)
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onProvinciaChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const provinciaSeleccionada = selectElement.value;
    this.poblaciones = this.localidadesService.getPoblacionesByProvinciaNuevo(
      provinciaSeleccionada
    );
    this.nuevoEstudioForm.get('poblacion')?.enable();
  }


  goBack() {
    this.router.navigate(['/estudios']);
  }

  // Métodos para gestión de momentos temporales
  async onTieneMomentosChange(): Promise<void> {
    // Evitar bucles infinitos cuando se cambia programáticamente
    if (this.procesandoCambioCheckbox) {
      return;
    }

    // Si se desmarca el checkbox Y estamos en modo edición
    if (!this.tieneMomentos && this.editMode && this.idEstudio) {
      // LLAMAR A VERIFICACIÓN BACKEND
      this.procesandoCambioCheckbox = true;
      await this.handleDesmarcarCheckbox();
      this.procesandoCambioCheckbox = false;
    } else if (!this.tieneMomentos) {
      // Modo creación (no es editMode): solo limpiar localmente
      this.momentos = [];
      this.nuevoMomento = '';
      this.nuevoEstudioForm.patchValue({
        tieneMomentos: this.tieneMomentos,
        momentos: this.momentos
      });
    } else {
      // Si se marca el checkbox, actualizar formulario
      this.nuevoEstudioForm.patchValue({
        tieneMomentos: this.tieneMomentos,
        momentos: this.momentos
      });
    }
  }

  agregarMomento(): void {
    const momentoTrimmed = this.nuevoMomento.trim();

    if (!momentoTrimmed) {
      return;
    }

    // Verificar si el momento ya existe (comparación insensible a mayúsculas/minúsculas)
    const momentoExiste = this.momentos.some(
      m => m.toLowerCase() === momentoTrimmed.toLowerCase()
    );

    if (momentoExiste) {
      this.mostrarNotificacion('error', `El momento "${momentoTrimmed}" ya existe. No se pueden agregar momentos duplicados.`);
      return;
    }

    // Agregar el momento si no existe
    this.momentos.push(momentoTrimmed);
    this.nuevoEstudioForm.patchValue({ momentos: this.momentos });
    this.nuevoMomento = '';
  }

  async eliminarMomento(index: number): Promise<void> {
    const momentoAEliminar = this.momentos[index];
    const esUltimoMomento = this.momentos.length === 1;

    // En modo edición, verificar si el momento existe en el backend
    if (this.editMode && this.idEstudio) {
      const existeEnBackend = this.momentosOriginalesBackend.includes(momentoAEliminar);

      if (existeEnBackend) {
        // El momento existe en el backend, llamar a la verificación
        await this.handleEliminarMomento(momentoAEliminar, index, esUltimoMomento);
      } else {
        // El momento es nuevo (aún no se ha guardado en el backend)
        // Eliminarlo directamente sin llamar al backend
        this.momentos.splice(index, 1);
        this.nuevoEstudioForm.patchValue({ momentos: this.momentos });

        // Si era el último momento, desmarcar el checkbox
        if (esUltimoMomento) {
          this.procesandoCambioCheckbox = true;
          this.tieneMomentos = false;
          this.nuevoEstudioForm.patchValue({ tieneMomentos: false });
          this.procesandoCambioCheckbox = false;
        }
      }
    } else {
      // Modo creación: eliminar directamente
      this.momentos.splice(index, 1);
      this.nuevoEstudioForm.patchValue({ momentos: this.momentos });

      // Si era el último momento, desmarcar el checkbox
      if (esUltimoMomento) {
        this.tieneMomentos = false;
        this.nuevoMomento = '';
        this.nuevoEstudioForm.patchValue({ tieneMomentos: false });
      }
    }
  }

  async onSubmit(): Promise<void> {

    this.hasSubmitted = true; // Se marca que el formulario ha sido enviado
    if (this.nuevoEstudioForm.invalid) {
      console.error('El formulario contiene errores. Por favor, corrija los campos marcados en rojo.');
      return;
    }

    // Validar que si tieneMomentos es true, haya al menos un momento agregado
    if (this.tieneMomentos && this.momentos.length === 0) {
      console.error('Debe agregar al menos un momento/fase temporal.');
      return;
    }

    // Actualizar valores de momentos antes de guardar
    const formData = {
      ...this.nuevoEstudioForm.value,
      tieneMomentos: this.tieneMomentos,
      momentos: this.tieneMomentos ? this.momentos : []
    };

    EstudioData.setNuevoEstudioFormData(formData);
    const user = await this.afAuth.currentUser; // Obtener el usuario autenticado
    const email = user ? user.email : null;

    if (!email) {
      console.error('No se pudo obtener el correo del usuario.');
      return;
    }

    try {
      if (this.idEstudio) {
        // Actualizar un estudio existente en el backend
        const response = await firstValueFrom(
          await this.backend.actualizarEstudio(this.idEstudio, formData, PasosEstudio.FORMULARIO)
        );

        console.log('Formulario actualizado en el backend:', response);

        // Actualizar localmente en EstudiosPage.Instance.estudios
        const estudioLocal = EstudiosPage.Instance.estudios.find(
          (est) => est.id === this.idEstudio
        );

        if (estudioLocal) {
          estudioLocal.data.NuevoEstudioFormData = formData; // Sustituir con los nuevos valores del formulario
          console.log(`Estudio con ID ${this.idEstudio} actualizado localmente.`);
        } else {
          console.warn(`No se encontró el estudio con ID ${this.idEstudio} para actualizarlo localmente.`);
        }

        // Navegar a la siguiente página
        this.router.navigate(['/crear-zonas-muestreos']);
      } else {
        // Crear un nuevo estudio
        const response = await firstValueFrom(
          await this.backend.crearEstudioPorPartes(email, formData, PasosEstudio.FORMULARIO)
        );
        console.log('Formulario creado:', response);
        this.router.navigate(['/crear-zonas-muestreos']);
      }
    } catch (error) {
      console.error('Error al guardar/actualizar formulario:', error);
    }
  }



  showModal() {
    const modalElement = document.getElementById('confirmModalEstudios');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement, {
        backdrop: 'static', // Esto evita que se cierre al hacer clic fuera
        keyboard: false // Esto evita que se cierre con la tecla "Escape"
      });
      modal.show();
    }
  }

  startNewStudy() {
    console.log('Comenzar un nuevo estudio.');
    EstudioData.reset();
    this.tieneMomentos = false;
    this.momentos = [];
    this.nuevoMomento = '';
    this.initializeForm(this.obtenerFechaInicio());
    this.closeModal();
  }

  continuePreviousStudy() {
    console.log('Continuar con el estudio anterior.');
    this.closeModal();
  }

  closeModal() {
    const modalElement = document.getElementById('confirmModalEstudios');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }
  }

  /**
   * Confirma la acción del modal de momentos
   */
  onConfirmModalMomentos() {
    const resolver = (window as any).momentosModalResolver;
    if (resolver) {
      resolver(true);
      delete (window as any).momentosModalResolver;
    }
    this.closeModalMomentos();
  }

  /**
   * Cancela la acción del modal de momentos
   */
  onCancelModalMomentos() {
    const resolver = (window as any).momentosModalResolver;
    if (resolver) {
      resolver(false);
      delete (window as any).momentosModalResolver;
    }
    this.closeModalMomentos();
  }

  /**
   * Cierra el modal de momentos
   */
  closeModalMomentos() {
    const modalElement = document.getElementById('confirmModalMomentos');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
  }

  /**
   * Cierra el modal de notificaciones
   */
  closeModalNotificacion() {
    const modalElement = document.getElementById('notificacionModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
  }

  /**
   * Handler para desmarcar el checkbox de "Tiene fases temporales"
   */
  private async handleDesmarcarCheckbox(): Promise<void> {
    try {
      // Si NO hay momentos originales en el backend Y NO hay momentos locales
      // Simplemente desmarcar localmente sin llamar al backend
      if (this.momentosOriginalesBackend.length === 0 && this.momentos.length === 0) {
        this.momentos = [];
        this.nuevoMomento = '';
        this.nuevoEstudioForm.patchValue({
          tieneMomentos: false,
          momentos: []
        });
        return;
      }

      // 1. VERIFICAR si hay tareas afectadas
      const verificacion = await this.backend.verificarEliminacionMomentos(
        this.idEstudio,
        true  // esCasoCheckbox = true
      );

      // 2. Mostrar modal de confirmación
      const confirmado = await this.mostrarModalConfirmacion(
        verificacion.tituloModal,
        verificacion.mensajeModal,
        verificacion.hayTareasAfectadas
      );

      if (!confirmado) {
        // Usuario canceló - restaurar el checkbox
        this.procesandoCambioCheckbox = true;
        this.tieneMomentos = true;
        this.procesandoCambioCheckbox = false;
        return;
      }

      // 3. ACTUALIZAR momentos en el backend
      const resultado = await this.backend.actualizarMomentos(
        this.idEstudio,
        true  // esCasoCheckbox = true
      );

      // 4. Actualizar UI local
      this.momentos = [];
      this.nuevoMomento = '';
      this.nuevoEstudioForm.patchValue({
        tieneMomentos: false,
        momentos: []
      });

      // 5. Mostrar mensaje de éxito
      this.mostrarNotificacion('success', 'Fases temporales desactivadas correctamente');

      // 6. Recargar datos del estudio
      await this.recargarEstudio();

    } catch (error) {
      console.error('Error al desactivar fases temporales:', error);
      this.mostrarNotificacion('error', 'Error al desactivar fases temporales');
      // Restaurar el checkbox en caso de error
      this.procesandoCambioCheckbox = true;
      this.tieneMomentos = true;
      this.procesandoCambioCheckbox = false;
    }
  }

  /**
   * Handler para eliminar un momento específico
   */
  private async handleEliminarMomento(nombreMomento: string, index: number, esUltimoMomento: boolean = false): Promise<void> {
    try {
      // 1. VERIFICAR si hay tareas afectadas
      const verificacion = await this.backend.verificarEliminacionMomentos(
        this.idEstudio,
        false,  // esCasoCheckbox = false
        nombreMomento
      );

      // 2. Mostrar modal de confirmación
      const confirmado = await this.mostrarModalConfirmacion(
        verificacion.tituloModal,
        verificacion.mensajeModal,
        verificacion.hayTareasAfectadas
      );

      if (!confirmado) {
        // Usuario canceló
        return;
      }

      // 3. ACTUALIZAR momentos en el backend
      const resultado = await this.backend.actualizarMomentos(
        this.idEstudio,
        false,  // esCasoCheckbox = false
        nombreMomento
      );

      // 4. Actualizar UI local - eliminar del array
      this.momentos.splice(index, 1);
      this.nuevoEstudioForm.patchValue({ momentos: this.momentos });

      // 5. Si era el último momento, desmarcar el checkbox
      if (esUltimoMomento) {
        this.procesandoCambioCheckbox = true;
        this.tieneMomentos = false;
        this.nuevoMomento = '';
        this.nuevoEstudioForm.patchValue({ tieneMomentos: false });
        this.procesandoCambioCheckbox = false;
      }

      // 6. Mostrar mensaje de éxito
      this.mostrarNotificacion('success', `Momento "${nombreMomento}" eliminado correctamente`);

      // 7. Recargar datos del estudio
      await this.recargarEstudio();

    } catch (error) {
      console.error('Error al eliminar momento:', error);
      this.mostrarNotificacion('error', 'Error al eliminar momento');
    }
  }

  /**
   * Muestra un modal de confirmación y devuelve true si el usuario confirma
   */
  private async mostrarModalConfirmacion(
    titulo: string,
    mensaje: string,
    esAdvertencia: boolean
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.modalMomentosTitulo = titulo;
      this.modalMomentosMensaje = mensaje;
      this.modalMomentosShowCancel = true;

      // Guardar el resolver para usarlo en los callbacks
      (window as any).momentosModalResolver = resolve;

      // Mostrar el modal
      const modalElement = document.getElementById('confirmModalMomentos');
      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement, {
          backdrop: 'static',
          keyboard: false
        });
        modal.show();
      }
    });
  }

  /**
   * Muestra una notificación al usuario
   */
  private mostrarNotificacion(tipo: 'success' | 'error', mensaje: string): void {
    console.log(`[${tipo.toUpperCase()}] ${mensaje}`);

    this.modalNotificacionTipo = tipo;
    this.modalNotificacionTitulo = tipo === 'success' ? 'Éxito' : 'Error';
    this.modalNotificacionMensaje = mensaje;

    // Mostrar el modal
    setTimeout(() => {
      const modalElement = document.getElementById('notificacionModal');
      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }
    }, 100);
  }

  /**
   * Recarga los datos del estudio desde el backend
   */
  private async recargarEstudio(): Promise<void> {
    try {
      // Recargar el estudio específico desde EstudiosPage
      const user = await this.afAuth.currentUser;
      const email = user?.email;

      if (email && EstudiosPage.Instance) {
        // Buscar y actualizar el estudio en la lista
        const estudios = await firstValueFrom(
          await this.backend.obtenerEstudiosPorUsuario(email)
        );

        // Actualizar la lista en EstudiosPage
        EstudiosPage.Instance.estudios = estudios;

        // Recargar datos en el formulario
        this.cargarDatosEstudioEditMode(this.idEstudio);
      }
    } catch (error) {
      console.error('Error al recargar estudio:', error);
    }
  }

}
