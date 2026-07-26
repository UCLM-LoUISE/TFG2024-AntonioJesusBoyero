import { Component, OnInit } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';
import { EstudiosBuffer } from 'src/app/data/estudios';
import { UsuarioBuffer } from 'src/app/data/usuario';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
})
export class InicioPage implements OnInit {

  estaAutenticado: boolean = false;

  constructor(private authService: AuthService, private alertController: AlertController,
    private navCtrl: NavController) { }

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    this.estaAutenticado = !!user;
  }

  async cerrarSesion() {
    const alert = await this.alertController.create({
      header: '¿Cerrar sesión?',
      message:
        'Se cerrará la sesión y se vaciarán los datos en memoria.\n\n' +
        '⚠️ Los datos de tareas que no hayas descargado se perderán.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Cerrar sesión', role: 'destructive', handler: () => this.procesarCierreSesion() },
      ],
    });
    await alert.present();
  }

  private async procesarCierreSesion() {
    try {
      await this.authService.logout();
    } catch (e) {
      // En modo sin conexión no hay sesión de Firebase que cerrar
      console.warn('No se pudo cerrar la sesión de Firebase:', e);
    }

    // Vaciar los buffers en memoria de la app
    EstudiosBuffer.setEstudios([]);
    EstudiosBuffer.setEstudioDetalle(null);
    EstudiosBuffer.setTarea(null);
    EstudiosBuffer.setIdEstudioImportado(null);
    UsuarioBuffer.setCorreo('');

    this.estaAutenticado = false;
    this.navCtrl.navigateRoot('/login');
  }
}
