import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LeafletComponent } from './components/leaflet/leaflet.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HeaderComponent } from './components/header/header.component';
import { LoginComponent } from './pages/login/login.component';
import { PlanSessionComponent } from './components/plan-session/plan-session.component';
import { WelcomeComponent } from './components/welcome/welcome.component';
import { HomePage } from './pages/home/home.page';
import { RegisterComponent } from './pages/register/register.component';
import { MainPage } from './pages/main/main.page';

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
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
