import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserData } from 'src/app/data/user-data';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.css']
})
export class PerfilPage implements OnInit {

  userData: any;

  constructor(private auth: AuthService, private router: Router) { }

  async ngOnInit() {
    this.userData = UserData.getUserData();
    console.log('Datos del usuario:', this.userData);
    // Si no hay datos del usuario, intenta obtenerlos desde el servicio de autenticación
    if (!this.userData || Object.keys(this.userData).length === 0) {
      try {
        await this.auth.getUserData(UserData.getUserEmail());
        this.userData = UserData.getUserData();
        console.log('Datos del usuario:', this.userData);
      } catch (error) {
        console.error('No se pudo obtener los datos del usuario:', error);
      }
    }
  }


  goBack() {
    this.router.navigate(['/estudios']);
  }

}
