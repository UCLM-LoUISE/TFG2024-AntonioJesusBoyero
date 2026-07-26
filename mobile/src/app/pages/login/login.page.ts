import { Component, OnInit, } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuarioBuffer } from 'src/app/data/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

  preLogin: boolean = true //aqui mostraremos el logo y empezar
  login: boolean = false //aqui el login
  isLoading = false; //para manejar el spinner de carga

  loginForm!: FormGroup;

  constructor(private formBuilder: FormBuilder, private router: Router, private authService: AuthService, private alertController: AlertController) { }

  ngOnInit() {
    // Inicializar el formulario reactivo con los campos
    this.loginForm = this.formBuilder.group({
      usuario: ['', [Validators.required]],  // Campo 'usuario' con validaciones
      contrasena: ['', [Validators.required, Validators.minLength(6)]],  // Campo 'contrasena' con validaciones
    });

    setTimeout(() => {
      this.preLogin = false;
      this.login = true;
    }, 2000);

  }

  ponerSpinner() {
    this.isLoading = true
  }

  ocultarSpinner() {
    this.isLoading = false
  }

  onStart() {
    this.ponerSpinner()
    setTimeout(() => {
      this.ocultarSpinner()
      this.verLogin()
    }, 1000);
  }

  verLogin() {
    this.preLogin = false
    this.login = true
  }


  async onLogin() {
    this.ponerSpinner();

    if (this.loginForm.valid) {
      const { usuario, contrasena } = this.loginForm.value;

      try {
        await this.authService.login(usuario, contrasena);
        console.log('Login con Firebase exitoso');
        console.log('Usuario:', this.authService.getCurrentUser()?.email);
        UsuarioBuffer.setCorreo(this.authService.getCurrentUser()?.email || '');

        setTimeout(() => {
          this.ocultarSpinner();
          this.router.navigate(['/inicio'], { replaceUrl: true });
        }, 1000);
      } catch (error) {
        console.error('Error en login:', error);
        this.ocultarSpinner();
        const alerta = await this.alertController.create({
          header: 'No se pudo iniciar sesión',
          message: 'Credenciales incorrectas o usuario no registrado.',
          buttons: ['Entendido'],
        });
        await alerta.present();
      }
    } else {
      this.ocultarSpinner();
      this.loginForm.markAllAsTouched();
    }
  }

  async loginSinConexion() {
    const alert = await this.alertController.create({
      header: 'Modo sin conexión',
      message: 'Es muy importante poner el correo electrónico correctamente. Si el correo no coincide, no se cargarán las tareas de los estudios que importes.',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'Correo electrónico'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Entrar',
          handler: (data) => {
            if (data.email && data.email.trim() !== '') {
              this.procesarLoginSinConexion(data.email.trim().toLowerCase());
            } else {
              return false; // Evita que se cierre si está vacío
            }
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  procesarLoginSinConexion(correo: string) {
    this.ponerSpinner();
    UsuarioBuffer.setCorreo(correo);
    setTimeout(() => {
      this.ocultarSpinner();
      this.router.navigate(['/inicio'], { replaceUrl: true });
    }, 1000);
  }

}
