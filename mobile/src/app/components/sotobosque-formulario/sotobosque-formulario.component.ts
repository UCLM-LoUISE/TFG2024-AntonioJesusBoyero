import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TareasPage } from 'src/app/pages/tareas/tareas.page';

@Component({
  selector: 'app-sotobosque-formulario',
  templateUrl: './sotobosque-formulario.component.html',
  styleUrls: ['./sotobosque-formulario.component.scss'],
})
export class SotobosqueFormularioComponent implements OnInit {
  form!: FormGroup;

  @Output() cerrarFormulario = new EventEmitter<void>();
  @Output() guardarFormulario = new EventEmitter<any>();

  haySotobosque = false;
  sotobosque: any[] = [];
  sotobosqueSeleccionado: any = null;

  // Nueva estructura para manejar múltiples ocurrencias
  ocurrencias: any[] = [];
  ocurrenciaSeleccionada: any = null;
  private nextId: number = 1;

  constructor(private fb: FormBuilder) { }

  ngOnInit() {
    this.form = this.fb.group({
      especie: [''],
      longitud: [''], // cm
      altura: [''],   // cm
      porcionVerde: [''],
      porcionSeca: [''],
      total: [''],
      notas: ['']
    });

    // Auto-save cuando cambia cualquier campo
    this.form.valueChanges.subscribe(() => {
      this.guardarAutomaticamente();
    });

    this.comprobarSegmentos();
  }

  comprobarSegmentos() {
    this.haySotobosque = !!TareasPage.instance.haySotobosque;
    this.sotobosque = TareasPage.instance.sotobosque;

    const nombreActual = TareasPage.instance.sotobosqueActualNombre;
    if (nombreActual) {
      const segmentoEncontrado = this.sotobosque.find(s => s.nombre === nombreActual);
      if (segmentoEncontrado) {
        this.sotobosqueSeleccionado = segmentoEncontrado;
        this.cargarDatosSegmentoSeleccionado();
      }
    }
  }

  cargarDatosSegmentoSeleccionado() {
    if (this.sotobosqueSeleccionado) {
      // Inicializar array de ocurrencias si no existe
      if (!this.sotobosqueSeleccionado.ocurrencias) {
        this.sotobosqueSeleccionado.ocurrencias = [];
      }

      this.ocurrencias = this.sotobosqueSeleccionado.ocurrencias;

      // Calcular el siguiente ID basado en las ocurrencias existentes
      if (this.ocurrencias.length > 0) {
        const maxId = Math.max(...this.ocurrencias.map((o: any) => o.id || 0));
        this.nextId = maxId + 1;
      } else {
        this.nextId = 1;
      }

      console.log('🌿 Cargando transecto:', this.sotobosqueSeleccionado.nombre);
      console.log('📊 Ocurrencias cargadas:', this.ocurrencias.length);

      // Si hay ocurrencias, seleccionar la primera por defecto
      if (this.ocurrencias.length > 0) {
        this.seleccionarOcurrencia(this.ocurrencias[0]);
      } else {
        // Si no hay ocurrencias, limpiar el formulario
        this.ocurrenciaSeleccionada = null;
        this.form.reset({}, { emitEvent: false });
      }
    } else {
      this.ocurrencias = [];
      this.ocurrenciaSeleccionada = null;
      this.form.reset({}, { emitEvent: false });
    }
  }

  seleccionarOcurrencia(ocurrencia: any) {
    // Guardar cambios de la ocurrencia anterior antes de cambiar
    if (this.ocurrenciaSeleccionada && this.ocurrenciaSeleccionada !== ocurrencia) {
      this.guardarAutomaticamente();
    }

    this.ocurrenciaSeleccionada = ocurrencia;

    console.log('🌱 Ocurrencia seleccionada:', ocurrencia);

    // Cargar datos de la ocurrencia seleccionada en el formulario
    this.form.patchValue({
      especie: ocurrencia.especie || '',
      longitud: ocurrencia.longitud || '',
      altura: ocurrencia.altura || '',
      porcionVerde: ocurrencia.porcionVerde || '',
      porcionSeca: ocurrencia.porcionSeca || '',
      total: ocurrencia.total || '',
      notas: ocurrencia.notas || ''
    }, { emitEvent: false });
  }

  agregarOcurrencia() {
    if (!this.sotobosqueSeleccionado) {
      console.warn('⚠️ No hay transecto seleccionado');
      return;
    }

    // Guardar cambios de la ocurrencia actual antes de crear una nueva
    if (this.ocurrenciaSeleccionada) {
      this.guardarAutomaticamente();
    }

    // Crear nueva ocurrencia vacía
    const nuevaOcurrencia = {
      id: this.nextId++,
      especie: '',
      longitud: '',
      altura: '',
      porcionVerde: '',
      porcionSeca: '',
      total: '',
      notas: ''
    };

    this.ocurrencias.push(nuevaOcurrencia);
    this.seleccionarOcurrencia(nuevaOcurrencia);
    TareasPage.instance.autoGuardar();

    console.log('➕ Nueva ocurrencia añadida:', nuevaOcurrencia.id);
  }

  async eliminarOcurrencia(ocurrencia: any) {
    const confirmado = await TareasPage.instance.confirmarAccion(
      '¿Eliminar especie?',
      'Se eliminará este registro de especie del transecto.\n\nEsta acción no se puede deshacer.',
    );
    if (!confirmado) return;

    const index = this.ocurrencias.indexOf(ocurrencia);
    if (index > -1) {
      this.ocurrencias.splice(index, 1);

      // Si eliminamos la ocurrencia seleccionada, seleccionar otra
      if (this.ocurrenciaSeleccionada === ocurrencia) {
        if (this.ocurrencias.length > 0) {
          this.seleccionarOcurrencia(this.ocurrencias[0]);
        } else {
          this.ocurrenciaSeleccionada = null;
          this.form.reset({}, { emitEvent: false });
        }
      }

      TareasPage.instance.autoGuardar();
      console.log('🗑️ Ocurrencia eliminada');
    }
  }

  async eliminarTransecto() {
    if (!this.sotobosqueSeleccionado) return;

    const nombre = this.sotobosqueSeleccionado.nombre;
    const eliminado = await TareasPage.instance.eliminarEntidadDesdeFormulario('sotobosque', nombre);

    if (eliminado) {
      this.sotobosqueSeleccionado = null;
      this.ocurrencias = [];
      this.ocurrenciaSeleccionada = null;
      this.haySotobosque = TareasPage.instance.haySotobosque;
      this.form.reset({}, { emitEvent: false });
    }
  }

  guardarAutomaticamente() {
    if (!this.ocurrenciaSeleccionada) {
      return;
    }

    const datos = this.form.value;

    // Actualizar los datos de la ocurrencia seleccionada
    Object.assign(this.ocurrenciaSeleccionada, datos);

    // Persistir en el buffer del estudio (autoguardado silencioso)
    TareasPage.instance.autoGuardar();

    console.log('💾 Auto-guardado ocurrencia ID:', this.ocurrenciaSeleccionada.id);
  }

  guardar() {
    this.guardarAutomaticamente();
    this.guardarFormulario.emit(this.form.value);
  }

  cerrar() {
    // Guardar antes de cerrar
    this.guardarAutomaticamente();
    this.cerrarFormulario.emit();
  }
}
