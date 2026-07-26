import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DetalleEstudioPage } from './detalle-estudio.page';

const routes: Routes = [
  {
    path: '',
    component: DetalleEstudioPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DetalleEstudioPageRoutingModule {}
