import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EstudiosPage } from './estudios.page';

const routes: Routes = [
  {
    path: '',
    component: EstudiosPage
  },
  {
    path: 'ver',
    loadChildren: () => import('./ver-estudios/ver-estudios.module').then( m => m.VerEstudiosPageModule)
  },
  {
    path: 'cargar',
    loadChildren: () => import('./cargar-estudios/cargar-estudios.module').then( m => m.CargarEstudiosPageModule)
  },  {
    path: 'detalle-estudio',
    loadChildren: () => import('./detalle-estudio/detalle-estudio.module').then( m => m.DetalleEstudioPageModule)
  }


];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EstudiosPageRoutingModule {}
