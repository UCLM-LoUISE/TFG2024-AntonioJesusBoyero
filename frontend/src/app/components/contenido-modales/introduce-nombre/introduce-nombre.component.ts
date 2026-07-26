import { Component } from '@angular/core';
import { ZonasEstudioMuestreosPage } from 'src/app/pages/zonas-estudio-muestreos/zonas-estudio-muestreos.page';

@Component({
  selector: 'app-introduce-nombre',
  templateUrl: './introduce-nombre.component.html',
  styleUrls: ['./introduce-nombre.component.css']
})
export class IntroduceNombreComponent {

  inputNombre: string = ''; // Almacena el valor del input
  showError: boolean = false; // Controla si se muestra el error
  errorMsg: string = ''; // Mensaje de error a mostrar

  resetearError (){
    this.showError = false
    this.errorMsg = ''
  }

  resetearInput(){
    this.inputNombre = ''
  }

  guardarNombre() {
    const nombre = this.inputNombre.trim();

    if (!nombre) {
      this.showError = true;
      this.errorMsg = 'Introduce un nombre para la figura.';
      return;
    }

    // No permitir dos figuras con el mismo nombre
    if (ZonasEstudioMuestreosPage.instance.existeNombreFigura(nombre)) {
      this.showError = true;
      this.errorMsg = `Ya existe una figura llamada "${nombre}". Elige otro nombre.`;
      return;
    }

    // Llama al método del singleton si el nombre es válido
    ZonasEstudioMuestreosPage.instance.introduceNombre(nombre);
    this.resetearError();
    this.resetearInput();
  }
}
