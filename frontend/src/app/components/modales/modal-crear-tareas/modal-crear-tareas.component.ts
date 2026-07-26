import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { UserData } from 'src/app/data/user-data';
import { EstudioData } from 'src/app/data/estudios-data';
import { ModalMode } from 'src/app/enums/modalMode';
import { GestionTareasPage } from 'src/app/pages/gestion-tareas/gestion-tareas.page';
import { ZonasEstudioMuestreosPage } from 'src/app/pages/zonas-estudio-muestreos/zonas-estudio-muestreos.page';
import { BackService } from 'src/app/services/back.service';

@Component({
  selector: 'app-modal-crear-tareas',
  templateUrl: './modal-crear-tareas.component.html',
  styleUrls: ['./modal-crear-tareas.component.css']
})
export class ModalCrearTareasComponent implements OnInit {

  //#region VARIABLES

  public static Instance: ModalCrearTareasComponent;
  @Output() confirmAction = new EventEmitter<void>();
  mode: ModalMode = ModalMode.Edit;
  currentTask: any = null;
  tareaForm!: FormGroup;
  trabajadoresDisponibles: { nombreCompleto: string, email: string }[] = [];
  trabajadoresSeleccionados: { nombreCompleto: string, email: string }[] = [];
  todosLosTrabajadores: { nombreCompleto: string, email: string }[] = [];

  formularioInvalido: boolean = false;
  errorNombreDuplicado: boolean = false;

  areas: { value: string, label: string }[] = [];

  // Variables para gestión de momentos
  tieneMomentos: boolean = false;
  momentosDisponibles: string[] = [];
  incluyeTodosMomentos: boolean = false;
  momentosSeleccionados: string[] = [];

  //#endregion

  constructor(private fb: FormBuilder, private backService: BackService) {
    ModalCrearTareasComponent.Instance = this;
  }

  //#region HOOKS

  ngOnInit(): void {
    this.initializeForm();
    this.obtenerUsuarios();
    this.cargarMomentos();
  }

  initializeForm() {
    this.tareaForm = this.fb.group({
      taskName: ['', Validators.required],
      trabajador: this.fb.array([], [Validators.required, this.minSelected(1)]),
      zona: ['', Validators.required],
      notas: [''],
      fecha: ['', Validators.required],
      tipoTarea: ['', Validators.required]
    });
  }

  //#endregion

  //#region MODOS DEL FORMULARIO

  setViewMode(task: any) {
    this.mode = ModalMode.View
    this.currentTask = task;
    this.cargarMomentos();
    this.populateForm(task);
    this.disableForm(); // Deshabilitamos el formulario al entrar en modo vista
  }

  setEditMode(task: any) {
    this.mode = ModalMode.Edit;
    this.currentTask = task;
    this.formularioInvalido = false;
    this.errorNombreDuplicado = false;
    this.cargarMomentos();
    this.populateForm(task);
    this.areas = [];
    // Obtener el resumen de figuras
    const resumenFiguras = ZonasEstudioMuestreosPage.instance.resumenFiguras;
    // Recorrer y filtrar las figuras de tipo "Point" o "Punto"
    if (resumenFiguras && resumenFiguras.length > 0) {
      resumenFiguras.forEach(figura => {
        this.agregarFiguraSiEsPunto(figura);
      });
    }

    this.enableForm(); // Habilitamos el formulario al entrar en modo edición
  }

  setCreateMode() {
    this.mode = ModalMode.Create;
    this.currentTask = null;
    this.formularioInvalido = false;
    this.errorNombreDuplicado = false;
    this.tareaForm.reset();
    this.trabajadoresSeleccionados = [];
    this.resetTrabajadoresDisponibles();

    // Reiniciar momentos
    this.cargarMomentos();

    // Reconstruir la lista completa de zonas (todos los puntos del mapa),
    // igual que en modo edición, para que el desplegable las muestre todas
    this.areas = [];
    const resumenFiguras = ZonasEstudioMuestreosPage.instance.resumenFiguras;
    if (resumenFiguras && resumenFiguras.length > 0) {
      resumenFiguras.forEach(figura => {
        this.agregarFiguraSiEsPunto(figura);
      });
    }

    const nuevaZona = ZonasEstudioMuestreosPage.instance.nombreFigura;
    if (nuevaZona && !this.areas.some(area => area.value === nuevaZona)) {
      this.areas.push({ value: nuevaZona, label: nuevaZona });
    }
    this.tareaForm.patchValue({
      // Precargar nombre y zona con el nombre dado al marcador
      // (editables; solo aplica al crear la tarea desde el mapa)
      taskName: nuevaZona || '',
      trabajador: [],
      zona: nuevaZona || '',
      notas: '',
      fecha: '',
      tipoTarea: '' // 🔹 Asegurar que queda vacío para que muestre "Seleccione un tipo"
    });
    this.enableForm();
  }

  setCreateModeLink() {
    this.mode = ModalMode.Create;
    this.currentTask = null;
    this.formularioInvalido = false;
    this.errorNombreDuplicado = false;
    this.tareaForm.reset();
    this.trabajadoresSeleccionados = [];
    this.resetTrabajadoresDisponibles();

    // Reiniciar momentos
    this.cargarMomentos();

    this.areas = [];
    // Obtener el resumen de figuras
    const resumenFiguras = ZonasEstudioMuestreosPage.instance.resumenFiguras;
    // Recorrer y filtrar las figuras de tipo "Point" o "Punto"
    if (resumenFiguras && resumenFiguras.length > 0) {
      resumenFiguras.forEach(figura => {
        this.agregarFiguraSiEsPunto(figura);
      });
    }
    this.tareaForm.patchValue({
      taskName: '',
      trabajador: [],
      zona: '',  // 🔹 Asegurar que queda vacío para que muestre "Selecciona un área"
      notas: '',
      fecha: '',
      tipoTarea: '' // 🔹 Asegurar que queda vacío para que muestre "Seleccione un tipo"
    });
    this.enableForm();
  }

  //#endregion

  //#region FUNCIONES DEL FORMULARIO

  //Para rellenar el formulario en modo edicion y vista
  populateForm(task: any) {
    this.tareaForm.patchValue({
      taskName: task.nombreTarea,
      notas: task.notas,
      fecha: task.fecha,
      zona: task.zona,
      tipoTarea: task.tipoTarea
    });

    // Limpiar trabajadores seleccionados y buscar objetos completos por email
    this.trabajadoresSeleccionados = task.trabajador.split(", ")
      .map((email: string) =>
        this.todosLosTrabajadores.find(trabajador => trabajador.email === email)
      )
      .filter((trabajador: undefined) => trabajador !== undefined) as { nombreCompleto: string, email: string }[];

    // Limpiar el array del formulario y rellenarlo con los emails correspondientes
    this.trabajadorArray.clear();
    this.trabajadoresSeleccionados.forEach(trabajador => {
      this.trabajadorArray.push(this.fb.control(trabajador.email));
    });

    // Cargar información de momentos si existen
    if (task.tieneMomentos && task.momentos) {
      if (Array.isArray(task.momentos)) {
        // Si momentos es un array (formato antiguo)
        this.momentosSeleccionados = [...task.momentos];
        this.incluyeTodosMomentos = this.momentosSeleccionados.length === this.momentosDisponibles.length;
      } else if (typeof task.momentos === 'object') {
        // Si momentos es un objeto (formato nuevo con estructura anidada)
        this.momentosSeleccionados = Object.keys(task.momentos);
        this.incluyeTodosMomentos = this.momentosSeleccionados.length === this.momentosDisponibles.length;
      }
    } else {
      this.momentosSeleccionados = [];
      this.incluyeTodosMomentos = false;
    }

    this.updateAvailableTrabajadores();
  }

  get trabajadorArray(): FormArray {
    return this.tareaForm.get('trabajador') as FormArray;
  }

  minSelected(min: number) {
    return (control: AbstractControl): { [key: string]: boolean } | null => {
      const formArray = control as FormArray;
      return formArray.length >= min ? null : { minSelected: true };
    };
  }


  addTrabajador(event: Event) {
    const selectedEmail = (event.target as HTMLSelectElement).value;
    const trabajador = this.trabajadoresDisponibles.find(t => t.email === selectedEmail);

    if (trabajador && !this.trabajadoresSeleccionados.some(t => t.email === trabajador.email)) {
      this.trabajadorArray.push(this.fb.control(trabajador.email));
      this.trabajadoresSeleccionados.push(trabajador);
      this.updateAvailableTrabajadores();
    }
    (event.target as HTMLSelectElement).value = '';
  }

  removeTrabajador(email: string) {
    const index = this.trabajadorArray.value.indexOf(email);
    if (index !== -1) {
      // Eliminar del FormArray y de la lista de seleccionados
      this.trabajadorArray.removeAt(index);
      const trabajadorEliminado = this.trabajadoresSeleccionados.find(t => t.email === email);
      this.trabajadoresSeleccionados = this.trabajadoresSeleccionados.filter(t => t.email !== email);

      // Volver a agregarlo a la lista de disponibles si existe
      if (trabajadorEliminado) {
        this.trabajadoresDisponibles.push(trabajadorEliminado);
        this.trabajadoresDisponibles.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto)); // Opcional: ordenar alfabéticamente
      }
    }
  }


  updateAvailableTrabajadores() {
    this.trabajadoresDisponibles = this.todosLosTrabajadores.filter(trabajador =>
      !this.trabajadoresSeleccionados.some(seleccionado => seleccionado.email === trabajador.email)
    );
  }


  private resetTrabajadoresDisponibles() {
    // Restablecer los trabajadores disponibles excluyendo los seleccionados
    this.trabajadoresDisponibles = this.todosLosTrabajadores.filter(trabajador =>
      !this.trabajadoresSeleccionados.some(seleccionado => seleccionado.email === trabajador.email)
    );
  }



  disableForm() {
    this.tareaForm.controls['taskName'].disable();
    this.tareaForm.controls['trabajador'].disable();
    this.tareaForm.controls['notas'].disable();
    this.tareaForm.controls['fecha'].disable();
    this.tareaForm.controls['zona'].disable();
    this.tareaForm.controls['tipoTarea'].disable();
  }

  enableForm() {
    this.tareaForm.controls['taskName'].enable();
    this.tareaForm.controls['trabajador'].enable();
    this.tareaForm.controls['notas'].enable();
    this.tareaForm.controls['fecha'].enable();
    this.tareaForm.controls['zona'].enable();
    this.tareaForm.controls['tipoTarea'].enable();
  }


  onConfirm() {
    if (this.tareaForm.valid) {
      // No permitir dos tareas con el mismo nombre (ignorando mayúsculas);
      // en modo edición se excluye la propia tarea que se está editando
      const nombreNuevo = (this.tareaForm.value.taskName || '').trim().toLowerCase();
      const nombreDuplicado = GestionTareasPage.Instance.taskTableData.some((t: any) =>
        (t.nombreTarea || '').trim().toLowerCase() === nombreNuevo &&
        !(this.mode === ModalMode.Edit && this.currentTask && t.id === this.currentTask.id)
      );

      if (nombreDuplicado) {
        this.errorNombreDuplicado = true;
        this.formularioInvalido = true;
        console.log('Ya existe una tarea con ese nombre');
        return;
      }
      this.errorNombreDuplicado = false;

      // Validar que si hay momentos, se haya seleccionado al menos uno
      if (this.tieneMomentos && this.momentosSeleccionados.length === 0) {
        this.formularioInvalido = true;
        console.log('Debe seleccionar al menos un momento para esta tarea');
        return;
      }

      console.log('Formulario válido:', this.tareaForm.value);
      console.log('Momentos seleccionados:', this.momentosSeleccionados);

      // Crear estructura de tarea con momentos
      const tareaData = {
        ...this.tareaForm.value,
        tieneMomentos: this.tieneMomentos,
        momentos: this.tieneMomentos ? this.momentosSeleccionados : []
      };

      GestionTareasPage.Instance.crearOrActualizarTarea(tareaData);
      this.confirmAction.emit();
      this.tareaForm.reset();
      this.trabajadoresSeleccionados = [];
      this.cargarMomentos();
      this.resetTrabajadoresDisponibles();
      this.formularioInvalido = false;
    } else {
      this.formularioInvalido = true;
      console.log('Formulario inválido');
    }
  }

  obtenerUsuarios(): void {
    this.backService.obtenerUsuariosMismoGrupo(UserData.getUserEmail()).then(
      (usuarios: any[]) => {
        // Inicializar la lista completa de trabajadores
        this.todosLosTrabajadores = usuarios.map(usuario => ({
          nombreCompleto: `${usuario.nombre} ${usuario.apellidos}`,
          email: usuario.email
        }));

        // Inicializar trabajadores disponibles
        this.trabajadoresDisponibles = [...this.todosLosTrabajadores];

        console.log('Trabajadores disponibles:', this.trabajadoresDisponibles);
      }
    ).catch((error) => {
      console.error('Error al obtener los usuarios:', error);
    });
  }

  agregarFiguraSiEsPunto(figura: any) {
    // Verificar si la figura es de tipo "Point" o "Punto"
    if (figura.tipo === "Point" || figura.tipo === "Punto" || figura.tipo === "marker") {
      // Verificar si el nombre de la figura ya existe en `areas`
      const existe = this.areas.some(area => area.value === figura.nombre);

      // Si no existe, agregarla a `areas`
      if (!existe) {
        this.areas.push({ value: figura.nombre, label: figura.nombre });
      }
    }

    // Si la figura tiene hijos, recorrerlos también
    if (figura.hijos && figura.hijos.length > 0) {
      figura.hijos.forEach((hijo: any) => this.agregarFiguraSiEsPunto(hijo));
    }
  }

  // Métodos para gestión de momentos
  cargarMomentos(): void {
    const estudioData = EstudioData.getNuevoEstudioFormData();
    if (estudioData?.tieneMomentos && estudioData?.momentos) {
      this.tieneMomentos = true;
      this.momentosDisponibles = estudioData.momentos;

      // Si solo hay un momento, marcarlo automáticamente
      if (this.momentosDisponibles.length === 1) {
        this.incluyeTodosMomentos = true;
        this.momentosSeleccionados = [...this.momentosDisponibles];
      } else {
        this.incluyeTodosMomentos = false;
        this.momentosSeleccionados = [];
      }
    } else {
      this.tieneMomentos = false;
      this.momentosDisponibles = [];
      this.incluyeTodosMomentos = false;
      this.momentosSeleccionados = [];
    }
  }

  onTodosMomentosChange(): void {
    if (this.incluyeTodosMomentos) {
      // Si se marca "todos", seleccionar todos los momentos
      this.momentosSeleccionados = [...this.momentosDisponibles];
    } else {
      // Si se desmarca "todos", limpiar la selección
      this.momentosSeleccionados = [];
    }
  }

  onMomentoToggle(momento: string): void {
    const index = this.momentosSeleccionados.indexOf(momento);
    if (index > -1) {
      this.momentosSeleccionados.splice(index, 1);
    } else {
      this.momentosSeleccionados.push(momento);
    }
    // Actualizar el checkbox de "todos" si corresponde
    this.incluyeTodosMomentos = this.momentosSeleccionados.length === this.momentosDisponibles.length;
  }

  isMomentoSeleccionado(momento: string): boolean {
    return this.momentosSeleccionados.includes(momento);
  }


  //#endregion
}
