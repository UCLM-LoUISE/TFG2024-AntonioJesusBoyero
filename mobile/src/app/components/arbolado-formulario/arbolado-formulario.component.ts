import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TareasPage } from 'src/app/pages/tareas/tareas.page';
// species picker moved to shared component
@Component({
  selector: 'app-arbolado-formulario',
  templateUrl: './arbolado-formulario.component.html',
  styleUrls: ['./arbolado-formulario.component.scss'],
  providers: [{ provide: ArboladoFormularioComponent, useExisting: ArboladoFormularioComponent }]
})

export class ArboladoFormularioComponent implements OnInit {

  // species handled by SpeciesPickerComponent


  form!: FormGroup;

  @Output() cerrarFormulario = new EventEmitter<void>();
  @Output() guardarFormulario = new EventEmitter<any>();

  hayArboles: boolean = false;
  arboles: any[] = [];
  arbolSeleccionado: any = null;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.form = this.fb.group({
      especie: [''],
      dn: [''],
      ht: [''],
      hs: [''],
      hv: [''],
      dc1: [''],
      dc2: [''],
      edad: [''],
      notas: ['']
    });

    // Auto-save cuando cambia cualquier campo
    this.form.valueChanges.subscribe(() => {
      this.guardarAutomaticamente();
    });

    this.comprobarArboles();
  }

  comprobarArboles() {
    TareasPage.instance.hayArboles ? this.hayArboles = true : this.hayArboles = false;


    console.log('TareasPage.instance.arboles', TareasPage.instance.arboles);
    this.arboles = TareasPage.instance.arboles;

    //por aqui entraremos cuando se pone un árbol desde el mapa
    const nombreActual = TareasPage.instance.arbolActualNombre;
    if (nombreActual) {
      console.log('arboles formulario', this.arboles);
      const arbolEncontrado = this.arboles.find(a => a.nombre === nombreActual);
      if (arbolEncontrado) {
        this.arbolSeleccionado = arbolEncontrado;
        this.cargarDatosArbolSeleccionado(); // ⬅️ importante cargar también al principio

      }
    }

    //por aqui entraremos cuando cargamos los datos desde el buffer
  }

  cargarDatosArbolSeleccionado() {
    if (this.arbolSeleccionado) {
      const datos = this.arbolSeleccionado.datos || {};

      console.log('🌳 Cargando datos del árbol:', this.arbolSeleccionado.nombre);
      console.log('📊 Datos a cargar:', datos);
      console.log('🌿 Especie a cargar:', datos.especie);

      // Rellenar el formulario con los datos del árbol
      // Usamos { emitEvent: false } para evitar que se dispare el auto-save al cargar
      this.form.patchValue({
        especie: datos.especie || '',
        dn: datos.dn || '',
        ht: datos.ht || '',
        hs: datos.hs || '',
        hv: datos.hv || '',
        dc1: datos.dc1 || '',
        dc2: datos.dc2 || '',
        edad: datos.edad || '',
        notas: datos.notas || ''
      }, { emitEvent: false });

      console.log('✅ Formulario después de patchValue:', this.form.value);
    } else {
      // Si no hay árbol seleccionado, vaciamos el formulario
      this.form.reset({ }, { emitEvent: false });
    }
  }



  guardarAutomaticamente() {
    if (!this.arbolSeleccionado) {
      return;
    }

    const datos = this.form.value;

    // Calcular superficie de copa
    const dc1 = parseFloat(datos.dc1);
    const dc2 = parseFloat(datos.dc2);
    if (!isNaN(dc1) && !isNaN(dc2)) {
      datos.superficieCopa = (Math.PI / 4) * dc1 * dc2;
    }

    // Asignar los datos al árbol seleccionado
    this.arbolSeleccionado.datos = datos;

    // Persistir en el buffer del estudio (autoguardado silencioso)
    TareasPage.instance.autoGuardar();

    console.log('Auto-guardado:', this.arbolSeleccionado.nombre, datos);
  }

  async eliminarArbol() {
    if (!this.arbolSeleccionado) return;

    const nombre = this.arbolSeleccionado.nombre;
    const eliminado = await TareasPage.instance.eliminarEntidadDesdeFormulario('arbol', nombre);

    if (eliminado) {
      // this.arboles apunta a la misma referencia que TareasPage.instance.arboles,
      // así que ya está actualizado tras el borrado.
      this.arbolSeleccionado = null;
      this.hayArboles = TareasPage.instance.hayArboles;
      this.form.reset({}, { emitEvent: false });
    }
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
