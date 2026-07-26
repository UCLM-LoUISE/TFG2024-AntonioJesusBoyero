import { ResetPasswordPage } from './../reset-password/reset-password.page';
import { Component, AfterViewInit, ViewChild, ElementRef, OnInit } from '@angular/core';
import * as Granim from 'granim';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { InactivityService } from 'src/app/services/inactivity.service';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.css'],
})
export class LandingPage implements AfterViewInit, OnInit {
  @ViewChild('logo', { static: true }) logo!: ElementRef<HTMLImageElement>;

  loginForm!: FormGroup;

  cargando = false;
  moverLogo = false;
  mostrarFormulario = false;
  mostrarBotones = true;
  resetPassword = false;
  formularioOcultando = false;
  resetOcultando = false;
  errorLogin = false;


  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private inactivityService: InactivityService
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }



  ngAfterViewInit(): void {
    new Granim({
      element: '#canvas-granim',
      direction: 'diagonal',
      isPausedWhenNotInView: true,
      states: {
        'default-state': {
          gradients: [
            ['#fceabb', '#f8b500'],   // amarillo suave a dorado claro
            ['#c2e9fb', '#a1c4fd'],   // azul cielo claro
            ['#e0c3fc', '#8ec5fc'],   // lila claro a azul claro
            ['#fddb92', '#d1fdff'],   // dorado claro a azul hielo
          ],
          transitionSpeed: 5000,
        },
      },
    });
  }


  onSubmit(): void {
    if (this.loginForm.valid) {
      this.cargando = true;
      const { email, password } = this.loginForm.value;

      this.authService
        .login(email, password)
        .then(() => {
          this.errorLogin = false;
          console.log('[LandingPage] Login exitoso');
          this.inactivityService.startMonitoring();
        })
        .catch((error) => {
          this.errorLogin = true;
          console.error('[LandingPage] Error al iniciar sesión:', error);
        })
        .finally(() => {
          this.cargando = false;
        });
    } else {
      console.log('[LandingPage] Formulario inválido');
    }
  }

  onLoginClick(): void {
    this.moverLogo = true;

    setTimeout(() => {
      this.mostrarBotones = false;
    }, 600);

    setTimeout(() => {
      this.mostrarFormulario = true;
    }, 800);
  }

  onResetPasswordClick(): void {
    this.formularioOcultando = true;
    this.moverLogo = true;

    setTimeout(() => {
      this.mostrarBotones = false;
      this.mostrarFormulario = false;
    }, 600);

    setTimeout(() => {
      this.resetPassword = true;
    }, 800);
    this.formularioOcultando = false;

  }

  mostrarInicio(): void {
    this.errorLogin = false;
    this.resetOcultando = true;

    setTimeout(() => {
      this.resetPassword = false;
      this.mostrarFormulario = true;
      this.resetOcultando = false;
    }, 400);
  }


}




