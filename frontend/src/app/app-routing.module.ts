import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NuevoEstudioFormsPage } from './pages/nuevo-estudio-forms/nuevo-estudio-forms.page';
import { EstudiosPage } from './pages/estudios/estudios.page';
import { GestionTareasPage } from './pages/gestion-tareas/gestion-tareas.page';
import { AuthGuard } from './guards/auth.guard';
import { ResetPasswordPage } from './pages/reset-password/reset-password.page';
import { EditModeGuard } from './guards/edit-mode.guard';
import { ZonasEstudioMuestreosPage } from './pages/zonas-estudio-muestreos/zonas-estudio-muestreos.page';
import { GeneracionDatosPage } from './pages/generacion-datos/generacion-datos.page';
import { LandingPage } from './pages/landing/landing.page';
import { RedirectComponent } from './components/redirect/redirect.component';
import { PerfilPage } from './pages/perfil/perfil.page';
import { PanelAdminPage } from './pages/panel-admin/panel-admin.page';
import { NoAuthGuard } from './guards/no-auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'nuevo-estudio', component: NuevoEstudioFormsPage, canActivate: [AuthGuard, EditModeGuard] },
  { path: 'estudios', component: EstudiosPage, canActivate: [AuthGuard] },
  { path: 'gestion-tareas', component: GestionTareasPage, canActivate: [AuthGuard, EditModeGuard] },
  { path: 'reset-password', component: ResetPasswordPage },
  { path: 'crear-zonas-muestreos', component: ZonasEstudioMuestreosPage, canActivate: [AuthGuard, EditModeGuard] },
  { path: 'generar-datos-estudio', component: GeneracionDatosPage, canActivate: [AuthGuard] },
  { path: 'home', component: LandingPage, canActivate: [NoAuthGuard] },
  { path: 'perfil', component: PerfilPage, canActivate: [AuthGuard] },
  { path: 'admin', component: PanelAdminPage, canActivate: [AuthGuard] },
  { path: '**', component: RedirectComponent }];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
