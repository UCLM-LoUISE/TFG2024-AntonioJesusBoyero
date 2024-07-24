import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HeaderComponent } from './components/header/header.component';
import { LoginComponent } from './pages/login/login.component';
import { WelcomeComponent } from './components/welcome/welcome.component';
import { HomePage } from './pages/home/home.page';
import { RegisterComponent } from './pages/register/register.component';
import { MainPage } from './pages/main/main.page';
import { HttpClientModule } from '@angular/common/http';
import { EstudiosComponent } from './pages/estudios/estudios.component';
import { TableComponent } from './components/table/table.component';
import { TableTitleComponent } from './components/table-title/table-title.component';
import { ModalComponent } from './components/modal/modal.component';
import { NuevoEstudioPage } from './pages/nuevo-estudio/page/nuevo-estudio.page';
import { LeafletComponent } from './pages/nuevo-estudio/components/leaflet/leaflet.component';
import { PlanSessionComponent } from './pages/nuevo-estudio/components/plan-session/plan-session.component';


@NgModule({
  declarations: [
    AppComponent,
    LeafletComponent,
    HeaderComponent,
    LoginComponent,
    PlanSessionComponent,
    WelcomeComponent,
    HomePage,
    RegisterComponent,
    MainPage,
    EstudiosComponent,
    TableComponent,
    TableTitleComponent,
    ModalComponent,
    NuevoEstudioPage,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
