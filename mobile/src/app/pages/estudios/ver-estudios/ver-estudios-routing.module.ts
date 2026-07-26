import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VerEstudiosPage } from './ver-estudios.page';

const routes: Routes = [
  {
    path: '',
    component: VerEstudiosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VerEstudiosPageRoutingModule {}
