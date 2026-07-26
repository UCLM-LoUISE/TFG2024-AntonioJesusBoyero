import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { VerEstudiosPageRoutingModule } from './ver-estudios-routing.module';

import { VerEstudiosPage } from './ver-estudios.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VerEstudiosPageRoutingModule
  ],
  declarations: [VerEstudiosPage]
})
export class VerEstudiosPageModule {}
