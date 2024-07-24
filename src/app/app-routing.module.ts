import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { HomePage } from './pages/home/home.page';
import { RegisterComponent } from './pages/register/register.component';
import { EstudiosComponent } from './pages/estudios/estudios.component';
import { NuevoEstudioPage } from './pages/nuevo-estudio/page/nuevo-estudio.page';

const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'plan-session', component: NuevoEstudioPage },
  { path: 'main', component: EstudiosComponent },
  { path: '**', redirectTo: '' }, // Mejora del routing para redirigir cualquier ruta no definida a la página de bienvenida

];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
