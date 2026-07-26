import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
// Importa tu servicio de autenticación
import { AuthService } from 'src/app/services/auth.service';
import { UserData } from 'src/app/data/user-data';

@Component({
  selector: 'app-panel-admin',
  templateUrl: './panel-admin.page.html',
  styleUrls: ['./panel-admin.page.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('1000ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('1000ms ease-out', style({ opacity: 0 }))
      ])
    ])
  ]
})

export class PanelAdminPage implements OnInit {
  vista: 'usuarios' | 'grupos' = 'usuarios';
  loading = true; // bloquea la vista hasta saber si puede entrar

  constructor(private router: Router, private authService: AuthService) { }

  ngOnInit(): void {
    // Si ya hay rol cacheado, esto permite desbloquear al instante
    const cached = UserData.getUserRol?.();
    if (cached) {
      if (cached !== 'administrador') {
        this.router.navigate(['/estudios']);
        return;
      }
      this.loading = false;
    }

    // Espera a que AuthService emita el rol (tras getUserData)
    this.authService.userRol$.subscribe(rol => {
      if (!rol) return; // aún cargando
      if (rol !== 'administrador') {
        this.router.navigate(['/estudios']);
      } else {
        this.loading = false;
      }
    });
  }

  cambiarVista(v: 'usuarios' | 'grupos') {
    this.vista = v;
  }
}

