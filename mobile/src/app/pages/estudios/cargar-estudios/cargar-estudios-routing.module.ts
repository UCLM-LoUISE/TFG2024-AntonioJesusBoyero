import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CargarEstudiosPage } from './cargar-estudios.page';

const routes: Routes = [
  {
    path: '',
    component: CargarEstudiosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CargarEstudiosPageRoutingModule {}
