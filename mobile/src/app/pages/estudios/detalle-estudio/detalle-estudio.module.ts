import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DetalleEstudioPageRoutingModule } from './detalle-estudio-routing.module';

import { DetalleEstudioPage } from './detalle-estudio.page';
import { FormatearTipoTareaPipe } from 'src/app/pipes/formatear-tipo-tarea.pipe';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DetalleEstudioPageRoutingModule
  ],
  declarations: [DetalleEstudioPage, FormatearTipoTareaPipe]
})
export class DetalleEstudioPageModule {}
