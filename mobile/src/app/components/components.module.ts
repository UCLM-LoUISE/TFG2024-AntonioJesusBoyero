import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ArboladoFormularioComponent } from './arbolado-formulario/arbolado-formulario.component';
import { SotobosqueFormularioComponent } from './sotobosque-formulario/sotobosque-formulario.component';
import { TituloComponent } from './titulo/titulo.component';
import { SpeciesPickerComponent } from './species-picker/species-picker.component';

@NgModule({
  declarations: [ArboladoFormularioComponent, SotobosqueFormularioComponent, TituloComponent, SpeciesPickerComponent],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [ArboladoFormularioComponent, SotobosqueFormularioComponent, TituloComponent, SpeciesPickerComponent]
})
export class ComponentsModule { }
