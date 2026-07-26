import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { EstudiosPage } from './pages/estudios/estudios.page';
import { NuevoEstudioFormsPage } from './pages/nuevo-estudio-forms/nuevo-estudio-forms.page';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ModalComponent } from './components/modales/modal/modal.component';
import { GestionTareasPage } from './pages/gestion-tareas/gestion-tareas.page';
import { TableMainComponent } from './components/table/table-main/table-main.component';
import { TableTitleComponent } from './components/table/table-title/table-title.component';
import { ModalCrearTareasComponent } from './components/modales/modal-crear-tareas/modal-crear-tareas.component';
import { environment } from 'src/environments/environment';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { ResetPasswordPage } from './pages/reset-password/reset-password.page';
import { HttpClientModule } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { CalendarioEstudiosComponent } from './components/calendario-estudios/calendario-estudios.component';
import { InactivityModalComponent } from './components/modales/inactivity-modal/inactivity-modal.component';
import { ModalConfirmarEstudioAnteriorComponent } from './components/modales/modal-confirmar-estudio-anterior/modal-confirmar-estudio-anterior.component';
import { ModalConfirmarBorradoEstudioComponent } from './components/modales/modal-confirmar-borrado-estudio/modal-confirmar-borrado-estudio.component';
import { ZonasEstudioMuestreosPage } from './pages/zonas-estudio-muestreos/zonas-estudio-muestreos.page';
import { ModalV2Component } from './components/modales/modal-v2/modal-v2.component';
import { AvisoNoHayFigurasComponent } from './components/contenido-modales/aviso-no-hay-figuras/aviso-no-hay-figuras.component';
import { IntroduceNombreComponent } from './components/contenido-modales/introduce-nombre/introduce-nombre.component';
import { TreeNodeComponent } from './components/tree-node/tree-node.component';
import { TitleComponent } from './components/title/title.component';
import { AvisoZonasSinGuardarComponent } from './components/contenido-modales/aviso-zonas-sin-guardar/aviso-zonas-sin-guardar.component';
import { EliminarTareasComponent } from './components/contenido-modales/eliminar-tareas/eliminar-tareas.component';
import { VerEstudioModalComponent } from './components/contenido-modales/ver-estudio-modal/ver-estudio-modal.component';
import { EliminarZonaComponent } from './components/contenido-modales/eliminar-zona/eliminar-zona.component';
import { AgregarFiguraComponent } from './components/agregar-figura/agregar-figura.component';
import { ConfiguracionEstudioModalComponent } from './components/contenido-modales/configuracion-estudio-modal/configuracion-estudio-modal.component';
import { GeneracionDatosPage } from './pages/generacion-datos/generacion-datos.page';
import { FusionTareasModalComponent } from './components/contenido-modales/fusion-tareas-modal/fusion-tareas-modal.component';
import { FusionTareasMapaComponent } from './components/contenido-modales/fusion-tareas-mapa/fusion-tareas-mapa.component';
import { ArchivosTareaModalComponent } from './components/contenido-modales/archivos-tarea-modal/archivos-tarea-modal.component';
import { LandingPage } from './pages/landing/landing.page';
import { RedirectComponent } from './components/redirect/redirect.component';
import { PerfilPage } from './pages/perfil/perfil.page';
import { CapitalizeFirstPipe } from './pipes/capitalize-first.pipe';
import { PanelAdminPage } from './pages/panel-admin/panel-admin.page';
import { AdminUsuariosComponent } from './pages/panel-admin/admin-usuarios/admin-usuarios.component';
import { AdminGruposComponent } from './pages/panel-admin/admin-grupos/admin-grupos.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    EstudiosPage,
    NuevoEstudioFormsPage,
    ModalComponent,
    GestionTareasPage,
    TableMainComponent,
    TableTitleComponent,
    ModalCrearTareasComponent,
    ResetPasswordPage,
    CalendarioEstudiosComponent,
    InactivityModalComponent,
    ModalConfirmarEstudioAnteriorComponent,
    ModalConfirmarBorradoEstudioComponent,
    ZonasEstudioMuestreosPage,
    ModalV2Component,
    AvisoNoHayFigurasComponent,
    IntroduceNombreComponent,
    TreeNodeComponent,
    TitleComponent,
    AvisoZonasSinGuardarComponent,
    EliminarTareasComponent,
    VerEstudioModalComponent,
    EliminarZonaComponent,
    AgregarFiguraComponent,
    ConfiguracionEstudioModalComponent,
    GeneracionDatosPage,
    FusionTareasModalComponent,
    FusionTareasMapaComponent,
    ArchivosTareaModalComponent,
    LandingPage,
    RedirectComponent,
    PerfilPage,
    CapitalizeFirstPipe,
  PanelAdminPage,
  AdminUsuariosComponent,
  AdminGruposComponent,
    ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFireAuthModule,
    FormsModule
  ],
  providers: [DatePipe],
  bootstrap: [AppComponent]
})
export class AppModule { }
