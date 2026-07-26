import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CargarEstudiosPageRoutingModule } from './cargar-estudios-routing.module';

import { CargarEstudiosPage } from './cargar-estudios.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CargarEstudiosPageRoutingModule
  ],
  declarations: [CargarEstudiosPage]
})
export class CargarEstudiosPageModule {}
