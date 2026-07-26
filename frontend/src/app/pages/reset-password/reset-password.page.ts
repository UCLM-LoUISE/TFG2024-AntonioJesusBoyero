import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.css']
})

export class ResetPasswordPage implements OnInit {

  resetPasswordForm!: FormGroup;
  cargando = false;
  mostrarMensajeOk = false;
  mostrarMensajeError = false;
  enviado = false;
  @Output() resetPasswordEvent = new EventEmitter<string>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.resetPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  goToLogin(): void {
    this.resetPasswordEvent.emit('goToLogin');
  }

  onSubmit(): void {
    if (this.resetPasswordForm.valid) {
      this.cargando = true;
      const email = this.resetPasswordForm.value.email;
      this.authService.resetPassword(email)
        .then(() => {
          this.mostrarMensajeError = false;
          this.mostrarMensajeOk = true;
          this.cargando = false;
          this.enviado = true;
          // this.mostrarMensajeError = false;
          setTimeout(() => {
            this.enviado = false;
            this.mostrarMensajeError = false;
            this.mostrarMensajeOk = false;
            this.goToLogin();
          }, 10000);
        })
        .catch(error => {
          this.mostrarMensajeOk = false;
          this.mostrarMensajeError = true;
          this.cargando = false;
          // console.error('Error al enviar el correo de restablecimiento:', error);
          // alert('Hubo un problema al enviar el correo de restablecimiento. Inténtalo nuevamente.');
        });
    }
  }

}
