import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LeafletComponent } from './components/leaflet/leaflet.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HeaderComponent } from './components/header/header.component';
import { LoginComponent } from './components/login/login.component';
import { PlanSessionComponent } from './components/plan-session/plan-session.component';
import { WelcomeComponent } from './components/welcome/welcome.component';
import { FooterComponent } from './components/footer/footer.component';
import { HomePage } from './components/home/home.page';
import { RegisterComponent } from './components/register/register.component';
import { MainPage } from './components/main/main.page';

@NgModule({
  declarations: [
    AppComponent,
    LeafletComponent,
    HeaderComponent,
    LoginComponent,
    PlanSessionComponent,
    WelcomeComponent,
    FooterComponent,
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
