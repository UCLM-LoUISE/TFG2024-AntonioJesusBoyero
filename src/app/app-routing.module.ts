import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlanSessionComponent } from './components/plan-session/plan-session.component';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { HomePage } from './components/home/home.page';
import { RegisterComponent } from './components/register/register.component';
import { MainPage } from './components/main/main.page';
import { LeafletComponent } from './components/leaflet/leaflet.component';
import { HeaderComponent } from './components/header/header.component';

const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'plan-session', component: PlanSessionComponent },
  { path: 'LeafletComponent', component: LeafletComponent },
  { path: 'main', component: MainPage },
  { path: '**', redirectTo: '' }, // Mejora del routing para redirigir cualquier ruta no definida a la página de bienvenida

];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
