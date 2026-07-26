import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import L from 'leaflet';
import { GestionTareasPage } from 'src/app/pages/gestion-tareas/gestion-tareas.page';
import { ZonasEstudioMuestreosPage } from 'src/app/pages/zonas-estudio-muestreos/zonas-estudio-muestreos.page';

@Component({
  selector: 'app-agregar-figura',
  templateUrl: './agregar-figura.component.html',
  styleUrls: ['./agregar-figura.component.css']
})
export class AgregarFiguraComponent {

  figuraForm: FormGroup;
  formInvalid: boolean = false; // Variable para manejar errores visuales
  mostrarFormulario: boolean = false;
  mostrarError: boolean = false;
  errorNombreDuplicado: boolean = false;

  constructor(private fb: FormBuilder) {
    this.figuraForm = this.fb.group({
      tipoFigura: ['marker', Validators.required],
      nombre: ['', Validators.required],
      latitud: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitud: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
      radio: [null] // Se valida solo cuando sea círculo
    });
  }

  get esCirculo(): boolean {
    return this.figuraForm.get('tipoFigura')?.value === 'circle';
  }

  agregarFiguraManual() {

    if (this.esCirculo) {
      this.figuraForm.get('radio')?.setValidators([Validators.required, Validators.min(1)]);
      this.figuraForm.get('radio')?.updateValueAndValidity();
    } else {
      this.figuraForm.get('radio')?.clearValidators();
      this.figuraForm.get('radio')?.updateValueAndValidity();
    }

    if (this.figuraForm.invalid) {
      this.formInvalid = true;
      this.mostrarError = true;
      this.figuraForm.markAllAsTouched(); // Forzar la validación visual
      return;
    }

    this.formInvalid = false;
    this.mostrarError = false;


    const { tipoFigura, nombre, latitud, longitud, radio } = this.figuraForm.value;

    // No permitir dos figuras con el mismo nombre
    if (ZonasEstudioMuestreosPage.instance.existeNombreFigura(nombre)) {
      this.errorNombreDuplicado = true;
      return;
    }
    this.errorNombreDuplicado = false;
    const drawnItems = ZonasEstudioMuestreosPage.instance.getDrawnItems();
    let layer: any = null;

    if (tipoFigura === 'marker') {
      layer = L.marker([latitud, longitud]).bindPopup(nombre);
    } else if (tipoFigura === 'circle') {
      layer = L.circle([latitud, longitud], { radius: radio, color: '#ff0000' }).bindPopup(nombre);
    }

    if (layer) {
      layer.feature = {
        type: 'Feature',
        properties: { name: nombre },
        geometry: {
          type: tipoFigura === 'circle' ? 'Point' : 'Polygon',
          coordinates: [longitud, latitud]
        }
      };

      drawnItems.addLayer(layer);
      ZonasEstudioMuestreosPage.instance.actualizarResumen(layer, nombre, tipoFigura);
      ZonasEstudioMuestreosPage.instance.introduceNombre(nombre);
      if (!this.esCirculo) {
        GestionTareasPage.Instance.openModeCreateTask();
      }

      ZonasEstudioMuestreosPage.instance.verificarMarcadores();




      console.log(`Figura añadida manualmente: ${nombre}`);
      const tipoActual = this.figuraForm.get('tipoFigura')?.value;
      this.figuraForm.reset({ tipoFigura: tipoActual });
    }
  }

  toggleFormulario() {
    this.mostrarFormulario = !this.mostrarFormulario;
    this.formInvalid = false;
    this.mostrarError = false;
    this.figuraForm.markAsUntouched();

  }

  cambiarTipoFigura(event: any) {
    const tipoFigura = event.target.value;
    this.figuraForm.reset({ tipoFigura });
    this.formInvalid = false;
    this.mostrarError = false;
    this.figuraForm.markAsUntouched();
  }




}
