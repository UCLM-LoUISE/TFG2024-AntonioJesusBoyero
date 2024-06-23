import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlanSessionComponent } from './components/plan-session/plan-session.component';
import { AppComponent } from './app.component';
import { LoginComponent } from './pages/login/login.component';
import { HomePage } from './pages/home/home.page';
import { RegisterComponent } from './pages/register/register.component';
import { MainPage } from './pages/main/main.page';
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
